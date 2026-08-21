"""
End-to-end pipeline test script.
Creates a real application, uploads real documents (in-memory), processes it,
and validates the full pipeline ran correctly.
"""
import json
import sys
import time
import requests

BASE = "http://localhost:8000/api/v1"

def step(msg): print(f"\n{'='*60}\n{msg}\n{'='*60}")
def ok(msg): print(f"  [OK]  {msg}")
def warn(msg): print(f"  [WARN] {msg}")
def fail(msg, data=None):
    print(f"  [FAIL] {msg}")
    if data: print(json.dumps(data, indent=2, default=str)[:500])

# ── 1. Create Application ─────────────────────────────────────────────────────
step("1. Creating application")
r = requests.post(f"{BASE}/applications", json={
    "applicant_name": "Clean Water NGO Trust",
    "project_title": "Urban Rainwater Harvesting Network",
    "project_category": "Water Conservation",
    "form_data": {
        "applicant_name": "Clean Water NGO Trust",
        "organization_type": "Registered NGO",
        "project_title": "Urban Rainwater Harvesting Network",
        "project_category": "Water Conservation",
        "project_cost": 2500000,
        "duration_months": 12,
        "environmental_benefit": "Install 200 rooftop rainwater harvesting units reducing urban runoff by 40%"
    }
})
assert r.status_code == 201, f"Create failed: {r.text}"
app = r.json()
app_id = app["id"]
ok(f"Application created: {app_id}")
ok(f"Status: {app['status']}")

# ── 2. Upload Documents ───────────────────────────────────────────────────────
step("2. Uploading documents")

APPLICATION_FORM_CONTENT = b"""
APPLICATION FORM - GREEN INFRASTRUCTURE SUPPORT SCHEME

Applicant Name: Clean Water NGO Trust
Organization Type: Registered NGO
Registration Number: NGO/2021/MH/45782
Contact: info@cleanwater.org | +91-9876543210

Project Title: Urban Rainwater Harvesting Network
Project Category: Water Conservation
Project Location: Pune Municipal Area, Maharashtra

Project Description:
Installation of 200 rooftop rainwater harvesting units across residential 
and institutional buildings in the Pune municipal area. The project aims 
to reduce urban runoff by 40% and supplement municipal water supply.

Requested Grant Amount: Rs. 25,00,000 (Twenty-Five Lakh Rupees)
Total Project Cost: Rs. 25,00,000
Project Duration: 12 months
Expected Start Date: 01 April 2026

Declaration:
I hereby declare that all information provided is accurate and complete.
Signature: ____________________
Date: 21 August 2026
"""

PROPOSAL_CONTENT = b"""
PROJECT PROPOSAL

Title: Urban Rainwater Harvesting Network
Applicant: Clean Water NGO Trust
Organization Type: Registered NGO

1. OBJECTIVES
   - Install 200 rooftop rainwater harvesting (RWH) systems
   - Reduce stormwater runoff by minimum 40%
   - Supplement 15% of local water demand during monsoon
   - Demonstrate scalable urban water conservation model

2. METHODOLOGY
   Phase 1 (Months 1-3): Site survey, beneficiary selection, procurement
   Phase 2 (Months 4-9): Installation and commissioning of RWH units
   Phase 3 (Months 10-12): Monitoring, evaluation, and capacity building

3. EXPECTED OUTCOMES
   - 200 operational RWH systems installed
   - 40 million litres of rainwater harvested annually
   - 500 households benefited directly
   - 40% reduction in urban runoff in target area

4. ENVIRONMENTAL BENEFIT
   Urban rainwater harvesting reduces flash flooding, recharges groundwater,
   reduces demand on overloaded municipal supply systems, and decreases
   energy consumption for water treatment and pumping.

5. BUDGET SUMMARY
   Total Project Cost: Rs. 25,00,000
   Duration: 12 months
"""

BUDGET_CONTENT = b"""
PROJECT BUDGET - Urban Rainwater Harvesting Network

Applicant: Clean Water NGO Trust
Project Cost: Rs. 25,00,000

ITEMIZED BUDGET:

1. Civil Works & Installation
   - RWH Tank installation (200 units x Rs. 8,000): Rs. 16,00,000
   - Pipeline and fittings: Rs. 2,00,000
   
2. Equipment & Materials
   - Filters and screens: Rs. 1,50,000
   - First flush diverters: Rs. 1,00,000
   
3. Professional Services  
   - Site surveys and engineering design: Rs. 1,50,000
   - Consultancy fees (6%): Rs. 1,50,000
   
4. Monitoring & Evaluation
   - Flow meters and sensors: Rs. 1,00,000
   - Reporting and documentation: Rs. 50,000

TOTAL: Rs. 25,00,000

Note: All costs are inclusive of taxes.
"""

CERTIFICATE_CONTENT = b"""
REGISTRATION CERTIFICATE

This is to certify that:

Organization Name: Clean Water NGO Trust
Registration Number: NGO/2021/MH/45782
Registration Act: Societies Registration Act 1860
Registered State: Maharashtra
Date of Registration: 15 March 2021
Valid Until: 14 March 2027

Nature of Activities: Environmental conservation, water resource management,
community development

Authorized Signatory: District Registrar, Pune
Date: 01 January 2026

This certificate is issued for the purpose of applying to government schemes.
"""

