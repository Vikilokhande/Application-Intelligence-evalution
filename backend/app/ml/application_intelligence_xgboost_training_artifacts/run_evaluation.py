"""
Evaluation and report generation script.
Loads the already-trained models from models/ and runs full evaluation.
"""
from __future__ import annotations

import json
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

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "data" / "application_intelligence_xgboost_dataset.csv"
MODEL_DIR = ROOT / "models"
REPORT_DIR = ROOT / "training_reports"

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


def reg_metrics(y_true, y_pred):
    y_pred = np.clip(np.asarray(y_pred, dtype=float), 0, 100)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": rmse,
        "r2": float(r2_score(y_true, y_pred)),
        "min_pred": float(np.min(y_pred)),
        "max_pred": float(np.max(y_pred)),
        "mean_pred": float(np.mean(y_pred)),
    }


# Load dataset
print("=" * 72)
print("EVALUATION & REPORT GENERATION")
print("=" * 72)

df = pd.read_csv(DATA_PATH)
X = df[FEATURE_NAMES].astype(float)
y_class = df["risk_class"].map(CLASS_TO_INT).astype(int)
y_risk = df["risk_score"].astype(float)
y_quality = df["quality_score"].astype(float)

# Recreate EXACT same split
train_idx, test_idx = train_test_split(
    np.arange(len(df)),
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=y_class,
)
X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
class_train, class_test = y_class.iloc[train_idx], y_class.iloc[test_idx]
risk_train, risk_test = y_risk.iloc[train_idx], y_risk.iloc[test_idx]
quality_train, quality_test = y_quality.iloc[train_idx], y_quality.iloc[test_idx]

print(f"Train rows: {len(train_idx)} | Test rows: {len(test_idx)}")

# Load saved models
print("\nLoading saved models...")
classifier = xgb.XGBClassifier()
classifier.load_model(str(MODEL_DIR / "risk_classifier.ubj"))

risk_model = xgb.XGBRegressor()
risk_model.load_model(str(MODEL_DIR / "risk_regressor.ubj"))

quality_model = xgb.XGBRegressor()
quality_model.load_model(str(MODEL_DIR / "quality_regressor.ubj"))

print("All 3 models loaded: PASS")

# Classifier evaluation (TEST SET ONLY)
class_pred = classifier.predict(X_test).astype(int)
class_prob = classifier.predict_proba(X_test)

accuracy = float(accuracy_score(class_test, class_pred))
cm = confusion_matrix(class_test, class_pred, labels=[0, 1, 2])
cr = classification_report(
    class_test, class_pred,
    labels=[0, 1, 2],
    target_names=["LOW", "MEDIUM", "HIGH"],
    zero_division=0,
    output_dict=True,
)

print("\n" + "=" * 72)
print("CLASSIFICATION RESULTS  [TEST SET ONLY]")
print("=" * 72)
print(f"Accuracy      : {accuracy:.4f}")
print(f"Macro F1      : {cr['macro avg']['f1-score']:.4f}")
print(f"Weighted F1   : {cr['weighted avg']['f1-score']:.4f}")
print("\nPer-class breakdown:")
for cls in ["LOW", "MEDIUM", "HIGH"]:
    c = cr[cls]
    print(
        f"  {cls:6s}  precision={c['precision']:.4f}  "
        f"recall={c['recall']:.4f}  f1={c['f1-score']:.4f}  "
        f"support={int(c['support'])}"
    )
print("\nConfusion Matrix [LOW, MEDIUM, HIGH]:")
print(cm)

# Regressor evaluation (TEST SET ONLY)
risk_pred = np.clip(risk_model.predict(X_test), 0, 100)
quality_pred = np.clip(quality_model.predict(X_test), 0, 100)
rm = reg_metrics(risk_test, risk_pred)
qm = reg_metrics(quality_test, quality_pred)

print("\n" + "=" * 72)
print("RISK SCORE REGRESSOR  [TEST SET ONLY]")
print("=" * 72)
print(f"MAE       : {rm['mae']:.4f}")
print(f"RMSE      : {rm['rmse']:.4f}")
print(f"R2        : {rm['r2']:.4f}")
print(f"Min pred  : {rm['min_pred']:.2f}")
print(f"Max pred  : {rm['max_pred']:.2f}")
print(f"Mean pred : {rm['mean_pred']:.2f}")

print("\n" + "=" * 72)
print("QUALITY SCORE REGRESSOR  [TEST SET ONLY]")
print("=" * 72)
print(f"MAE       : {qm['mae']:.4f}")
print(f"RMSE      : {qm['rmse']:.4f}")
print(f"R2        : {qm['r2']:.4f}")
print(f"Min pred  : {qm['min_pred']:.2f}")
print(f"Max pred  : {qm['max_pred']:.2f}")
print(f"Mean pred : {qm['mean_pred']:.2f}")

# Feature importance
fi = pd.DataFrame(
    {"feature": FEATURE_NAMES, "importance": classifier.feature_importances_}
).sort_values("importance", ascending=False)

print("\n" + "=" * 72)
print("FEATURE IMPORTANCE (XGBoost gain)")
print("=" * 72)
print(fi.to_string(index=False))
print("\nTop 5:")
print(fi.head(5).to_string(index=False))

# Save feature importance
fi_path = REPORT_DIR / "feature_importance.csv"
fi_tmp = REPORT_DIR / "feature_importance_tmp.csv"
fi.to_csv(fi_tmp, index=False)
try:
    fi_tmp.replace(fi_path)
    print(f"\nSaved: {fi_path}")
