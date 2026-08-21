"""
app/models/entities.py
=======================

SQLAlchemy ORM entities for the Application Intelligence Platform.

Fields added vs original:
  Document: classification_confidence, classification_provider, ocr_provider, ocr_confidence, ocr_status
  FeatureSet: feature_version
  ModelPrediction: feature_version, policy_version, provider
  ReviewerAssignment: policy_version
  ExtractedData: provider default changed from 'mock_local_parser' to 'unset'
"""

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def new_id() -> str:
    return str(uuid4())


def utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(255))


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    username: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False)
    role_id: Mapped[str | None] = mapped_column(ForeignKey("roles.id"))
    expertise: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    role: Mapped[Role | None] = relationship("Role")


class Scheme(Base):
    __tablename__ = "schemes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    configuration: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    rules: Mapped[list["SchemeRule"]] = relationship("SchemeRule", back_populates="scheme", cascade="all, delete-orphan")
    applications: Mapped[list["Application"]] = relationship("Application", back_populates="scheme")


class SchemeRule(Base):
    __tablename__ = "scheme_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    scheme_id: Mapped[str] = mapped_column(ForeignKey("schemes.id"), index=True, nullable=False)
    rule_id: Mapped[str] = mapped_column(String(120), nullable=False)
    rule_name: Mapped[str] = mapped_column(String(200), nullable=False)
    rule_type: Mapped[str] = mapped_column(String(80), nullable=False)
    condition: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    severity: Mapped[str] = mapped_column(String(40), default="ERROR")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    scheme: Mapped[Scheme] = relationship("Scheme", back_populates="rules")

    __table_args__ = (Index("ix_scheme_rules_scheme_rule", "scheme_id", "rule_id"),)


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    scheme_id: Mapped[str | None] = mapped_column(ForeignKey("schemes.id"), index=True)
    external_reference: Mapped[str | None] = mapped_column(String(120), index=True)
    applicant_name: Mapped[str | None] = mapped_column(String(200), index=True)
    project_title: Mapped[str | None] = mapped_column(String(240), index=True)
    project_category: Mapped[str | None] = mapped_column(String(120))
    form_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(80), default="DRAFT", index=True)
    processing_status: Mapped[str] = mapped_column(String(80), default="NOT_STARTED", index=True)
    ai_recommendation: Mapped[str | None] = mapped_column(String(80))
    workflow_state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)

    scheme: Mapped[Scheme | None] = relationship("Scheme", back_populates="applications")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    extracted_data: Mapped[list["ExtractedData"]] = relationship("ExtractedData", back_populates="application")
    profiles: Mapped[list["ApplicationProfile"]] = relationship("ApplicationProfile", back_populates="application")
    validation_results: Mapped[list["ValidationResult"]] = relationship("ValidationResult", back_populates="application")
    rule_results: Mapped[list["RuleResult"]] = relationship("RuleResult", back_populates="application")
    features: Mapped[list["FeatureSet"]] = relationship("FeatureSet", back_populates="application")
    predictions: Mapped[list["ModelPrediction"]] = relationship("ModelPrediction", back_populates="application")
    evidence: Mapped[list["Evidence"]] = relationship("Evidence", back_populates="application")
    assignments: Mapped[list["ReviewerAssignment"]] = relationship("ReviewerAssignment", back_populates="application")
    decisions: Mapped[list["ReviewerDecision"]] = relationship("ReviewerDecision", back_populates="application")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(120), default="UNKNOWN", index=True)
    mime_type: Mapped[str] = mapped_column(String(160), nullable=False)
    file_path: Mapped[str] = mapped_column(String(600), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    processing_status: Mapped[str] = mapped_column(String(80), default="PENDING", index=True)
    extraction_status: Mapped[str] = mapped_column(String(80), default="PENDING")
    validation_status: Mapped[str] = mapped_column(String(80), default="PENDING")
    checksum: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)

    # --- Classification provenance (added) ---
    classification_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    classification_provider: Mapped[str | None] = mapped_column(String(120), nullable=True)

    # --- OCR provenance (added) ---
    ocr_provider: Mapped[str | None] = mapped_column(String(80), nullable=True)
    ocr_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    ocr_status: Mapped[str | None] = mapped_column(String(80), nullable=True)

    application: Mapped[Application] = relationship("Application", back_populates="documents")
    extracted_data: Mapped[list["ExtractedData"]] = relationship("ExtractedData", back_populates="document")