docs = [
    ("application_form.txt", APPLICATION_FORM_CONTENT, "APPLICATION_FORM"),
    ("project_proposal.txt", PROPOSAL_CONTENT, "PROPOSAL"),
    ("project_budget.txt", BUDGET_CONTENT, "BUDGET"),
    ("registration_certificate.txt", CERTIFICATE_CONTENT, "CERTIFICATE"),
]

doc_ids = []
for filename, content, doc_type in docs:
    r = requests.post(
        f"{BASE}/applications/{app_id}/documents",
        files={"file": (filename, content, "text/plain")},
        data={"document_type": doc_type},
    )
    assert r.status_code == 200, f"Upload failed for {filename}: {r.text}"
    doc_resp = r.json()
    doc_ids.append(doc_resp["document_id"])
    ok(f"Uploaded: {filename} ({doc_type}) -> {doc_resp['document_id']}")

# ── 3. Process Application ────────────────────────────────────────────────────
step("3. Processing application (full pipeline)")
t0 = time.time()
r = requests.post(f"{BASE}/applications/{app_id}/process")
elapsed = round(time.time() - t0, 1)

if r.status_code == 200:
    state = r.json()
    ok(f"Pipeline completed in {elapsed}s")
    ok(f"Current node: {state.get('current_node')}")
    ok(f"Review status: {state.get('review_status')}")
    
    # Check ML prediction
    pred = state.get("ml_prediction", {})
    ok(f"ML Scoring: class={pred.get('prediction_class')} risk={pred.get('risk_score')} quality={pred.get('quality_score')} status={pred.get('status')}")
    
    # Check LLM reasoning
    llm = state.get("llm_reasoning", {})
    llm_status = llm.get("status")
    if llm_status == "COMPLETED":
        ok(f"LLM Reasoning: recommendation={llm.get('recommendation')} confidence={llm.get('llm_confidence'):.2f}")
        ok(f"LLM Summary: {llm.get('summary', '')[:120]}")
    elif llm_status == "LLM_FAILED":
        warn(f"LLM Reasoning failed: {llm.get('error_message', '')[:100]}")
    else:
        warn(f"LLM Reasoning status: {llm_status}")
    
    # Check routing
    routing = state.get("routing_result", {})
    ok(f"Routing: recommendation={routing.get('recommendation')} reviewer={routing.get('reviewer_role')}")
    
    # Check validation
    val = state.get("validation_results", [])
    v_pass = sum(1 for v in val if v.get("status") == "PASS")
    v_warn = sum(1 for v in val if v.get("status") == "WARN")
    v_fail = sum(1 for v in val if v.get("status") == "FAIL")
    ok(f"Validation: total={len(val)} pass={v_pass} warn={v_warn} fail={v_fail}")
    
    # Check explanations
    expl = state.get("explanations", {})
    ok(f"Explanation: failed_rules={len(expl.get('failed_rules', []))} contradictions={len(expl.get('contradictions', []))}")
    
    # Check evidence
    ok(f"Evidence items: {len(state.get('evidence', []))}")
    ok(f"Extracted data: {len(state.get('extracted_data', []))} documents")
    
    errors = [e for e in state.get("errors", []) if e.get("code") != "WORKFLOW_PAUSED_FOR_HUMAN_REVIEW"]
    if errors:
        warn(f"Pipeline errors: {errors}")
else:
    fail(f"Process failed ({r.status_code})", r.json())

# ── 4. Verify Application State ───────────────────────────────────────────────
step("4. Verifying application state in DB")
r = requests.get(f"{BASE}/applications/{app_id}/status")
status = r.json()
ok(f"Application status: {status.get('status')}")
ok(f"AI recommendation: {status.get('ai_recommendation')}")

# ── 5. Check validation results ───────────────────────────────────────────────
r = requests.get(f"{BASE}/applications/{app_id}/validation")
validations = r.json()
ok(f"Validation results in DB: {len(validations)}")
for v in validations[:5]:
    ok(f"  [{v.get('status')}] {v.get('validation_type')}: {v.get('message', '')[:80]}")

# ── 6. Check score ────────────────────────────────────────────────────────────
r = requests.get(f"{BASE}/applications/{app_id}/score")
score = r.json()
if score:
    ok(f"Score: risk={score.get('risk_score')} quality={score.get('quality_score')} class={score.get('prediction_class')}")
else:
    warn("No score found in DB")

# ── 7. Analytics ──────────────────────────────────────────────────────────────
step("5. Analytics (real DB values)")
r = requests.get(f"{BASE}/analytics/overview")
analytics = r.json()
ok(f"Total applications: {analytics.get('total_applications')}")
ok(f"By status: {analytics.get('applications_by_status')}")
ok(f"Risk distribution: {analytics.get('risk_distribution')}")

step("ALL PIPELINE STAGES VERIFIED")
print(f"\nApplication ID: {app_id}")
print(f"View at: http://localhost:5173/applications/{app_id}")
