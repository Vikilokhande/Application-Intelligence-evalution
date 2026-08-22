from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.analytics.service import analytics_service
from app.audit.service import audit_service
from app.core.exceptions import ApplicationError
from app.core.security import UserContext, create_access_token, get_current_user
from app.db.session import get_db
from app.ingestion.file_store import file_storage_service
from app.knowledge.service import knowledge_base
from app.models import (
    Application,
    ApplicationProfile,
    AuditLog,
    Document,
    Evidence,
    Feedback,
    FeatureSet,
    ModelPrediction,
    ReviewerAssignment,
    ReviewerDecision,
    RuleResult,
    Scheme,
    SchemeRule,
    ValidationResult,
)
from app.repositories.application_repository import application_repository
from app.review.service import review_service
from app.schemas.application import (
    AnalyticsOverview,
    ApplicationCreate,
    ApplicationDetail,
    ApplicationSummary,
    ClarificationRequest,
    DocumentRead,
    DocumentUploadResponse,
    EvidenceRead,
    FeedbackCreate,
    FeedbackRead,
    PredictionRead,
    ReviewRequest,
    SchemeCreate,
    SchemeRead,
    SchemeRuleCreate,
    SchemeRuleRead,
    ValidationResultRead,
)
from app.services.processing import application_processing_service
from app.services.seed import seed_default_data
from app.workflow.graph import application_workflow_graph
from app.validation.service import VALIDATION_VERSION, build_validation_summary


router = APIRouter()


# ── Auth endpoints ────────────────────────────────────────────────────────────


@router.post("/auth/token")
def get_token(
    user_id: str = "demo-reviewer",
    role: str = "senior_reviewer",
) -> dict[str, str]:
    """
    Issue a JWT for demo/development use.
    In production with AUTH_ENABLED=true, integrate with your identity provider.
    """
    token = create_access_token(user_id=user_id, role=role)
    return {"access_token": token, "token_type": "bearer", "user_id": user_id, "role": role}


@router.get("/auth/me")
def get_me(current_user: UserContext = Depends(get_current_user)) -> dict[str, str]:
    return {"user_id": current_user.user_id, "role": current_user.role}


@router.post("/applications", response_model=ApplicationSummary, status_code=status.HTTP_201_CREATED)
def create_application(payload: ApplicationCreate, db: Session = Depends(get_db)) -> Application:
    scheme_id = payload.scheme_id
    if not scheme_id:
        scheme_id = seed_default_data(db).id
    elif db.get(Scheme, scheme_id) is None:
        raise HTTPException(status_code=404, detail="Scheme not found")

    form_data = payload.form_data or {}
    application = Application(
        scheme_id=scheme_id,
        external_reference=payload.external_reference,
        applicant_name=payload.applicant_name or form_data.get("applicant_name"),
        project_title=payload.project_title or form_data.get("project_title"),
        project_category=payload.project_category or form_data.get("project_category"),
        form_data=form_data,
        status="DRAFT",
    )
    db.add(application)
    db.flush()
    audit_service.record(db, "application_created", application_id=application.id, payload={"scheme_id": scheme_id})
    db.commit()
    db.refresh(application)
    return application


@router.get("/applications", response_model=list[ApplicationSummary])
def list_applications(db: Session = Depends(get_db)) -> list[Application]:
    return db.scalars(select(Application).order_by(desc(Application.created_at))).all()


