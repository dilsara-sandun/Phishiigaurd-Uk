import os
import time
import pandas as pd
import numpy as np
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, roc_curve
from imblearn.over_sampling import SMOTE
import xgboost as xgb
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns

script_path = Path(__file__).resolve()
project_root = script_path.parents[2]

ML_DIR = project_root / "ml"
DATA_DIR = ML_DIR / "data"
MODELS_DIR = ML_DIR / "models"
RESULTS_DIR = ML_DIR / "results"

FEATURE_MATRIX = DATA_DIR / "feature_matrix.csv"
MODEL_PATH = MODELS_DIR / "xgb_model.pkl"

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(RESULTS_DIR, exist_ok=True)

def train_and_eval():
    print("1. Loading Feature Matrix...")
    if not FEATURE_MATRIX.exists():
        print(f"Error: {FEATURE_MATRIX} not found. Run 01_data_prep.py first.")
        return

    df = pd.read_csv(FEATURE_MATRIX)
    
    # Split features and label
    X = df.drop(columns=['url', 'label'])
    y = df['label']

    print(f"Total dataset: {len(X)} samples, {len(X.columns)} features.")
    
    print("2. Splitting Train / Val / Test (70/15/15)...")
    # First split off 30% for Val+Test
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=42)
    # Then split the 30% in half to get 15% Val / 15% Test
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=42)

    print(f"Train size: {len(X_train)} | Val size: {len(X_val)} | Test size: {len(X_test)}")

    print("3. Applying SMOTE to fix Imbalance (Train set only)...")
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    print(f"Train size after SMOTE: {len(X_train_res)}")

    print("4. Training XGBoost Model...")
    clf = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=6,
        learning_rate=0.1,
        random_state=42,
        eval_metric='logloss',
        early_stopping_rounds=10,   # XGBoost 2.x: must be set in constructor
    )
    # Fit with eval set for early stopping
    clf.fit(
        X_train_res, y_train_res,
        eval_set=[(X_val, y_val)],
        verbose=10,
    )

    print("\n5. Saving Model...")
    joblib.dump(clf, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")

    print("\n6. Evaluating on Test Set...")
    # Measure latency
    start_time = time.time()
    y_pred = clf.predict(X_test)
    y_prob = clf.predict_proba(X_test)[:, 1]
    end_time = time.time()
    
    latency_ms = ((end_time - start_time) / len(X_test)) * 1000

    # Calculate metrics
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_prob)

    print("\n=== PERFORMANCE METRICS ===")
    print(f"Precision: {precision:.4f} (Accuracy of Phishing alerts)")
    print(f"Recall:    {recall:.4f} (Ability to catch all attacks)")
    print(f"F1 Score:  {f1:.4f} (Overall balance)")
    print(f"ROC-AUC:   {roc_auc:.4f} (Separation capacity)")
    print(f"Latency:   {latency_ms:.4f} ms per URL")
    print("===========================\n")

    print("7. Generating Visualizations...")
    
    # Confusion Matrix
    cm = confusion_matrix(y_test, y_pred)
    plt.figure(figsize=(6, 4))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['Legit (0)', 'Phish (1)'], 
                yticklabels=['Legit (0)', 'Phish (1)'])
    plt.title('Confusion Matrix')
    plt.ylabel('Actual Label')
    plt.xlabel('Predicted Label')
    cm_path = RESULTS_DIR / 'confusion_matrix.png'
    plt.savefig(cm_path, bbox_inches='tight')
    plt.close()
    
    # ROC Curve
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    plt.figure(figsize=(6, 4))
    plt.plot(fpr, tpr, label=f'XGBoost (AUC = {roc_auc:.3f})')
    plt.plot([0, 1], [0, 1], 'k--')
    plt.title('ROC Curve')
    plt.xlabel('False Positive Rate')
    plt.ylabel('True Positive Rate')
    plt.legend()
    roc_path = RESULTS_DIR / 'roc_curve.png'
    plt.savefig(roc_path, bbox_inches='tight')
    plt.close()

    # Feature Importance
    importance = clf.feature_importances_
    feat_imp = pd.Series(importance, index=X.columns).sort_values(ascending=False).head(10)
    plt.figure(figsize=(8, 5))
    sns.barplot(x=feat_imp.values, y=feat_imp.index, palette='viridis')
    plt.title('Top 10 Important Features')
    plt.xlabel('Importance Score')
    plt.ylabel('Feature')
    feat_path = RESULTS_DIR / 'feature_importance.png'
    plt.savefig(feat_path, bbox_inches='tight')
    plt.close()

    print(f"Charts saved to {RESULTS_DIR}")

if __name__ == "__main__":
    train_and_eval()
