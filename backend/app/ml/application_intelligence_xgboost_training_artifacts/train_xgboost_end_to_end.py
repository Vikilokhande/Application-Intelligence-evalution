from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)
from sklearn.model_selection import train_test_split

# ============================================================
# CONFIGURATION
# ============================================================
ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "application_intelligence_xgboost_dataset.csv"
MODEL_DIR = ROOT / "models"
REPORT_DIR = ROOT / "training_reports"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
REPORT_DIR.mkdir(parents=True, exist_ok=True)

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

CLASS_TO_INT = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
INT_TO_CLASS = {v: k for k, v in CLASS_TO_INT.items()}

RANDOM_STATE = 42
TEST_SIZE = 0.20

# ============================================================
# HELPERS
# ============================================================
def fail(message: str) -> None:
    raise SystemExit(f"\nERROR: {message}\n")


def regression_metrics(y_true, y_pred):
    y_pred = np.clip(np.asarray(y_pred, dtype=float), 0, 100)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": rmse,
        "r2": float(r2_score(y_true, y_pred)),
    }


# ============================================================
# 1. LOAD DATASET
# ============================================================
print("=" * 72)
print("APPLICATION INTELLIGENCE - XGBOOST TRAINING")
print("=" * 72)
print(f"Dataset: {DATA_PATH}")

if not DATA_PATH.exists():
    fail(f"Dataset not found: {DATA_PATH}")

df = pd.read_csv(DATA_PATH)
print(f"Rows: {len(df)}")
print(f"Columns: {len(df.columns)}")

required_columns = FEATURE_NAMES + ["risk_class", "risk_score", "quality_score"]
missing = [c for c in required_columns if c not in df.columns]
if missing:
    fail(f"Missing required columns: {missing}")

if df[required_columns].isnull().any().any():
    null_counts = df[required_columns].isnull().sum()
    fail(f"NULL values found:\n{null_counts[null_counts > 0]}")

if df.duplicated().any():
    print(f"WARNING: {int(df.duplicated().sum())} duplicate rows found.")

unknown_classes = sorted(set(df["risk_class"].astype(str)) - set(CLASS_TO_INT))
if unknown_classes:
    fail(f"Unknown risk_class values: {unknown_classes}")

# Validate score ranges because the inference contract is 0..100.
for col in ["risk_score", "quality_score"]:
    if ((df[col] < 0) | (df[col] > 100)).any():
        fail(f"{col} contains values outside 0..100")

# ============================================================
# 2. PREPARE X / Y
# ============================================================
X = df[FEATURE_NAMES].astype(float)
y_class = df["risk_class"].map(CLASS_TO_INT).astype(int)
y_risk = df["risk_score"].astype(float)
y_quality = df["quality_score"].astype(float)

print("\nClass distribution:")
print(df["risk_class"].value_counts().reindex(["LOW", "MEDIUM", "HIGH"]).to_string())

# ============================================================
# 3. TRAIN / TEST SPLIT
# ============================================================
train_idx, test_idx = train_test_split(
    np.arange(len(df)),
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=y_class,
)

X_train = X.iloc[train_idx]
X_test = X.iloc[test_idx]

class_train = y_class.iloc[train_idx]
class_test = y_class.iloc[test_idx]

risk_train = y_risk.iloc[train_idx]
risk_test = y_risk.iloc[test_idx]

quality_train = y_quality.iloc[train_idx]
quality_test = y_quality.iloc[test_idx]

print(f"\nTrain rows: {len(X_train)}")
print(f"Test rows : {len(X_test)}")

# ============================================================
# COMMON XGBOOST PARAMETERS
# ============================================================
common = dict(
    n_estimators=400,
    max_depth=5,
    learning_rate=0.04,
    subsample=0.85,
    colsample_bytree=0.85,
    min_child_weight=2,
    reg_alpha=0.05,
    reg_lambda=1.0,
    random_state=RANDOM_STATE,
    n_jobs=-1,
    tree_method="hist",
)

# ============================================================
# 4. RISK CLASSIFIER
# ============================================================
print("\n" + "=" * 72)
print("[1/3] TRAINING RISK CLASSIFIER")
print("=" * 72)

classifier = xgb.XGBClassifier(
    **common,
    objective="multi:softprob",
    num_class=3,
    eval_metric="mlogloss",
)

classifier.fit(
    X_train,
    class_train,
    eval_set=[(X_test, class_test)],
    verbose=False,
)

class_pred = classifier.predict(X_test).astype(int)
class_prob = classifier.predict_proba(X_test)

accuracy = float(accuracy_score(class_test, class_pred))
cm = confusion_matrix(class_test, class_pred, labels=[0, 1, 2])

print(f"Accuracy: {accuracy:.4f}")
print("\nClassification report:")
print(
    classification_report(
        class_test,
        class_pred,
        labels=[0, 1, 2],
        target_names=["LOW", "MEDIUM", "HIGH"],
        zero_division=0,
    )
)

classifier.save_model(MODEL_DIR / "model.ubj")
classifier.save_model(MODEL_DIR / "risk_classifier.ubj")
print(f"Saved: {MODEL_DIR / 'model.ubj'}")
print(f"Saved: {MODEL_DIR / 'risk_classifier.ubj'}")

# ============================================================
# 5. RISK SCORE REGRESSOR
# ============================================================
print("\n" + "=" * 72)
print("[2/3] TRAINING RISK SCORE REGRESSOR")
print("=" * 72)

risk_model = xgb.XGBRegressor(
    **common,
    objective="reg:squarederror",
    eval_metric="rmse",
)

risk_model.fit(
    X_train,
    risk_train,
    eval_set=[(X_test, risk_test)],
    verbose=False,
)

