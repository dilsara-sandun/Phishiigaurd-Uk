import os
import sys
import pandas as pd
from pathlib import Path
from tqdm import tqdm

# Ensure the backend directory is in the path so we can import the feature extractor
script_path = Path(__file__).resolve()
project_root = script_path.parents[2]
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))

from app.services.ml_service import extract_features

# Data Paths
ML_DIR = project_root / "ml"
DATA_DIR = ML_DIR / "data"
RAW_PHIUSIIL = DATA_DIR / "raw_phiusiil.csv"
RAW_LEGITPHISH = DATA_DIR / "raw_legitphish.csv"

OUT_FEATURE_MATRIX = DATA_DIR / "feature_matrix.csv"
OUT_BANKING_SUBSET = DATA_DIR / "banking_subset.csv"
OUT_FEATURE_NAMES = ML_DIR / "models" / "feature_names.json"

def prep_dataset():
    print("1. Loading raw datasets...")
    df_ph = pd.DataFrame()
    df_lg = pd.DataFrame()
    
    if RAW_PHIUSIIL.exists():
        df_ph = pd.read_csv(RAW_PHIUSIIL, low_memory=False)
        # PhiUSIIL has 'URL' and 'label'
        if 'URL' in df_ph.columns and 'label' in df_ph.columns:
            df_ph = df_ph[['URL', 'label']].rename(columns={'URL': 'url'})
            df_ph['label'] = pd.to_numeric(df_ph['label'], errors='coerce').fillna(0).astype(int)
    
    if RAW_LEGITPHISH.exists():
        df_lg = pd.read_csv(RAW_LEGITPHISH, low_memory=False)
        if 'URL' in df_lg.columns and 'ClassLabel' in df_lg.columns:
            df_lg = df_lg[['URL', 'ClassLabel']].rename(columns={'URL': 'url', 'ClassLabel': 'label'})
            df_lg['label'] = pd.to_numeric(df_lg['label'], errors='coerce').fillna(0).astype(int)
    df_combined = pd.concat([df_ph, df_lg], ignore_index=True)
    if df_combined.empty:
        print("Error: No data found. Ensure raw_phiusiil.csv exists.")
        return

    print(f"Total raw URLs: {len(df_combined)}")

    print("2. Removing duplicates...")
    df_combined.drop_duplicates(subset=['url'], inplace=True)
    
    print("3. Handling missing values...")
    df_combined.dropna(subset=['url', 'label'], inplace=True)
    df_combined['label'] = df_combined['label'].astype(int)
    
    # We want a more balanced dataset since extraction takes time.
    # Dynamically load sample size, default increased to 120,000.
    sample_size = int(os.environ.get("SAMPLE_SIZE", 120000))
    if len(df_combined) > sample_size:
        print(f"Sampling {sample_size:,} URLs for faster processing...")
        df_combined = df_combined.sample(sample_size, random_state=42)

    print(f"Cleaned unique URLs: {len(df_combined)}")

    print("4. Extracting 27 core features...")
    # This aligns the training features with the FastAPI backend
    features_list = []
    
    # Use tqdm for progress bar
    urls = df_combined['url'].tolist()
    labels = df_combined['label'].tolist()
    
    for url, lbl in tqdm(zip(urls, labels), total=len(urls), desc="Extracting"):
        try:
            f = extract_features(url)
            f['url'] = url
            f['label'] = lbl
            features_list.append(f)
        except Exception:
            pass

    df_features = pd.DataFrame(features_list)
    
    # Store the exact feature order used
    feature_columns = [c for c in df_features.columns if c not in ('url', 'label')]
    
    print("\nSaving feature_names.json...")
    import json
    os.makedirs(OUT_FEATURE_NAMES.parent, exist_ok=True)
    with open(OUT_FEATURE_NAMES, "w") as f:
        json.dump(feature_columns, f)

    print("5. Saving core feature matrix...")
    df_features.to_csv(OUT_FEATURE_MATRIX, index=False)
    
    print("6. Extracting UK Banking Subset...")
    # Any URL that contains a brand token
    # We already have a feature for this: `contains_bank_brand`
    if 'contains_bank_brand' in df_features.columns:
        df_banking = df_features[df_features['contains_bank_brand'] == 1.0]
        df_banking.to_csv(OUT_BANKING_SUBSET, index=False)
        print(f"UK Banking Subset saved! ({len(df_banking)} URLs)")

    print("\nData Preparation Complete!")
    print(f"- Feature Matrix Shape: {(len(df_features), len(feature_columns))}")

if __name__ == "__main__":
    prep_dataset()