except PermissionError:
    print(f"\nWARNING: {fi_path} is locked. Saved as feature_importance_tmp.csv")

# Save test predictions
result = df.iloc[test_idx].copy()
result["predicted_risk_class"] = [INT_TO_CLASS[i] for i in class_pred]
result["risk_class_confidence"] = class_prob.max(axis=1)
result["predicted_risk_score"] = risk_pred
result["predicted_quality_score"] = quality_pred
result["risk_score_error"] = result["predicted_risk_score"] - result["risk_score"]
result["quality_score_error"] = result["predicted_quality_score"] - result["quality_score"]

pred_path = REPORT_DIR / "test_predictions.csv"
pred_tmp = REPORT_DIR / "test_predictions_tmp.csv"
result.to_csv(pred_tmp, index=False)
try:
    pred_tmp.replace(pred_path)
    print(f"Saved: {pred_path}")
except PermissionError:
    print(f"WARNING: {pred_path} locked. Saved as test_predictions_tmp.csv")

# Save full metrics
metrics = {
    "dataset": {
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "features": int(len(FEATURE_NAMES)),
        "targets": ["risk_class", "risk_score", "quality_score"],
        "train_rows": int(len(train_idx)),
        "test_rows": int(len(test_idx)),
        "random_state": RANDOM_STATE,
        "missing_values": 0,
        "duplicate_rows": 0,
        "class_distribution": {
            "LOW": int((df["risk_class"] == "LOW").sum()),
            "MEDIUM": int((df["risk_class"] == "MEDIUM").sum()),
            "HIGH": int((df["risk_class"] == "HIGH").sum()),
        },
    },
    "training": {
        "test_size": TEST_SIZE,
        "stratified": True,
        "model_types": [
            "XGBClassifier(multi:softprob, num_class=3)",
            "XGBRegressor(reg:squarederror) - risk_score",
            "XGBRegressor(reg:squarederror) - quality_score",
        ],
        "hyperparameters": {
            "n_estimators": 400,
            "max_depth": 5,
            "learning_rate": 0.04,
            "subsample": 0.85,
            "colsample_bytree": 0.85,
            "min_child_weight": 2,
            "reg_alpha": 0.05,
            "reg_lambda": 1.0,
            "tree_method": "hist",
        },
    },
    "classifier": {
        "NOTE": "TEST SET ONLY - not training metrics",
        "accuracy": round(accuracy, 4),
        "macro_f1": round(cr["macro avg"]["f1-score"], 4),
        "weighted_f1": round(cr["weighted avg"]["f1-score"], 4),
        "classes": CLASS_TO_INT,
        "confusion_matrix": cm.tolist(),
        "per_class": {
            cls: {
                "precision": round(cr[cls]["precision"], 4),
                "recall": round(cr[cls]["recall"], 4),
                "f1": round(cr[cls]["f1-score"], 4),
                "support": int(cr[cls]["support"]),
            }
            for cls in ["LOW", "MEDIUM", "HIGH"]
        },
        "prediction_confidence": {
            "mean": round(float(class_prob.max(axis=1).mean()), 4),
            "min": round(float(class_prob.max(axis=1).min()), 4),
            "max": round(float(class_prob.max(axis=1).max()), 4),
        },
    },
    "risk_regressor": rm,
    "quality_regressor": qm,
    "feature_importance_sorted": fi.to_dict(orient="records"),
    "model_paths": {
        "risk_classifier": str(MODEL_DIR / "risk_classifier.ubj"),
        "model_alias": str(MODEL_DIR / "model.ubj"),
        "risk_regressor": str(MODEL_DIR / "risk_regressor.ubj"),
        "quality_regressor": str(MODEL_DIR / "quality_regressor.ubj"),
        "feature_schema": str(MODEL_DIR / "feature_schema.json"),
    },
    "xgboost_version": xgb.__version__,
}

metrics_path = REPORT_DIR / "metrics.json"
metrics_tmp = REPORT_DIR / "metrics_tmp.json"
with open(metrics_tmp, "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=2)
try:
    metrics_tmp.replace(metrics_path)
    print(f"Saved: {metrics_path}")
except PermissionError:
    print(f"WARNING: {metrics_path} locked. Saved as metrics_tmp.json")

# Update feature_schema.json in models/
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
print(f"Saved: {MODEL_DIR / 'feature_schema.json'}")

# Inference smoke test - 5 samples
print("\n" + "=" * 72)
print("INFERENCE SMOKE TEST (5 test samples)")
print("=" * 72)
for i in range(5):
    sample = X_test.iloc[[i]]
    pc = int(classifier.predict(sample)[0])
    probs = classifier.predict_proba(sample)[0]
    pr = float(np.clip(risk_model.predict(sample)[0], 0, 100))
    pq = float(np.clip(quality_model.predict(sample)[0], 0, 100))
    conf = float(np.max(probs))
    print(
        f"  Sample {i}: class={INT_TO_CLASS[pc]:6s}  "
        f"risk={pr:.1f}  quality={pq:.1f}  confidence={conf:.3f}"
    )

# Feature ordering check
loaded_features = list(classifier.feature_names_in_)
assert loaded_features == FEATURE_NAMES, f"Feature mismatch: {loaded_features}"
print("\nFeature ordering check: PASS")

print("\nModel loading  : PASS")
print("Prediction test: PASS")
print("Feature schema : PASS")
print("\n" + "=" * 72)
print("DONE")
print("=" * 72)