risk_pred = np.clip(risk_model.predict(X_test), 0, 100)
risk_metrics = regression_metrics(risk_test, risk_pred)

print(f"MAE : {risk_metrics['mae']:.4f}")
print(f"RMSE: {risk_metrics['rmse']:.4f}")
print(f"R2  : {risk_metrics['r2']:.4f}")

risk_model.save_model(MODEL_DIR / "risk_regressor.ubj")
print(f"Saved: {MODEL_DIR / 'risk_regressor.ubj'}")

# ============================================================
# 6. QUALITY SCORE REGRESSOR
# ============================================================
print("\n" + "=" * 72)
print("[3/3] TRAINING QUALITY SCORE REGRESSOR")
print("=" * 72)

quality_model = xgb.XGBRegressor(
    **common,
    objective="reg:squarederror",
    eval_metric="rmse",
)

quality_model.fit(
    X_train,
    quality_train,
    eval_set=[(X_test, quality_test)],
    verbose=False,
)

quality_pred = np.clip(quality_model.predict(X_test), 0, 100)
quality_metrics = regression_metrics(quality_test, quality_pred)

print(f"MAE : {quality_metrics['mae']:.4f}")
print(f"RMSE: {quality_metrics['rmse']:.4f}")
print(f"R2  : {quality_metrics['r2']:.4f}")

quality_model.save_model(MODEL_DIR / "quality_regressor.ubj")
print(f"Saved: {MODEL_DIR / 'quality_regressor.ubj'}")

# ============================================================
# 7. FEATURE IMPORTANCE
# ============================================================
importance = pd.DataFrame(
    {
        "feature": FEATURE_NAMES,
        "importance": classifier.feature_importances_,
    }
).sort_values("importance", ascending=False)

importance.to_csv(REPORT_DIR / "feature_importance.csv", index=False)
print("\nTop feature importance:")
print(importance.to_string(index=False))

# ============================================================
# 8. SAVE TEST PREDICTIONS
# ============================================================
result = df.iloc[test_idx].copy()
result["predicted_risk_class"] = [INT_TO_CLASS[i] for i in class_pred]
result["risk_class_confidence"] = class_prob.max(axis=1)
result["predicted_risk_score"] = risk_pred
result["predicted_quality_score"] = quality_pred
result["risk_score_error"] = result["predicted_risk_score"] - result["risk_score"]
result["quality_score_error"] = result["predicted_quality_score"] - result["quality_score"]

result.to_csv(REPORT_DIR / "test_predictions.csv", index=False)

# ============================================================
# 9. SAVE METRICS + MODEL CONTRACT
# ============================================================
metrics = {
    "dataset": {
        "rows": int(len(df)),
        "features": int(len(FEATURE_NAMES)),
        "train_rows": int(len(train_idx)),
        "test_rows": int(len(test_idx)),
        "random_state": RANDOM_STATE,
    },
    "classifier": {
        "accuracy": accuracy,
        "classes": CLASS_TO_INT,
        "confusion_matrix": cm.tolist(),
    },
    "risk_regressor": risk_metrics,
    "quality_regressor": quality_metrics,
    "xgboost_version": xgb.__version__,
}

with open(REPORT_DIR / "metrics.json", "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=2)

contract = {
    "model_type": "application_intelligence_xgboost",
    "version": "1.0",
    "features": FEATURE_NAMES,
    "feature_count": len(FEATURE_NAMES),
    "feature_order_must_match_inference": True,
    "outputs": {
        "risk_class": {
            "model": "model.ubj",
            "mapping": CLASS_TO_INT,
            "type": "classification",
        },
        "risk_score": {
            "model": "risk_regressor.ubj",
            "range": [0, 100],
            "type": "regression",
        },
        "quality_score": {
            "model": "quality_regressor.ubj",
            "range": [0, 100],
            "type": "regression",
        },
        "confidence": {
            "source": "max(risk_class_predict_proba)",
            "range": [0, 1],
        },
    },
}

with open(MODEL_DIR / "feature_schema.json", "w", encoding="utf-8") as f:
    json.dump(contract, f, indent=2)

# ============================================================
# 10. INFERENCE SMOKE TEST
# ============================================================
print("\n" + "=" * 72)
print("INFERENCE SMOKE TEST")
print("=" * 72)

sample = X_test.iloc[[0]]
pred_class = int(classifier.predict(sample)[0])
pred_probs = classifier.predict_proba(sample)[0]
pred_risk = float(np.clip(risk_model.predict(sample)[0], 0, 100))
pred_quality = float(np.clip(quality_model.predict(sample)[0], 0, 100))
confidence = float(np.max(pred_probs))

print(f"risk_class   : {INT_TO_CLASS[pred_class]}")
print(f"risk_score   : {pred_risk:.2f}")
print(f"quality_score: {pred_quality:.2f}")
print(f"confidence   : {confidence:.4f}")

# ============================================================
# FINAL SUMMARY
# ============================================================
print("\n" + "=" * 72)
print("TRAINING COMPLETE")
print("=" * 72)
print(f"Models directory : {MODEL_DIR}")
print(f"Reports directory: {REPORT_DIR}")
print("\nGenerated models:")
print("  model.ubj              -> risk classification (backend-compatible name)")
print("  risk_classifier.ubj    -> risk classification")
print("  risk_regressor.ubj     -> risk score 0..100")
print("  quality_regressor.ubj  -> quality score 0..100")
print("  feature_schema.json    -> inference feature contract")
print("\nGenerated reports:")
print("  metrics.json")
print("  feature_importance.csv")
print("  test_predictions.csv")
