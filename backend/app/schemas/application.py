from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, computed_field


Decision = Literal["APPROVE", "REJECT", "REQUEST_CLARIFICATION", "OVERRIDE_AI_RECOMMENDATION"]


class ApplicationCreate(BaseModel):
    scheme_id: str | None = None
    external_reference: str | None = None
    applicant_name: str | None = None
    project_title: str | None = None
    project_category: str | None = None
    form_data: dict[str, Any] = Field(default_factory=dict)


class ApplicationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    scheme_id: str | None
    external_reference: str | None
    applicant_name: str | None
    project_title: str | None
    project_category: str | None
    status: str
    processing_status: str
    ai_recommendation: str | None
    created_at: datetime
    updated_at: datetime


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    filename: str
    document_type: str
    mime_type: str
    file_path: str
    uploaded_at: datetime
    processing_status: str
    extraction_status: str
    validation_status: str
    checksum: str
    metadata_json: dict[str, Any]
    classification_confidence: float | None = None
    classification_provider: str | None = None
    ocr_provider: str | None = None
    ocr_confidence: float | None = None
    ocr_status: str | None = None


class ValidationResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    validation_type: str
    status: str
    message: str
    severity: str
    evidence: dict[str, Any]
    created_at: datetime


class RuleResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rule_id: str
    rule_name: str
    result: str
    expected_value: dict[str, Any]
    actual_value: dict[str, Any]
    reason: str
    evidence: dict[str, Any]
    severity: str
    created_at: datetime


class EvidenceRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    document_id: str | None
    finding_type: str
    source: str
    locator: str | None
    field_name: str | None
    extracted_value: str | None
    confidence: float
    metadata_json: dict[str, Any]
    created_at: datetime


class PredictionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    model_name: str
    model_version: str
    quality_score: float | None
    risk_score: float | None
    confidence: float
    prediction_class: str
    feature_contributions: dict[str, Any]
    status: str
    feature_version: str
    policy_version: str
    provider: str
    created_at: datetime

    @computed_field
    @property
    def model_status(self) -> str:
        """Derived: ML_READY | BASELINE_FALLBACK | UNAVAILABLE. Not stored in DB."""
        if self.provider == "xgboost":
            return "ML_READY"
        if self.provider == "baseline":
            return "BASELINE_FALLBACK"
        return "UNAVAILABLE"


class ApplicationDetail(ApplicationSummary):
    form_data: dict[str, Any]
    workflow_state: dict[str, Any] = Field(default_factory=dict)
    documents: list[DocumentRead] = Field(default_factory=list)
    validation_results: list[ValidationResultRead] = Field(default_factory=list)
    rule_results: list[RuleResultRead] = Field(default_factory=list)
    evidence: list[EvidenceRead] = Field(default_factory=list)
    predictions: list[PredictionRead] = Field(default_factory=list)
    latest_profile: dict[str, Any] | None = None
    latest_features: dict[str, Any] | None = None
    latest_decision: dict[str, Any] | None = None
    reviewer_assignment: dict[str, Any] | None = None
    audit_trail: list[dict[str, Any]] = Field(default_factory=list)


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    document_type: str
    checksum: str
    processing_status: str


class ReviewRequest(BaseModel):
    reviewer_id: str = "demo-reviewer"
    decision: Decision
    comments: str | None = None
    override_ai_recommendation: bool = False
    override_reason: str | None = None


class ClarificationRequest(BaseModel):
    reviewer_id: str = "demo-reviewer"
    message: str


class FeedbackCreate(BaseModel):
    reviewer_id: str = "demo-reviewer"
    feedback_type: str
    comment: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class FeedbackRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    reviewer_id: str
    feedback_type: str
    comment: str | None
    metadata_json: dict[str, Any]
    created_at: datetime


class SchemeRuleCreate(BaseModel):
    rule_id: str
    rule_name: str
    rule_type: str
    condition: dict[str, Any]
    severity: str = "ERROR"
    active: bool = True


class SchemeCreate(BaseModel):
    code: str
    name: str
    description: str | None = None
    configuration: dict[str, Any] = Field(default_factory=dict)
    rules: list[SchemeRuleCreate] = Field(default_factory=list)


class SchemeRuleRead(SchemeRuleCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    scheme_id: str
    created_at: datetime


class SchemeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    name: str
    description: str | None
    configuration: dict[str, Any]
    active: bool
    created_at: datetime
    rules: list[SchemeRuleRead] = Field(default_factory=list)


class AnalyticsOverview(BaseModel):
    total_applications: int
    applications_by_status: dict[str, int]
    average_processing_time_hours: float | None
    average_review_time_hours: float | None
    decision_distribution: dict[str, int]
    score_distribution: dict[str, int]
    risk_distribution: dict[str, int]
    reviewer_workload: dict[str, int]
    reviewer_performance: dict[str, dict[str, int]]
    rule_failure_frequency: dict[str, int]
    suspicious_application_count: int
    scheme_statistics: dict[str, int]
    document_processing_statistics: dict[str, int] = Field(default_factory=dict)
    ocr_usage: dict[str, int] = Field(default_factory=dict)
    llm_usage: dict[str, int] = Field(default_factory=dict)
    routing_distribution: dict[str, int] = Field(default_factory=dict)
    validation_failure_frequency: dict[str, int] = Field(default_factory=dict)
