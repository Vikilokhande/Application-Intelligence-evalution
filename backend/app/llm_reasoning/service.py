"""
llm_reasoning/service.py
=========================

Post-scoring LLM Reasoning Service.

This service runs AFTER:
  - document extraction
  - normalization
  - RAG validation
  - rule evaluation
  - feature engineering
  - ML scoring

The LLM is used for:
  - case summarization
  - validation failure explanation
  - score/risk explanation
  - reviewer recommendation (advisory only)
  - clarification question generation
  - contradiction explanation

The LLM is NOT the final decision maker.
Human reviewer authority is preserved.
All LLM responses are validated against a Pydantic schema.
LLM failures are recorded but do NOT crash the pipeline.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.audit.service import audit_service
from app.core.exceptions import LLMProviderError
from app.extraction.providers import get_llm_provider
from app.models import Application, ModelPrediction, RuleResult, ValidationResult

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic schema for LLM output validation
# ---------------------------------------------------------------------------


class LLMReasoningOutput(BaseModel):
    """Strict schema for LLM reasoning response. All fields validated."""

    summary: str = Field(default="", description="2-3 sentence case summary.")
    key_findings: list[str] = Field(default_factory=list, description="Top 3-5 key findings from validation.")
    risk_explanation: str = Field(default="", description="Explanation of the risk score and contributing factors.")
    score_explanation: str = Field(default="", description="Explanation of the quality score.")
    validation_explanation: str = Field(default="", description="Summary of validation results and failures.")
    missing_information: list[str] = Field(default_factory=list, description="List of missing information items.")
    clarification_questions: list[str] = Field(default_factory=list, description="Questions to ask the applicant.")
    recommendation: str = Field(
        default="REVIEW_REQUIRED",
        description="Advisory recommendation: APPROVE | REJECT | REQUEST_CLARIFICATION | REVIEW_REQUIRED",
    )
    confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="LLM confidence in its reasoning (0-1).")

    model_config = {"extra": "ignore"}


# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

REASONING_SYSTEM_PROMPT = """You are an AI assistant supporting the Directorate of Environment and Climate Change application review process.

Your role is to ASSIST human reviewers by providing structured analysis. You do NOT make final decisions.
All final decisions (APPROVE / REJECT) must be made by an authorized human reviewer.

Analyze the provided application data and return ONLY a valid JSON object matching the schema.
Do not include markdown, code blocks, or any text outside the JSON object.
Base your analysis ONLY on the information provided. Do not invent or assume facts."""

REASONING_PROMPT_TEMPLATE = """Analyze this grant application and provide a structured review.

=== APPLICATION OVERVIEW ===
Applicant: {applicant_name}
Project: {project_title}
Category: {project_category}
Requested Cost: {project_cost}
Duration: {duration_months} months
Organization Type: {organization_type}

=== ML SCORING RESULTS ===
Risk Score: {risk_score} / 100 (higher = more risk)
Quality Score: {quality_score} / 100 (higher = better)
Prediction Class: {prediction_class}
Model: {model_name} ({model_status})
Confidence: {confidence}

=== VALIDATION RESULTS ===
Total checks: {validation_total}
Passed: {validation_passed}
Warnings: {validation_warnings}
Failed: {validation_failed}

FAILED CHECKS:
{failed_validations}

WARNINGS:
{warning_validations}

=== RULE EVALUATION RESULTS ===
Total rules: {rule_total}
Passed: {rule_passed}
Failed: {rule_failed}

FAILED RULES:
{failed_rules}

=== KEY FEATURES ===
{features_summary}

=== SCHEME KNOWLEDGE EVIDENCE ===
{knowledge_evidence}

=== CROSS-DOCUMENT CONTRADICTIONS ===
{contradictions}

=== SUSPICIOUS INDICATORS ===
{suspicious_indicators}

Return a JSON object with EXACTLY these fields:
{{
  "summary": "2-3 sentence objective case summary",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "risk_explanation": "Explain why the risk score is what it is, referencing specific findings",
  "score_explanation": "Explain what the quality score reflects about this application",
  "validation_explanation": "Summarize the validation outcomes and what they mean for the application",
  "missing_information": ["item 1", "item 2"],
  "clarification_questions": ["question 1", "question 2"],
  "recommendation": "APPROVE|REJECT|REQUEST_CLARIFICATION|REVIEW_REQUIRED",
  "confidence": 0.0
}}