class ExtractedData(Base):
    __tablename__ = "extracted_data"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("documents.id"), index=True)
    extraction_type: Mapped[str] = mapped_column(String(80), nullable=False)
    raw_data: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    provider: Mapped[str] = mapped_column(String(120), default="unset")
    status: Mapped[str] = mapped_column(String(80), default="EXTRACTED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    application: Mapped[Application] = relationship("Application", back_populates="extracted_data")
    document: Mapped[Document | None] = relationship("Document", back_populates="extracted_data")


class ApplicationProfile(Base):
    __tablename__ = "application_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    profile_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    extraction_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    application: Mapped[Application] = relationship("Application", back_populates="profiles")


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    validation_type: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(40), default="INFO")
    evidence: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    application: Mapped[Application] = relationship("Application", back_populates="validation_results")


class RuleResult(Base):
    __tablename__ = "rule_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    scheme_rule_id: Mapped[str | None] = mapped_column(ForeignKey("scheme_rules.id"))
    rule_id: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    rule_name: Mapped[str] = mapped_column(String(200), nullable=False)
    result: Mapped[str] = mapped_column(String(40), nullable=False)
    expected_value: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    actual_value: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    evidence: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    severity: Mapped[str] = mapped_column(String(40), default="ERROR")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    application: Mapped[Application] = relationship("Application", back_populates="rule_results")


class FeatureSet(Base):
    __tablename__ = "features"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    features_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    trusted: Mapped[bool] = mapped_column(Boolean, default=True)
    # --- Feature schema version (added) ---
    feature_version: Mapped[str] = mapped_column(String(40), default="1.0")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    application: Mapped[Application] = relationship("Application", back_populates="features")


class ModelPrediction(Base):
    __tablename__ = "model_predictions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    model_name: Mapped[str] = mapped_column(String(160), nullable=False)
    model_version: Mapped[str] = mapped_column(String(80), default="")
    quality_score: Mapped[float | None] = mapped_column(Float)
    risk_score: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    prediction_class: Mapped[str] = mapped_column(String(80), default="UNAVAILABLE")
    feature_contributions: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(200), default="GENERATED")
    # --- Added fields ---
    feature_version: Mapped[str] = mapped_column(String(40), default="1.0")
    policy_version: Mapped[str] = mapped_column(String(40), default="")
    provider: Mapped[str] = mapped_column(String(80), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    application: Mapped[Application] = relationship("Application", back_populates="predictions")


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    document_id: Mapped[str | None] = mapped_column(ForeignKey("documents.id"), index=True)
    finding_type: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    locator: Mapped[str | None] = mapped_column(String(255))
    field_name: Mapped[str | None] = mapped_column(String(120))
    extracted_value: Mapped[str | None] = mapped_column(String(600))
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    metadata_json: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    application: Mapped[Application] = relationship("Application", back_populates="evidence")


class ReviewerAssignment(Base):
    __tablename__ = "reviewer_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    reviewer_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), index=True)
    reviewer_role: Mapped[str] = mapped_column(String(80), nullable=False)
    routing_reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(80), default="ASSIGNED")
    assigned_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    # --- Policy version (added) ---
    policy_version: Mapped[str] = mapped_column(String(40), default="")

    application: Mapped[Application] = relationship("Application", back_populates="assignments")
    reviewer: Mapped[User | None] = relationship("User")


class ReviewerDecision(Base):
    __tablename__ = "reviewer_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    reviewer_id: Mapped[str] = mapped_column(String(120), nullable=False)
    decision: Mapped[str] = mapped_column(String(80), nullable=False)
    previous_recommendation: Mapped[str | None] = mapped_column(String(80))
    override_ai_recommendation: Mapped[bool] = mapped_column(Boolean, default=False)
    override_reason: Mapped[str | None] = mapped_column(Text)
    comments: Mapped[str | None] = mapped_column(Text)
    decided_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    application: Mapped[Application] = relationship("Application", back_populates="decisions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str | None] = mapped_column(ForeignKey("applications.id"), index=True)
    actor_id: Mapped[str | None] = mapped_column(String(120), index=True)
    event_type: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    event_payload: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(ForeignKey("applications.id"), index=True, nullable=False)
    reviewer_id: Mapped[str] = mapped_column(String(120), nullable=False)
    feedback_type: Mapped[str] = mapped_column(String(120), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)
    metadata_json: Mapped[dict[str, Any]] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    application_id: Mapped[str | None] = mapped_column(ForeignKey("applications.id"), index=True)
    recipient: Mapped[str] = mapped_column(String(160), nullable=False)
    channel: Mapped[str] = mapped_column(String(40), default="EMAIL")
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(80), default="PENDING")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
