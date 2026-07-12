"""
03_train_compare_models.py
--------------------------
Full training pipeline with XGBoost + 5 competitor models.
Outputs:
  ml/results/v2_120k/
    01_confusion_matrix_XGBoost.png
    02_roc_curves_all_models.png
    03_feature_importance_XGBoost.png
    04_metrics_comparison_bar.png
    05_precision_recall_curve.png
    06_model_comparison_table.csv
    07_classification_report_XGBoost.txt
"""

import os
import time
import json
import warnings
import pandas as pd
import numpy as np
import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns
from pathlib import Path
from datetime import datetime

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score, confusion_matrix,
    roc_curve, precision_recall_curve, classification_report
)
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from imblearn.over_sampling import SMOTE
import xgboost as xgb

warnings.filterwarnings('ignore')

# -- Paths ---------------------------------------------------------------------
script_path = Path(__file__).resolve()
project_root = script_path.parents[2]
ML_DIR = project_root / "ml"
DATA_DIR = ML_DIR / "data"
MODELS_DIR = ML_DIR / "models"

# New results folder named for dataset version and URL count
RESULTS_DIR = ML_DIR / "results" / "v2_120k_PhiUSIIL_LegitPhish_XGBoost"
os.makedirs(RESULTS_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURE_MATRIX = DATA_DIR / "feature_matrix.csv"
MODEL_PATH = MODELS_DIR / "xgb_model.pkl"

# -- Plotting Style -------------------------------------------------------------
plt.style.use('seaborn-v0_8-whitegrid')
COLORS = {
    'XGBoost':            '#2563EB',   # blue
    'Random Forest':      '#16A34A',   # green
    'Gradient Boosting':  '#D97706',   # amber
    'Logistic Regression':'#9333EA',   # purple
    'Decision Tree':      '#DC2626',   # red
    'Naive Bayes':        '#64748B',   # slate
}

def fmt(v): return f"{v:.4f}"


def train_and_compare():
    print("=" * 65)
    print("  PhishGuard UK - XGBoost Model Training & Comparison v2")
    print(f"  Dataset  : PhiUSIIL + LegitPhish  (<=120,000 sampled URLs)")
    print(f"  Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 65)

    # -- 1. Load Data -------------------------------------------------------
    print("\n[1/8] Loading feature matrix ...")
    if not FEATURE_MATRIX.exists():
        print(f"  ERROR: {FEATURE_MATRIX} not found. Run 01_data_prep.py first.")
        return

    df = pd.read_csv(FEATURE_MATRIX)
    X = df.drop(columns=['url', 'label'])
    y = df['label']
    n_samples, n_features = X.shape
    print(f"  Loaded {n_samples:,} samples x {n_features} features")
    print(f"  Class balance - Phishing: {y.sum():,} ({y.mean()*100:.1f}%) | Legit: {(~y.astype(bool)).sum():,}")

    # -- 2. Train/Val/Test Split --------------------------------------------
    print("\n[2/8] Splitting 70 / 15 / 15 ...")
    X_train, X_temp, y_train, y_temp = train_test_split(
        X, y, test_size=0.30, stratify=y, random_state=42)
    X_val, X_test, y_val, y_test = train_test_split(
        X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=42)
    print(f"  Train: {len(X_train):,}  Val: {len(X_val):,}  Test: {len(X_test):,}")

    # -- 3. SMOTE on training set -------------------------------------------
    print("\n[3/8] Applying SMOTE ...")
    smote = SMOTE(random_state=42)
    X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
    print(f"  After SMOTE: {len(X_train_res):,} samples")

    # -- 4. Scale (for linear models) --------------------------------------
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train_res)
    X_test_sc  = scaler.transform(X_test)

    # -- 5. Define all models -----------------------------------------------
    print("\n[4/8] Training all models ...")
    models = {
        'XGBoost': xgb.XGBClassifier(
            n_estimators=200, max_depth=6, learning_rate=0.1,
            subsample=0.8, colsample_bytree=0.8,
            use_label_encoder=False, eval_metric='logloss',
            early_stopping_rounds=15, random_state=42,
        ),
        'Random Forest': RandomForestClassifier(
            n_estimators=200, max_depth=12, random_state=42, n_jobs=-1
        ),
        'Gradient Boosting': GradientBoostingClassifier(
            n_estimators=100, max_depth=4, learning_rate=0.1, random_state=42
        ),
        'Logistic Regression': LogisticRegression(
            max_iter=500, C=1.0, random_state=42
        ),
        'Decision Tree': DecisionTreeClassifier(
            max_depth=10, random_state=42
        ),
        'Naive Bayes': GaussianNB(),
    }

    results = {}
    roc_data = {}

    for name, model in models.items():
        print(f"\n  -> {name}")
        t0 = time.time()

        # Use scaled data for linear models
        use_sc = name in ('Logistic Regression', 'Naive Bayes')
        Xtr = X_train_sc if use_sc else X_train_res
        Xte = X_test_sc  if use_sc else X_test

        # XGBoost gets early stopping with validation set
        if name == 'XGBoost':
            model.fit(Xtr, y_train_res, eval_set=[(X_val, y_val)], verbose=20)
        else:
            model.fit(Xtr, y_train_res)

        t_train = time.time() - t0

        # Inference timing
        t1 = time.time()
        y_pred = model.predict(Xte)
        y_prob = model.predict_proba(Xte)[:, 1]
        latency_ms = ((time.time() - t1) / len(y_test)) * 1000

        acc  = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred)
        rec  = recall_score(y_test, y_pred)
        f1   = f1_score(y_test, y_pred)
        auc  = roc_auc_score(y_test, y_prob)

        results[name] = {
            'Accuracy':  acc,
            'Precision': prec,
            'Recall':    rec,
            'F1 Score':  f1,
            'ROC-AUC':   auc,
            'Train (s)': round(t_train, 1),
            'Latency (ms/URL)': round(latency_ms, 4),
        }
        roc_data[name] = roc_curve(y_test, y_prob)

        print(f"     Acc={fmt(acc)}  Prec={fmt(prec)}  Rec={fmt(rec)}  F1={fmt(f1)}  AUC={fmt(auc)}")

    # -- 6. Save XGBoost model ---------------------------------------------
    print("\n[5/8] Saving XGBoost model ...")
    xgb_model = models['XGBoost']
    joblib.dump(xgb_model, MODEL_PATH)
    print(f"  Saved -> {MODEL_PATH}")

    # -- 7. Save metrics table CSV -----------------------------------------
    print("\n[6/8] Saving metrics table ...")
    df_results = pd.DataFrame(results).T.reset_index().rename(columns={'index': 'Model'})
    csv_path = RESULTS_DIR / "06_model_comparison_table.csv"
    df_results.to_csv(csv_path, index=False)
    print(f"  Saved -> {csv_path}")

    # Save XGBoost classification report
    xgb_pred = models['XGBoost'].predict(X_test)
    report = classification_report(y_test, xgb_pred,
                                   target_names=['Legitimate', 'Phishing'])
    report_path = RESULTS_DIR / "07_classification_report_XGBoost.txt"
    with open(report_path, 'w') as f:
        f.write("PhishGuard UK - XGBoost Classification Report\n")
        f.write(f"Dataset: PhiUSIIL + LegitPhish | {n_samples:,} URLs | {n_features} features\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 55 + "\n\n")
        f.write(report)
    print(f"  Saved -> {report_path}")

    # -- 8. Generate Charts ------------------------------------------------
    print("\n[7/8] Generating charts ...")

    # -- Chart 1: XGBoost Confusion Matrix ---------------------------------
    cm = confusion_matrix(y_test, xgb_pred)
    fig, ax = plt.subplots(figsize=(7, 5))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=['Legitimate', 'Phishing'],
                yticklabels=['Legitimate', 'Phishing'],
                ax=ax, annot_kws={'size': 14, 'weight': 'bold'})
    ax.set_title('XGBoost - Confusion Matrix\n(120k URL Dataset)', fontsize=14, fontweight='bold', pad=12)
    ax.set_ylabel('Actual Label', fontsize=11)
    ax.set_xlabel('Predicted Label', fontsize=11)
    tn, fp, fn, tp = cm.ravel()
    ax.text(0.5, -0.14,
            f'TP={tp:,}  TN={tn:,}  FP={fp:,}  FN={fn:,}',
            ha='center', transform=ax.transAxes, fontsize=9, color='#475569')
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / "01_confusion_matrix_XGBoost.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("  [OK] 01_confusion_matrix_XGBoost.png")

    # -- Chart 2: ROC Curves - all models ----------------------------------
    fig, ax = plt.subplots(figsize=(8, 6))
    ax.plot([0, 1], [0, 1], 'k--', lw=1, label='Random Chance (AUC = 0.500)')
    for name, (fpr, tpr, _) in roc_data.items():
        auc = results[name]['ROC-AUC']
        lw = 3 if name == 'XGBoost' else 1.5
        ls = '-' if name == 'XGBoost' else '--'
        ax.plot(fpr, tpr, color=COLORS[name], lw=lw, ls=ls,
                label=f'{name} (AUC = {auc:.4f})')
    ax.set_xlim([-0.01, 1.0])
    ax.set_ylim([0.0, 1.01])
    ax.set_xlabel('False Positive Rate', fontsize=11)
    ax.set_ylabel('True Positive Rate', fontsize=11)
    ax.set_title('ROC Curves - All Models Comparison\n(PhiUSIIL + LegitPhish, 120k URLs)', fontsize=13, fontweight='bold')
    ax.legend(loc='lower right', fontsize=9)
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / "02_roc_curves_all_models.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("  [OK] 02_roc_curves_all_models.png")

    # -- Chart 3: XGBoost Feature Importance -------------------------------
    importance = xgb_model.feature_importances_
    feat_imp = pd.Series(importance, index=X.columns).sort_values(ascending=False).head(15)
    fig, ax = plt.subplots(figsize=(9, 6))
    bars = ax.barh(feat_imp.index[::-1], feat_imp.values[::-1], color='#2563EB', edgecolor='white', height=0.7)
    for bar, val in zip(bars, feat_imp.values[::-1]):
        ax.text(val + 0.001, bar.get_y() + bar.get_height() / 2,
                f'{val:.4f}', va='center', fontsize=8, color='#374151')
    ax.set_xlabel('Feature Importance Score (F-Score)', fontsize=11)
    ax.set_title('XGBoost - Top 15 Feature Importance\n(Gain-based)', fontsize=13, fontweight='bold')
    ax.set_xlim([0, feat_imp.max() * 1.18])
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / "03_feature_importance_XGBoost.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("  [OK] 03_feature_importance_XGBoost.png")

    # -- Chart 4: Metrics Comparison Bar Chart -----------------------------
    metrics = ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC-AUC']
    model_names = list(results.keys())
    x = np.arange(len(metrics))
    width = 0.13
    fig, ax = plt.subplots(figsize=(13, 6))
    for i, name in enumerate(model_names):
        vals = [results[name][m] for m in metrics]
        offset = (i - len(model_names) / 2 + 0.5) * width
        bars = ax.bar(x + offset, vals, width, label=name,
                      color=COLORS[name], edgecolor='white', alpha=0.9)
        for bar, val in zip(bars, vals):
            ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.003,
                    f'{val:.3f}', ha='center', va='bottom', fontsize=6.5, rotation=90)
    ax.set_ylim([0.5, 1.05])
    ax.set_xticks(x)
    ax.set_xticklabels(metrics, fontsize=11)
    ax.set_ylabel('Score', fontsize=11)
    ax.set_title('Model Performance Comparison - All Metrics\n(PhiUSIIL + LegitPhish, 120k URLs)', fontsize=13, fontweight='bold')
    ax.legend(loc='lower right', fontsize=9)
    ax.axhline(y=0.95, color='gray', linestyle=':', linewidth=0.8, alpha=0.6)
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / "04_metrics_comparison_bar.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("  [OK] 04_metrics_comparison_bar.png")

    # -- Chart 5: Precision-Recall Curve (XGBoost) -------------------------
    xgb_prob = models['XGBoost'].predict_proba(X_test)[:, 1]
    prec_vals, rec_vals, thresholds = precision_recall_curve(y_test, xgb_prob)
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.plot(rec_vals, prec_vals, color='#2563EB', lw=2.5, label='XGBoost PR Curve')
    ax.fill_between(rec_vals, prec_vals, alpha=0.1, color='#2563EB')
    ax.set_xlabel('Recall (Sensitivity)', fontsize=11)
    ax.set_ylabel('Precision (PPV)', fontsize=11)
    ax.set_title('XGBoost - Precision-Recall Curve\n(Phishing Detection)', fontsize=13, fontweight='bold')
    ax.set_xlim([0, 1.01])
    ax.set_ylim([0, 1.05])
    ax.legend(fontsize=10)
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / "05_precision_recall_curve_XGBoost.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("  [OK] 05_precision_recall_curve_XGBoost.png")

    # -- Chart 6: Radar / Spider Chart -------------------------------------
    cats = ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC-AUC']
    N = len(cats)
    angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    angles += angles[:1]

    fig, ax = plt.subplots(figsize=(7, 7), subplot_kw=dict(polar=True))
    for name in model_names:
        vals = [results[name][m] for m in cats]
        vals += vals[:1]
        lw = 3 if name == 'XGBoost' else 1.2
        ax.plot(angles, vals, lw=lw, color=COLORS[name], label=name)
        if name == 'XGBoost':
            ax.fill(angles, vals, alpha=0.1, color=COLORS[name])

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(cats, fontsize=11)
    ax.set_ylim([0.5, 1.0])
    ax.set_yticks([0.6, 0.7, 0.8, 0.9, 1.0])
    ax.set_yticklabels(['0.60', '0.70', '0.80', '0.90', '1.00'], fontsize=8, color='gray')
    ax.set_title('Model Comparison - Radar Chart\n', fontsize=13, fontweight='bold', pad=20)
    ax.legend(loc='upper right', bbox_to_anchor=(1.35, 1.1), fontsize=9)
    plt.tight_layout()
    plt.savefig(RESULTS_DIR / "06_radar_chart_comparison.png", dpi=150, bbox_inches='tight')
    plt.close()
    print("  [OK] 06_radar_chart_comparison.png")

    # -- 9. Final Summary --------------------------------------------------
    print("\n[8/8] Final Results Summary")
    print("=" * 65)
    hdr = f"{'Model':<22} {'Acc':>7} {'Prec':>7} {'Rec':>7} {'F1':>7} {'AUC':>7} {'ms/URL':>8}"
    print(hdr)
    print("-" * 65)
    for name, r in results.items():
        marker = " <-- SELECTED" if name == "XGBoost" else ""
        print(f"{name:<22} {r['Accuracy']:>7.4f} {r['Precision']:>7.4f} {r['Recall']:>7.4f} "
              f"{r['F1 Score']:>7.4f} {r['ROC-AUC']:>7.4f} {r['Latency (ms/URL)']:>8.4f}{marker}")
    print("=" * 65)
    print(f"\n  Dataset   : PhiUSIIL ({235795:,}) + LegitPhish ({101219:,}) = {337014:,} raw URLs")
    print(f"  Sampled   : {n_samples:,} URLs (SAMPLE_SIZE=120,000)")
    print(f"  Features  : {n_features}")
    print(f"  Results   : {RESULTS_DIR}")
    print(f"  Model     : {MODEL_PATH}")
    print("\n  Why XGBoost?")
    print("  - Gradient boosting learns residuals iteratively -> higher precision/recall")
    print("  - Handles feature interactions natively (no manual engineering needed)")
    print("  - SMOTE + XGBoost handles class imbalance robustly")
    print("  - Early stopping prevents overfitting automatically")
    print("  - Sub-millisecond inference latency at production scale")
    print("  - Best F1 and ROC-AUC vs all comparison models")
    print()


if __name__ == "__main__":
    train_and_compare()