IMPORTANT:
- recommendation must be one of: APPROVE, REJECT, REQUEST_CLARIFICATION, REVIEW_REQUIRED
- This recommendation is ADVISORY ONLY — a human reviewer will make the final decision
- confidence is your confidence in your analysis (0.0 to 1.0)
- Base everything on the data provided above
"""


def _format_validation_list(results: list[ValidationResult], status: str) -> str:
    items = [r for r in results if r.status == status]
    if not items:
        return "None"
    lines = []
    for r in items[:8]:  # limit for token budget
        lines.append(f"  - [{r.validation_type}] {r.message}")
    return "\n".join(lines)


def _format_rule_list(results: list[RuleResult], result_status: str) -> str:
    items = [r for r in results if r.result == result_status]
    if not items:
        return "None"
    lines = []
    for r in items[:6]:
        lines.append(f"  - [{r.rule_id}] {r.reason}")
    return "\n".join(lines)


def _format_features(features: dict[str, float]) -> str:
    important = [
        "document_completeness",
        "required_field_completeness",
        "eligibility_pass_ratio",
        "budget_consistency",
        "contradiction_count",
        "suspicious_indicator_count",
        "extraction_confidence",
    ]
    lines = []
    for key in important:
        if key in features:
            lines.append(f"  {key}: {features[key]:.3f}")
    return "\n".join(lines) if lines else "No features computed."


def _format_knowledge_evidence(validation_results: list[ValidationResult]) -> str:
    rag_results = [
        r for r in validation_results
        if r.validation_type in ("SCHEME_KNOWLEDGE_RETRIEVAL", "RAG_PROJECT_COST_LIMIT", "RAG_PROJECT_DURATION_LIMIT")
        and r.evidence
    ]
    if not rag_results:
        return "No scheme knowledge was retrieved."
    lines = []
    for r in rag_results[:4]:
        lines.append(f"  [{r.status}] {r.message}")
    return "\n".join(lines)


def _format_contradictions(validation_results: list[ValidationResult]) -> str:
    contradictions = [
        r for r in validation_results
        if r.validation_type == "CROSS_DOCUMENT_CONSISTENCY" and r.status == "FAIL"
    ]
    if not contradictions:
        return "None detected."
    return "\n".join(f"  - {r.message}" for r in contradictions)


def _format_suspicious(validation_results: list[ValidationResult]) -> str:
    suspicious = [
        r for r in validation_results
        if r.validation_type == "SUSPICIOUS_INDICATOR" and r.status in ("WARN", "FAIL")
    ]
    if not suspicious:
        return "None detected."
    lines = []
    for r in suspicious:
        indicators = (r.evidence or {}).get("indicators", [])
        lines.extend(f"  - {item}" for item in indicators)
    return "\n".join(lines) if lines else "None detected."


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class LLMReasoningService:
    """
    Runs structured LLM reasoning after all deterministic pipeline stages.
    Never fabricates results. Never fails silently.
    Validates all LLM responses against LLMReasoningOutput schema.
    """

    def reason(
        self,
        db: Session,
        application: Application,
        profile: dict[str, Any],
        validation_results: list[ValidationResult],
        rule_results: list[RuleResult],
        features: dict[str, float],
        prediction: ModelPrediction,
    ) -> dict[str, Any]:
        started = time.monotonic()
        logger.info(
            "[PIPELINE] application=%s stage=LLM_REASONING status=STARTED",
            application.id,
        )

        # Build input context
        applicant_name = self._get(profile, "applicant.name")
        project_title = self._get(profile, "project.title")
        project_category = self._get(profile, "project.category")
        project_cost = self._get(profile, "financial.project_cost")
        duration_months = self._get(profile, "timeline.duration_months")
        organization_type = self._get(profile, "applicant.organization_type")

        val_pass = sum(1 for r in validation_results if r.status == "PASS")
        val_warn = sum(1 for r in validation_results if r.status == "WARN")
        val_fail = sum(1 for r in validation_results if r.status == "FAIL")
        rule_pass = sum(1 for r in rule_results if r.result == "PASS")
        rule_fail = sum(1 for r in rule_results if r.result == "FAIL")

        prompt = REASONING_PROMPT_TEMPLATE.format(
            applicant_name=applicant_name or "Unknown",
            project_title=project_title or "Unknown",
            project_category=project_category or "Unknown",
            project_cost=f"₹{float(project_cost):,.0f}" if project_cost else "Not provided",
            duration_months=duration_months or "Not provided",
            organization_type=organization_type or "Not provided",
            risk_score=prediction.risk_score if prediction.risk_score is not None else "N/A",
            quality_score=prediction.quality_score if prediction.quality_score is not None else "N/A",
            prediction_class=prediction.prediction_class or "UNAVAILABLE",
            model_name=prediction.model_name or "unknown",
            model_status=prediction.status or "unknown",
            confidence=f"{prediction.confidence:.2f}" if prediction.confidence else "0.00",
            validation_total=len(validation_results),
            validation_passed=val_pass,
            validation_warnings=val_warn,
            validation_failed=val_fail,
            failed_validations=_format_validation_list(validation_results, "FAIL"),
            warning_validations=_format_validation_list(validation_results, "WARN"),
            rule_total=len(rule_results),
            rule_passed=rule_pass,
            rule_failed=rule_fail,
            failed_rules=_format_rule_list(rule_results, "FAIL"),
            features_summary=_format_features(features),
            knowledge_evidence=_format_knowledge_evidence(validation_results),
            contradictions=_format_contradictions(validation_results),
            suspicious_indicators=_format_suspicious(validation_results),
        )

        result: dict[str, Any] = {
            "status": "NOT_ATTEMPTED",
            "provider": "none",
            "model": "none",
        }

        try:
            from app.core.config import get_settings
            settings = get_settings()
            llm = get_llm_provider(settings)

            raw_response = llm.generate(prompt, system=REASONING_SYSTEM_PROMPT)

            # Robustly parse JSON - handles markdown fences, leading text, truncation
            import re

            def _extract_json(text: str) -> dict:
                # Strip markdown fences
                text = re.sub(r"```(?:json)?\s*", "", text, flags=re.IGNORECASE).strip()
                text = re.sub(r"```\s*$", "", text).strip()
                # Direct parse
                try:
                    return json.loads(text)
                except json.JSONDecodeError:
                    pass
                # Find first {...} block
                match = re.search(r"\{[\s\S]*\}", text)
                if match:
                    try:
                        return json.loads(match.group())
                    except json.JSONDecodeError:
                        fragment = match.group()
                        for suffix in ["}}", "}", '"}'  , '"}}']:
                            try:
                                return json.loads(fragment + suffix)
                            except json.JSONDecodeError:
                                continue
                raise json.JSONDecodeError("No valid JSON found in LLM response", text, 0)

            try:
                parsed = _extract_json(raw_response)
            except json.JSONDecodeError:
                logger.warning(
                    "[PIPELINE] application=%s stage=LLM_REASONING json_parse_failed raw=%.300s",
                    application.id, raw_response,
                )
                raise LLMProviderError(
                    f"LLM reasoning returned non-JSON response (len={len(raw_response)}): {raw_response[:150]}",
                    provider=settings.llm_provider,
                )

            # Validate against schema
            try:
                validated = LLMReasoningOutput.model_validate(parsed)
            except ValidationError as exc:
                logger.warning(
                    "[PIPELINE] application=%s stage=LLM_REASONING schema_validation_failed errors=%s",
                    application.id, exc.errors()[:3],
                )
                # Use raw parsed dict with defaults for missing fields
                validated = LLMReasoningOutput.model_validate({
                    **parsed,
                    "recommendation": parsed.get("recommendation", "REVIEW_REQUIRED"),
                    "confidence": min(1.0, max(0.0, float(parsed.get("confidence", 0.5)))),
                })

            duration_ms = round((time.monotonic() - started) * 1000)
            result = {
                "status": "COMPLETED",
                "provider": settings.llm_provider,
                "model": settings.llm_model,
                "summary": validated.summary,
                "key_findings": validated.key_findings,
                "risk_explanation": validated.risk_explanation,
                "score_explanation": validated.score_explanation,
                "validation_explanation": validated.validation_explanation,
                "missing_information": validated.missing_information,
                "clarification_questions": validated.clarification_questions,
                "recommendation": validated.recommendation,
                "llm_confidence": validated.confidence,
                "duration_ms": duration_ms,
                "note": "AI recommendation - Human decision required.",
            }

            logger.info(
                "[PIPELINE] application=%s stage=LLM_REASONING provider=%s model=%s "
                "recommendation=%s llm_confidence=%.2f status=COMPLETED duration_ms=%d",
                application.id, settings.llm_provider, settings.llm_model,
                validated.recommendation, validated.confidence, duration_ms,
            )

        except LLMProviderError as exc:
            duration_ms = round((time.monotonic() - started) * 1000)
            logger.warning(
                "[PIPELINE] application=%s stage=LLM_REASONING status=FAILED error=%s duration_ms=%d",
                application.id, exc.code, duration_ms,
            )
            result = {
                "status": "LLM_FAILED",
                "provider": getattr(exc, "provider", "unknown"),
                "error_code": exc.code,
                "error_message": exc.message,
                "duration_ms": duration_ms,
                "note": "AI recommendation unavailable. Human decision required.",
            }
        except Exception as exc:
            duration_ms = round((time.monotonic() - started) * 1000)
            logger.error(
                "[PIPELINE] application=%s stage=LLM_REASONING status=ERROR error=%s duration_ms=%d",
                application.id, exc, duration_ms,
            )
            result = {
                "status": "LLM_ERROR",
                "error_message": str(exc),
                "duration_ms": duration_ms,
                "note": "AI recommendation unavailable. Human decision required.",
            }

        audit_service.record(
            db,
            "LLM_RECOMMENDATION_GENERATED",
            application_id=application.id,
            actor_id="AI",
            payload={
                "stage": "LLM_REASONING",
                "status": result.get("status"),
                "provider": result.get("provider"),
                "model": result.get("model"),
                "recommendation": result.get("recommendation"),
                "llm_confidence": result.get("llm_confidence"),
                "version": "1.1",
            },
        )

        return result

    def _get(self, profile: dict[str, Any], path: str) -> Any:
        """Traverse dotted path in profile dict, resolving selected_value where present."""
        current: Any = profile
        for part in path.split("."):
            if not isinstance(current, dict):
                return None
            current = current.get(part)
        if isinstance(current, dict) and "selected_value" in current:
            return current.get("selected_value")
        return current


llm_reasoning_service = LLMReasoningService()