@router.post("/applications/{application_id}/documents", response_model=DocumentUploadResponse)
async def upload_document(
    application_id: str,
    file: UploadFile = File(...),
    document_type: str | None = Form(None),
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    try:
        stored = await file_storage_service.save_upload(application_id, file)
    except ApplicationError as exc:
        raise HTTPException(status_code=400, detail={"code": exc.code, "message": exc.message}) from exc

    document = Document(
        application_id=application_id,
        filename=stored.filename,
        document_type=(document_type or "UNKNOWN").upper(),
        mime_type=stored.mime_type,
        file_path=stored.file_path,
        checksum=stored.checksum,
        metadata_json={"size_bytes": stored.size_bytes},
    )
    db.add(document)
    audit_service.record(
        db,
        "document_uploaded",
        application_id=application_id,
        payload={"filename": document.filename, "checksum": document.checksum},
    )
    db.commit()
    db.refresh(document)
    return DocumentUploadResponse(
        document_id=document.id,
        filename=document.filename,
        document_type=document.document_type,
        checksum=document.checksum,
        processing_status=document.processing_status,
    )


@router.post("/applications/{application_id}/process")
def process_application(application_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        return application_processing_service.process(db, application_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ApplicationError as exc:  # OCRProviderError, LLMProviderError, etc.
        raise HTTPException(
            status_code=422,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/applications/{application_id}", response_model=ApplicationDetail)
def get_application(application_id: str, db: Session = Depends(get_db)) -> ApplicationDetail:
    application = application_repository.get_detail(db, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return _application_detail(db, application)


@router.get("/applications/{application_id}/status")
def get_status(application_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return {
        "application_id": application.id,
        "status": application.status,
        "processing_status": application.processing_status,
        "ai_recommendation": application.ai_recommendation,
    }


@router.get("/applications/{application_id}/validation")
def get_validation(application_id: str, structured: bool = False, db: Session = Depends(get_db)) -> Any:
    results = db.scalars(select(ValidationResult).where(ValidationResult.application_id == application_id)).all()
    if not structured:
        return [ValidationResultRead.model_validate(item) for item in results]
    rule_results = db.scalars(select(RuleResult).where(RuleResult.application_id == application_id)).all()
    summary = build_validation_summary(results)
    return {
        "application_id": application_id,
        "overall_status": summary["overall_status"],
        "summary": summary,
        "deterministic_checks": [
            ValidationResultRead.model_validate(item).model_dump()
            for item in results
            if (item.evidence or {}).get("validator") == "deterministic"
        ],
        "document_llm_checks": [
            ValidationResultRead.model_validate(item).model_dump()
            for item in results
            if (item.evidence or {}).get("validator") == "llm"
        ],
        "rag_checks": [
            ValidationResultRead.model_validate(item).model_dump()
            for item in results
            if (item.evidence or {}).get("validator") == "rag"
        ],
        "cross_document_checks": [
            ValidationResultRead.model_validate(item).model_dump()
            for item in results
            if (item.evidence or {}).get("check_id", "").startswith("CROSS_DOCUMENT_")
        ],
        "rule_results": [
            {
                "rule_id": item.rule_id,
                "rule_name": item.rule_name,
                "result": item.result,
                "expected_value": item.expected_value,
                "actual_value": item.actual_value,
                "reason": item.reason,
                "evidence": item.evidence,
                "severity": item.severity,
                "created_at": item.created_at,
            }
            for item in rule_results
        ],
        "validation_confidence": summary["validation_confidence"],
        "generated_at": datetime.now(timezone.utc),
        "version": VALIDATION_VERSION,
    }


@router.get("/applications/{application_id}/score", response_model=PredictionRead | None)
def get_score(application_id: str, db: Session = Depends(get_db)) -> ModelPrediction | None:
    return db.scalars(
        select(ModelPrediction).where(ModelPrediction.application_id == application_id).order_by(desc(ModelPrediction.created_at))
    ).first()


@router.get("/applications/{application_id}/evidence", response_model=list[EvidenceRead])
def get_evidence(application_id: str, db: Session = Depends(get_db)) -> list[Evidence]:
    return db.scalars(select(Evidence).where(Evidence.application_id == application_id)).all()


@router.get("/applications/{application_id}/workflow")
def get_workflow(application_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return {
        "graph_available": application_workflow_graph.is_available(),
        "nodes": application_workflow_graph.nodes(),
        "state": application.workflow_state or {},
    }


@router.post("/applications/{application_id}/review")
def review_application(
    application_id: str,
    payload: ReviewRequest,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    try:
        decision = review_service.submit_decision(db, application, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    db.commit()
    return {
        "decision_id": decision.id,
        "application_id": application.id,
        "decision": decision.decision,
        "status": application.status,
    }


@router.post("/applications/{application_id}/clarification")
def request_clarification(
    application_id: str,
    payload: ClarificationRequest,
    db: Session = Depends(get_db),
) -> dict[str, str]:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    review_payload = ReviewRequest(
        reviewer_id=payload.reviewer_id,
        decision="REQUEST_CLARIFICATION",
        comments=payload.message,
    )
    decision = review_service.submit_decision(db, application, review_payload)
    audit_service.record(
        db,
        "clarification_requested",
        application_id=application.id,
        actor_id=payload.reviewer_id,
        payload={"message": payload.message},
    )
    db.commit()
    return {"decision_id": decision.id, "status": application.status}


@router.post("/applications/{application_id}/feedback", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
def create_feedback(application_id: str, payload: FeedbackCreate, db: Session = Depends(get_db)) -> Feedback:
    if db.get(Application, application_id) is None:
        raise HTTPException(status_code=404, detail="Application not found")
    feedback = Feedback(
        application_id=application_id,
        reviewer_id=payload.reviewer_id,
        feedback_type=payload.feedback_type,
        comment=payload.comment,
        metadata_json=payload.metadata,
    )
    db.add(feedback)
    audit_service.record(
        db,
        "feedback_recorded",
        application_id=application_id,
        actor_id=payload.reviewer_id,
        payload={"feedback_type": payload.feedback_type},
    )
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/applications/{application_id}/feedback", response_model=list[FeedbackRead])
def list_feedback(application_id: str, db: Session = Depends(get_db)) -> list[Feedback]:
    return db.scalars(select(Feedback).where(Feedback.application_id == application_id).order_by(desc(Feedback.created_at))).all()


@router.post("/applications/{application_id}/review/open")
def record_review_opened(
    application_id: str,
    reviewer_id: str = "demo-reviewer",
    db: Session = Depends(get_db),
) -> dict[str, str]:
    if db.get(Application, application_id) is None:
        raise HTTPException(status_code=404, detail="Application not found")
    audit_service.record(db, "reviewer_opened_case", application_id=application_id, actor_id=reviewer_id)
    db.commit()
    return {"status": "recorded"}


@router.get("/analytics/overview", response_model=AnalyticsOverview)
def analytics_overview(db: Session = Depends(get_db)) -> dict[str, object]:
    return analytics_service.overview(db)


@router.get("/schemes", response_model=list[SchemeRead])
def list_schemes(db: Session = Depends(get_db)) -> list[Scheme]:
    seed_default_data(db)
    return db.scalars(select(Scheme)).all()


@router.get("/schemes/{scheme_id}", response_model=SchemeRead)
def get_scheme(scheme_id: str, db: Session = Depends(get_db)) -> Scheme:
    scheme = db.get(Scheme, scheme_id)
    if scheme is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    return scheme


@router.post("/schemes", response_model=SchemeRead, status_code=status.HTTP_201_CREATED)
def create_scheme(payload: SchemeCreate, db: Session = Depends(get_db)) -> Scheme:
    scheme = Scheme(
        code=payload.code,
        name=payload.name,
        description=payload.description,
        configuration=payload.configuration,
    )
    db.add(scheme)
    db.flush()
    for rule in payload.rules:
        db.add(
            SchemeRule(
                scheme_id=scheme.id,
                rule_id=rule.rule_id,
                rule_name=rule.rule_name,
                rule_type=rule.rule_type,
                condition=rule.condition,
                severity=rule.severity,
                active=rule.active,
            )
        )
    db.commit()
    db.refresh(scheme)
    return scheme


@router.post("/schemes/{scheme_id}/rules", response_model=SchemeRuleRead, status_code=status.HTTP_201_CREATED)
def create_scheme_rule(scheme_id: str, payload: SchemeRuleCreate, db: Session = Depends(get_db)) -> SchemeRule:
    if db.get(Scheme, scheme_id) is None:
        raise HTTPException(status_code=404, detail="Scheme not found")
    rule = SchemeRule(
        scheme_id=scheme_id,
        rule_id=payload.rule_id,
        rule_name=payload.rule_name,
        rule_type=payload.rule_type,
        condition=payload.condition,
        severity=payload.severity,
        active=payload.active,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/schemes/{scheme_id}/rules/{rule_id}", status_code=status.HTTP_200_OK)
def delete_scheme_rule(scheme_id: str, rule_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    rule = db.get(SchemeRule, rule_id)
    if rule is None or rule.scheme_id != scheme_id:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
    return {"status": "deleted", "id": rule_id}


@router.delete("/documents/{document_id}", status_code=status.HTTP_200_OK)
def delete_document(document_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    document = db.get(Document, document_id)
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(document)
    db.commit()
    return {"status": "deleted", "id": document_id}


@router.delete("/applications/{application_id}", status_code=status.HTTP_200_OK)
def delete_application(application_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    db.delete(application)
    db.commit()
    return {"status": "deleted", "id": application_id}



@router.get("/knowledge/search")
def search_knowledge(q: str, limit: int = 3) -> list[dict[str, Any]]:
    return knowledge_base.query(q, limit=limit)


def _application_detail(db: Session, application: Application) -> ApplicationDetail:
    latest_profile = db.scalars(
        select(ApplicationProfile)
        .where(ApplicationProfile.application_id == application.id)
        .order_by(desc(ApplicationProfile.created_at))
    ).first()
    latest_features = db.scalars(
        select(FeatureSet).where(FeatureSet.application_id == application.id).order_by(desc(FeatureSet.created_at))
    ).first()
    latest_decision = db.scalars(
        select(ReviewerDecision)
        .where(ReviewerDecision.application_id == application.id)
        .order_by(desc(ReviewerDecision.decided_at))
    ).first()
    latest_assignment = db.scalars(
        select(ReviewerAssignment)
        .where(ReviewerAssignment.application_id == application.id)
        .order_by(desc(ReviewerAssignment.assigned_at))
    ).first()
    audit_trail = db.scalars(
        select(AuditLog).where(AuditLog.application_id == application.id).order_by(desc(AuditLog.created_at))
    ).all()

    base = ApplicationSummary.model_validate(application).model_dump()
    return ApplicationDetail(
        **base,
        form_data=application.form_data or {},
        documents=[DocumentRead.model_validate(item) for item in application.documents],
        validation_results=[ValidationResultRead.model_validate(item) for item in application.validation_results],
        rule_results=[
            {
                "id": item.id,
                "rule_id": item.rule_id,
                "rule_name": item.rule_name,
                "result": item.result,
                "expected_value": item.expected_value,
                "actual_value": item.actual_value,
                "reason": item.reason,
                "evidence": item.evidence,
                "severity": item.severity,
                "created_at": item.created_at,
            }
            for item in application.rule_results
        ],
        evidence=[EvidenceRead.model_validate(item) for item in application.evidence],
        predictions=[PredictionRead.model_validate(item) for item in application.predictions],
        latest_profile=latest_profile.profile_json if latest_profile else None,
        latest_features=latest_features.features_json if latest_features else None,
        latest_decision={
            "decision": latest_decision.decision,
            "reviewer_id": latest_decision.reviewer_id,
            "override_ai_recommendation": latest_decision.override_ai_recommendation,
            "override_reason": latest_decision.override_reason,
            "comments": latest_decision.comments,
            "decided_at": latest_decision.decided_at,
        }
        if latest_decision
        else None,
        reviewer_assignment={
            "reviewer_role": latest_assignment.reviewer_role,
            "routing_reason": latest_assignment.routing_reason,
            "status": latest_assignment.status,
            "policy_version": latest_assignment.policy_version,
            "assigned_at": latest_assignment.assigned_at,
        }
        if latest_assignment
        else None,
        audit_trail=[
            {
                "event_type": event.event_type,
                "actor_id": event.actor_id,
                "event_payload": event.event_payload,
                "created_at": event.created_at,
            }
            for event in audit_trail
        ],
    )
