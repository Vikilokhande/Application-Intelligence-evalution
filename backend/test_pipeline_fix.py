import sys, os
os.chdir(r'c:\Users\vikil\Desktop\Project_Evalution\backend')
sys.path.insert(0, r'c:\Users\vikil\Desktop\Project_Evalution\backend')

import logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s %(name)s %(message)s')

from app.db.session import SessionLocal, init_db
from app.services.seed import seed_default_data
from app.models import Application
from app.services.processing import application_processing_service
from app.ml.scoring import FEATURE_NAMES

init_db()
db = SessionLocal()

scheme = seed_default_data(db)
print("Using scheme:", scheme.id)

app_obj = Application(
    scheme_id=scheme.id,
    applicant_name="TCS Green",
    project_title="Urban Tree Plantation Drive",
    project_category="Green Infrastructure",
    form_data={
        "applicant_name": "TCS Green",
        "project_title": "Urban Tree Plantation Drive",
        "project_category": "Green Infrastructure",
        "project_cost": 500000,
        "duration_months": 12,
    },
    status="DRAFT",
)
db.add(app_obj)
db.commit()
db.refresh(app_obj)
print("Application:", app_obj.id)
print()

try:
    state = application_processing_service.process(db, app_obj.id)
    print()
    print("="*60)
    print("PIPELINE COMPLETE")
    print("="*60)

    features = state.get("features", {})
    ml_ok = [f for f in FEATURE_NAMES if f in features]
    print(f"\nML Features: {len(ml_ok)}/13")
    for name in FEATURE_NAMES:
        val = features.get(name, "MISSING!")
        print(f"  {name}: {val}")

    pred = state.get("ml_prediction", {})
    print(f"\nML Prediction:")
    print(f"  provider        : {pred.get('provider')}")
    print(f"  prediction_class: {pred.get('prediction_class')}")
    print(f"  risk_score      : {pred.get('risk_score')}")
    print(f"  quality_score   : {pred.get('quality_score')}")
    print(f"  confidence      : {pred.get('confidence')}")
    print(f"  status          : {pred.get('status')}")

    llm = state.get("llm_reasoning", {})
    print(f"\nLLM Reasoning:")
    print(f"  status     : {llm.get('status')}")
    print(f"  model      : {llm.get('model')}")
    print(f"  recommend  : {llm.get('recommendation')}")
    print(f"  confidence : {llm.get('llm_confidence')}")

    route = state.get("routing_result", {})
    print(f"\nRouting:")
    print(f"  reviewer_role  : {route.get('reviewer_role')}")
    print(f"  recommendation : {route.get('recommendation')}")
    print(f"  review_status  : {state.get('review_status')}")

    # Assertions
    assert len(ml_ok) == 13, f"Only {len(ml_ok)}/13 ML features present"
    assert pred.get("provider") == "xgboost", f"Expected xgboost, got {pred.get('provider')}"
    assert pred.get("risk_score") is not None
    assert pred.get("quality_score") is not None
    assert pred.get("confidence") is not None
    assert pred.get("prediction_class") in ("LOW_RISK", "MEDIUM_RISK", "HIGH_RISK")
    assert state.get("review_status") == "AWAITING_HUMAN_REVIEW"

    print()
    print("ALL ASSERTIONS PASSED!")

except Exception as exc:
    import traceback
    print("PIPELINE FAILED:", exc)
    traceback.print_exc()
finally:
    db.close()
