#!/usr/bin/env python3
"""
ml/training/train.py
====================

XGBoost model training pipeline for application risk scoring.

Usage:
    python ml/training/train.py --data path/to/training_data.csv

The training data CSV must contain all features listed in ml/models/feature_schema.json
plus a 'risk_class' label column (0 = LOW_RISK, 1 = HIGH_RISK).

If no labelled dataset exists, this script will:
1. Report MODEL_NOT_TRAINED clearly.
2. Print the expected dataset schema.
3. Exit without fabricating labels.

Output:
    ml/models/model.ubj
    ml/models/feature_schema.json  (updated with model_version)
    ml/models/training_metadata.json
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
ML_DIR = ROOT / "ml"
MODELS_DIR = ML_DIR / "models"

FEATURE_NAMES = [
    "document_completeness",
    "required_field_completeness",
    "eligibility_pass_ratio",
    "budget_consistency",
    "certificate_validity",
    "contradiction_count",
    "duplicate_similarity",
    "suspicious_indicator_count",
    "document_quality",
    "proposal_quality",
    "project_feasibility",
    "environmental_impact",
    "extraction_confidence",
]
LABEL_COL = "risk_class"
FEATURE_SCHEMA_VERSION = "1.0"


def print_schema() -> None:
    print("\nExpected training data schema (CSV):")
    print("=" * 60)
    print("Columns:")
    for name in FEATURE_NAMES:
        print(f"  {name}  (float, 0.0-1.0)")
    print(f"  {LABEL_COL}  (int, 0=LOW_RISK, 1=HIGH_RISK)")
    print("\nRows: one per processed application with known outcome.")
    print("Minimum recommended: 100 samples (50+ per class).")
    print("=" * 60)


def train(data_path: str, test_size: float = 0.2, random_state: int = 42) -> None:
    # ── Import guards ────────────────────────────────────────────────────────
    try:
        import numpy as np
        import pandas as pd
        import xgboost as xgb
        from sklearn.metrics import (
            accuracy_score,
            classification_report,
            confusion_matrix,
            f1_score,
            precision_score,
            recall_score,
            roc_auc_score,
        )
        from sklearn.model_selection import train_test_split
    except ImportError as exc:
        print(f"\n[ERROR] Missing dependency: {exc}")
        print("Install with: pip install xgboost scikit-learn pandas numpy")
        sys.exit(1)

    # ── Load data ─────────────────────────────────────────────────────────────
    csv_path = Path(data_path)
    if not csv_path.exists():
        print(f"\n[ERROR] Training data file not found: {csv_path}")
        print("\nNo labelled dataset exists.")
        print("DO NOT fabricate training labels.")
        print_schema()
        sys.exit(1)

    print(f"\nLoading training data from: {csv_path}")
    df = pd.read_csv(csv_path)

    # ── Validate columns ──────────────────────────────────────────────────────
    missing_cols = [c for c in FEATURE_NAMES + [LABEL_COL] if c not in df.columns]
    if missing_cols:
        print(f"\n[ERROR] Missing columns in training data: {missing_cols}")
        print_schema()
        sys.exit(1)

    # ── Clean data ────────────────────────────────────────────────────────────
    original_count = len(df)
    df = df.dropna(subset=FEATURE_NAMES + [LABEL_COL])
    invalid_labels = df[~df[LABEL_COL].isin([0, 1])]
    if len(invalid_labels) > 0:
        print(f"  Dropping {len(invalid_labels)} rows with invalid labels.")
        df = df[df[LABEL_COL].isin([0, 1])]

    print(f"  Records after cleaning: {len(df)} (dropped {original_count - len(df)})")

    if len(df) < 10:
        print("\n[ERROR] Insufficient training data after cleaning (minimum 10 samples).")
        print("DO NOT train on this dataset. Collect more labelled applications.")
        sys.exit(1)

    # ── Split ─────────────────────────────────────────────────────────────────
    X = df[FEATURE_NAMES].values.astype(float)
    y = df[LABEL_COL].values.astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state, stratify=y if len(set(y)) > 1 else None
    )
    print(f"  Train: {len(X_train)} | Test: {len(X_test)}")

    # ── Train XGBoost ─────────────────────────────────────────────────────────
    dtrain = xgb.DMatrix(X_train, label=y_train, feature_names=FEATURE_NAMES)
    dtest = xgb.DMatrix(X_test, label=y_test, feature_names=FEATURE_NAMES)

    params = {
        "objective": "binary:logistic",
        "eval_metric": "auc",
        "max_depth": 4,
        "eta": 0.1,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "seed": random_state,
        "tree_method": "hist",
    }

    print("\nTraining XGBoost model...")
    model = xgb.train(
        params,
        dtrain,
        num_boost_round=100,
        evals=[(dtrain, "train"), (dtest, "test")],
        early_stopping_rounds=10,
        verbose_eval=10,
    )

    # ── Evaluate ──────────────────────────────────────────────────────────────
    y_proba = model.predict(dtest)
    y_pred = (y_proba >= 0.5).astype(int)

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    try:
        auc = roc_auc_score(y_test, y_proba)
    except ValueError:
        auc = float("nan")
    cm = confusion_matrix(y_test, y_pred).tolist()

    print("\n" + "=" * 60)
    print("EVALUATION RESULTS")
    print("=" * 60)
    print(f"  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1        : {f1:.4f}")
    print(f"  ROC-AUC   : {auc:.4f}")
    print(f"  Confusion Matrix: {cm}")
    print(classification_report(y_test, y_pred, target_names=["LOW_RISK", "HIGH_RISK"]))

    # ── Save model ────────────────────────────────────────────────────────────
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model_version = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    model_path = MODELS_DIR / "model.ubj"
    model.save_model(str(model_path))
    print(f"\nModel saved to: {model_path}")

    # ── Save metadata ─────────────────────────────────────────────────────────
    metadata = {
        "model_version": model_version,
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "feature_names": FEATURE_NAMES,
        "dataset_path": str(csv_path),
        "n_train": int(len(X_train)),
        "n_test": int(len(X_test)),
        "metrics": {
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall": round(rec, 4),
            "f1": round(f1, 4),
            "roc_auc": round(auc, 4) if not (auc != auc) else None,
            "confusion_matrix": cm,
        },
        "xgboost_params": params,
    }

    meta_path = MODELS_DIR / "training_metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Training metadata saved to: {meta_path}")

    # ── Update feature schema with model version ──────────────────────────────
    schema_path = MODELS_DIR / "feature_schema.json"
    if schema_path.exists():
        with open(schema_path, encoding="utf-8") as f:
            schema = json.load(f)
        schema["model_version"] = model_version
        with open(schema_path, "w", encoding="utf-8") as f:
            json.dump(schema, f, indent=2)
        print(f"Feature schema updated with model_version={model_version}")

    print("\n[OK] Training complete.")
    print(f"     Model version: {model_version}")
    print(f"     Set ML_MODEL_PATH={model_path} in your .env to use this model.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train XGBoost application risk model")
    parser.add_argument("--data", required=True, help="Path to training CSV file")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split fraction (default: 0.2)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    args = parser.parse_args()
    train(args.data, test_size=args.test_size, random_state=args.seed)
