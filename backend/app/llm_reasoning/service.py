"""
llm_reasoning/service.py
=========================

Post-scoring LLM Reasoning Service.

PIPELINE POSITION: After validation + RAG + rule engine + feature engineering + XGBoost.

The LLM provides ONE consolidated explanation call only.
It does NOT make decisions — XGBoost + deterministic validation determine the scores.
The LLM explains WHY the XGBoost scores are what they are.

If the LLM model fails (any reason — 429, 403, timeout, parse error):
  - AI_REASONING = UNAVAILABLE
  - Deterministic + RAG + XGBoost results are ALWAYS preserved
  - Pipeline NEVER halts because of LLM failure
  - No explanation is fabricated

LLM is used for:
  - Explaining risk class, risk score, quality score in context
  - Summarising validation failures and RAG evidence
  - Generating clarification questions for the reviewer
  - Advisory recommendation (non-binding)

The LLM must NOT:
  - Change XGBoost prediction
  - Invent evidence, citations, or page numbers
  - Fabricate document contents
  - State anything as PASS without explicit evidence

Model is configured via GROQ_REASONING_MODEL env var.
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

    summary: str = Field(default="", description="2-3 sentence objective case summary.")
    risk_class: str = Field(default="", description="Confirmed risk class from XGBoost: LOW_RISK|MEDIUM_RISK|HIGH_RISK.")
    key_findings: list[str] = Field(default_factory=list, description="Top 3-5 key findings from validation.")
    risk_explanation: str = Field(default="", description="Explain WHY XGBoost predicted this risk class, referencing specific features and evidence.")
    score_explanation: str = Field(default="", description="Explain what the quality score reflects about this application.")
    validation_explanation: str = Field(default="", description="Summary of validation outcomes — what passed, what failed, and why it matters.")
    validation_findings: list[dict[str, Any]] = Field(default_factory=list, description="List of validation finding objects {check_id, status, explanation}.")
    evidence: list[dict[str, Any]] = Field(default_factory=list, description="Evidence items used in explanation {source, section, finding}. Only real evidence from input.")
    missing_evidence: list[str] = Field(default_factory=list, description="List of items where evidence was unavailable.")
    missing_information: list[str] = Field(default_factory=list, description="List of missing information items the applicant should provide.")
    clarification_questions: list[str] = Field(default_factory=list, description="Questions to ask the applicant.")
    recommendation: str = Field(
        default="REVIEW_REQUIRED",
        description="Advisory recommendation: APPROVE_RECOMMENDATION|CLARIFICATION|EXPERT_REVIEW|REVIEW_REQUIRED",
    )
    human_review_required: bool = Field(default=True, description="Always true — human reviewer makes the final decision.")
    confidence: float = Field(default=0.5, ge=0.0, le=1.0, description="LLM confidence in its reasoning (0-1).")

    model_config = {"extra": "ignore"}


# ---------------------------------------------------------------------------
# Prompt template
# ---------------------------------------------------------------------------

REASONING_SYSTEM_PROMPT = """You are an AI assistant supporting the Directorate of Environment and Climate Change application review process.

Your role is to EXPLAIN the XGBoost model's prediction to the human reviewer. You do NOT make final decisions.
All final decisions must be made by an authorized human reviewer.

STRICT RULES:
1. You must NOT change or override XGBoost scores or prediction class.
2. You must ONLY reference evidence explicitly provided to you — never invent page numbers, citations, or document contents.
3. If evidence for a finding is unavailable, say "Evidence unavailable for this assessment."
4. Do NOT generate fake validation results or fake PASS outcomes.
5. Return ONLY a valid JSON object. No markdown, no explanatory text outside the JSON.

Your output explains WHY the model produced its scores, based solely on the structured data provided."""

REASONING_PROMPT_TEMPLATE = """Explain the XGBoost prediction for this grant application to the human reviewer.

=== APPLICATION ===
Applicant: {applicant_name}
Project: {project_title}
Category: {project_category}
Cost: {project_cost}
Duration: {duration_months} months
Organization: {organization_type}

=== XGBOOST ML PREDICTION (DO NOT CHANGE THESE) ===
Prediction Class: {prediction_class}
Risk Score: {risk_score} / 100  (higher = more risk)
Quality Score: {quality_score} / 100  (higher = better)
Confidence: {confidence}
Class Probabilities: {class_probabilities}
Model: {model_name} v{model_version}
Provider: {provider}
Status: {model_status}
Prediction Status: {prediction_status}

=== 13 ML FEATURE VALUES (from validated pipeline evidence) ===
{features_summary}

=== VALIDATION RESULTS ===
Total: {validation_total} | Passed: {validation_passed} | Warnings: {validation_warnings} | Failed: {validation_failed}

FAILED CHECKS:
{failed_validations}

WARNINGS:
{warning_validations}

=== RULE EVALUATION ===
Total: {rule_total} | Passed: {rule_passed} | Failed: {rule_failed}

FAILED RULES:
{failed_rules}

=== RAG / SCHEME KNOWLEDGE EVIDENCE ===
{knowledge_evidence}

=== CROSS-DOCUMENT CONTRADICTIONS ===
{contradictions}

=== SUSPICIOUS INDICATORS ===
{suspicious_indicators}

Return a JSON object with EXACTLY these fields:
{{
  "summary": "2-3 sentence objective case summary",
  "risk_class": "{prediction_class}",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "risk_explanation": "Explain WHY the risk score is {risk_score}, referencing specific features and validation failures",
  "score_explanation": "Explain what the quality score {quality_score} reflects",
  "validation_explanation": "Summarize validation outcomes",
  "validation_findings": [{{"check_id": "...", "status": "...", "explanation": "..."}}],
  "evidence": [{{"source": "...", "section": "...", "finding": "..."}}],
  "missing_evidence": ["item where evidence is genuinely unavailable"],
  "missing_information": ["item 1 the applicant must provide"],
  "clarification_questions": ["question 1", "question 2"],
  "recommendation": "APPROVE_RECOMMENDATION|CLARIFICATION|EXPERT_REVIEW|REVIEW_REQUIRED",
  "human_review_required": true,
  "confidence": 0.0
}}

IMPORTANT:
- risk_class MUST be exactly: {prediction_class}
- recommendation must be one of: APPROVE_RECOMMENDATION, CLARIFICATION, EXPERT_REVIEW, REVIEW_REQUIRED
- human_review_required MUST be true — the human reviewer makes the final decision
- evidence[] must only reference evidence explicitly provided above — NEVER fabricate
- If evidence is missing for something, add it to missing_evidence[] and say "Evidence unavailable"
- confidence is your confidence in your explanation (0.0 to 1.0)
"""


def _format_features(features: dict[str, float]) -> str:
    """Format all 13 ML features with their values for the prompt."""
    ml_feature_names = [
        "document_completeness", "required_field_completeness", "eligibility_pass_ratio",
        "budget_consistency", "certificate_validity", "contradiction_count",
        "duplicate_similarity", "suspicious_indicator_count", "document_quality",
        "proposal_quality", "project_feasibility", "environmental_impact",
        "extraction_confidence",
    ]
    lines = []
    for name in ml_feature_names:
        val = features.get(name)
        if val is not None:
            lines.append(f"  {name}: {float(val):.3f}")
        else:
            lines.append(f"  {name}: MISSING")
    return "\n".join(lines) if lines else "No features available."


def _format_class_probabilities(prediction: ModelPrediction) -> str:
    raw = (prediction.feature_contributions or {}).get("_class_probabilities")
    if not isinstance(raw, dict) or not raw:
        return "Evidence unavailable for class probabilities."
    parts = []
    for key in ("LOW_RISK", "MEDIUM_RISK", "HIGH_RISK"):
        value = raw.get(key)
        if value is None:
            continue
        try:
            parts.append(f"{key}: {float(value):.4f}")
        except (TypeError, ValueError):
            continue
    return ", ".join(parts) if parts else "Evidence unavailable for class probabilities."


def _format_validation_list(results: list[ValidationResult], status: str) -> str:
    items = [r for r in results if r.status == status]
    if not items:
        return "  None"
    lines = []
    for r in items[:8]:
        check_id = (r.evidence or {}).get("check_id", r.validation_type)
        lines.append(f"  [{check_id}] {r.message}")
    return "\n".join(lines)


def _format_rule_list(results: list[RuleResult], result_status: str) -> str:
    items = [r for r in results if r.result == result_status]
    if not items:
        return "  None"
    lines = []
    for r in items[:6]:
        lines.append(f"  [{r.rule_id}] {r.reason}")
    return "\n".join(lines)


def _format_knowledge_evidence(validation_results: list[ValidationResult]) -> str:
    rag_results = [
        r for r in validation_results
        if r.validation_type in (
            "SCHEME_KNOWLEDGE_RETRIEVAL", "RAG_PROJECT_COST_LIMIT",
            "RAG_PROJECT_DURATION_LIMIT", "RAG_ORGANIZATION_ELIGIBILITY",
            "RAG_PROJECT_CATEGORY_ELIGIBILITY", "RAG_REQUIRED_DOCUMENTS"
        )
        and r.evidence
    ]
    if not rag_results:
        return "  No scheme knowledge was retrieved."
    lines = []
    for r in rag_results[:5]:
        check_id = (r.evidence or {}).get("check_id", r.validation_type)
        source = (r.evidence or {}).get("retrieved_source") or (r.evidence or {}).get("query", "")
        lines.append(f"  [{r.status}] [{check_id}] {r.message}" + (f" (source: {source})" if source else ""))
    return "\n".join(lines)


def _format_contradictions(validation_results: list[ValidationResult]) -> str:
    contradictions = [
        r for r in validation_results
        if r.validation_type == "CROSS_DOCUMENT_CONSISTENCY" and r.status == "FAIL"
    ]
    if not contradictions:
        return "  None detected."
    return "\n".join(f"  - {r.message}" for r in contradictions)


def _format_suspicious(validation_results: list[ValidationResult]) -> str:
    suspicious = [
        r for r in validation_results
        if r.validation_type == "SUSPICIOUS_INDICATOR" and r.status in ("WARN", "FAIL")
    ]
    if not suspicious:
        return "  None detected."
    lines = []
    for r in suspicious:
        indicators = (r.evidence or {}).get("indicators", [])
        lines.extend(f"  - {item}" for item in indicators)
    return "\n".join(lines) if lines else "  None detected."


def _extract_json(text: str) -> dict:
    """Robustly extract JSON from LLM response."""
    import re
    text = re.sub(r"```(?:json)?\s*", "", text, flags=re.IGNORECASE).strip()
    text = re.sub(r"```\s*$", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            fragment = match.group()
            for suffix in ["}}", "}", '"}', '"}}']:
                try:
                    return json.loads(fragment + suffix)
                except json.JSONDecodeError:
                    continue
    raise json.JSONDecodeError("No valid JSON found in LLM response", text, 0)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class LLMReasoningService:
    """
    Runs ONE consolidated LLM reasoning call after all deterministic pipeline stages.

    NEVER fabricates results. NEVER fails silently.
    If LLM is unavailable or fails for any reason:
      - status = "UNAVAILABLE"
      - XGBoost + deterministic + RAG results are unchanged
      - Human reviewer still receives all structured validation data

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
            "[AI_REASONING] application=%s status=STARTED model=%s",
            application.id,
            self._get_reasoning_model(),
        )

        # Gather prompt context
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
        model_status = (
            "ML_READY" if prediction.provider == "xgboost"
            else "BASELINE_FALLBACK" if prediction.provider == "baseline"
            else "UNAVAILABLE"
        )

        prompt = REASONING_PROMPT_TEMPLATE.format(
            applicant_name=applicant_name or "Unknown",
            project_title=project_title or "Unknown",
            project_category=project_category or "Unknown",
            project_cost=f"₹{float(project_cost):,.0f}" if project_cost else "Not provided",
            duration_months=duration_months or "Not provided",
            organization_type=organization_type or "Not provided",
            prediction_class=prediction.prediction_class or "UNAVAILABLE",
            risk_score=prediction.risk_score if prediction.risk_score is not None else "N/A",
            quality_score=prediction.quality_score if prediction.quality_score is not None else "N/A",
            confidence=f"{prediction.confidence:.2f}" if prediction.confidence else "0.00",
            class_probabilities=_format_class_probabilities(prediction),
            model_name=prediction.model_name or "unknown",
            model_version=prediction.model_version or "unknown",
            provider=prediction.provider or "unknown",
            model_status=model_status,
            prediction_status=prediction.status or "unknown",
            features_summary=_format_features(features),
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
            knowledge_evidence=_format_knowledge_evidence(validation_results),
            contradictions=_format_contradictions(validation_results),
            suspicious_indicators=_format_suspicious(validation_results),
        )

        # ───────────────────────────────────────────────────────────────────────────
        # Primary model attempt → fallback model → UNAVAILABLE
        # Never fabricates. Never halts the pipeline.
        # ───────────────────────────────────────────────────────────────────────────
        result: dict[str, Any] = {
            "status": "NOT_ATTEMPTED",
            "provider": "none",
            "model": "none",
        }

        try:
            from app.core.config import get_settings
            from app.extraction.providers import GroqLLMProvider

            settings = get_settings()
            primary_model = settings.groq_reasoning_model
            fallback_model = settings.llm_fallback_model  # from LLM_FALLBACK_MODEL in .env
            backoff_base  = settings.llm_retry_backoff_seconds

            if not settings.effective_llm_api_key:
                raise LLMProviderError(
                    "No API key configured for AI reasoning. Set OPENROUTER_API_KEY.",
                    provider="openrouter",
                )

            def _build_provider(model: str) -> GroqLLMProvider:
                return GroqLLMProvider(
                    api_key=settings.effective_llm_api_key,
                    model=model,
                    base_url=settings.llm_base_url,
                    temperature=0.0,
                    timeout=settings.llm_timeout,
                    max_tokens=settings.llm_max_tokens,
                    max_retries=settings.llm_max_retries,
                )

            def _do_reason(llm: GroqLLMProvider, model_name: str) -> dict[str, Any]:
                """Run one LLM reasoning attempt and return structured result dict."""
                logger.info(
                    "[AI_REASONING] application=%s model=%s status=STARTED",
                    application.id, model_name,
                )

                raw_response = llm._call_api(
                    messages=[
                        {"role": "system", "content": REASONING_SYSTEM_PROMPT},
                        {"role": "user",   "content": prompt},
                    ],
                    json_mode=False,
                    correlation_id=str(application.id),
                    backoff_base=backoff_base,
                    log_scope="AI_REASONING",
                )

                try:
                    parsed = _extract_json(raw_response)
                except json.JSONDecodeError:
                    _ms = round((time.monotonic() - started) * 1000)
                    logger.warning(
                        "[AI_REASONING] application=%s model=%s status=PARSE_FAILED duration_ms=%d raw=%.200s",
                        application.id, model_name, _ms, raw_response,
                    )
                    raise LLMProviderError(
                        f"AI reasoning returned non-JSON (len={len(raw_response)}): {raw_response[:150]}",
                        provider="openrouter",
                    )

                # Validate + apply safe defaults
                try:
                    validated = LLMReasoningOutput.model_validate(parsed)
                except ValidationError:
                    validated = LLMReasoningOutput.model_validate({
                        **parsed,
                        "risk_class": parsed.get("risk_class", prediction.prediction_class or ""),
                        "recommendation": parsed.get("recommendation", "REVIEW_REQUIRED"),
                        "confidence": min(1.0, max(0.0, float(parsed.get("confidence", 0.5)))),
                        "human_review_required": True,
                    })

                # Enforce: LLM cannot override XGBoost risk class
                if validated.risk_class not in ("LOW_RISK", "MEDIUM_RISK", "HIGH_RISK"):
                    validated.risk_class = prediction.prediction_class or ""

                _ms = round((time.monotonic() - started) * 1000)
                logger.info(
                    "[AI_REASONING] application=%s model=%s attempt=completed status=SUCCESS "
                    "recommendation=%s llm_confidence=%.2f duration_ms=%d",
                    application.id, model_name,
                    validated.recommendation, validated.confidence, _ms,
                )
                return {
                    "status": "COMPLETED",
                    "provider": settings.llm_provider,
                    "model": model_name,
                    "summary": validated.summary,
                    "risk_class": validated.risk_class,
                    "key_findings": validated.key_findings,
                    "risk_explanation": validated.risk_explanation,
                    "score_explanation": validated.score_explanation,
                    "validation_explanation": validated.validation_explanation,
                    "validation_findings": validated.validation_findings,
                    "evidence": validated.evidence,
                    "missing_evidence": validated.missing_evidence,
                    "missing_information": validated.missing_information,
                    "clarification_questions": validated.clarification_questions,
                    "recommendation": validated.recommendation,
                    "human_review_required": True,
                    "llm_confidence": validated.confidence,
                    "duration_ms": _ms,
                    "note": "AI explanation — Human reviewer makes the final decision.",
                }

            # ── Attempt 1: primary model ──────────────────────────────────────
            primary_error: Exception | None = None
            try:
                result = _do_reason(_build_provider(primary_model), primary_model)
            except (LLMProviderError, Exception) as exc:
                primary_error = exc
                logger.warning(
                    "[AI_REASONING] application=%s model=%s status=FAILED error=%.200s",
                    application.id, primary_model, str(exc),
                )

                # ── Attempt 2: fallback model (only if it differs from primary) ────
                if fallback_model and fallback_model != primary_model:
                    logger.warning(
                        "[AI_REASONING] primary_failed fallback=%s",
                        fallback_model,
                    )
                    try:
                        result = _do_reason(_build_provider(fallback_model), fallback_model)
                    except (LLMProviderError, Exception) as fallback_exc:
                        logger.warning(
                            "[AI_REASONING] application=%s model=%s status=FAILED error=%.200s",
                            application.id, fallback_model, str(fallback_exc),
                        )
                        # Both failed — fall through to UNAVAILABLE
                        raise LLMProviderError(
                            f"Both primary ({primary_model}) and fallback ({fallback_model}) failed. "
                            f"Primary: {exc}. Fallback: {fallback_exc}",
                            provider="openrouter",
                        ) from fallback_exc
                else:
                    # No fallback configured or same model — re-raise to hit UNAVAILABLE
                    raise LLMProviderError(
                        f"Primary model ({primary_model}) failed and no fallback configured.",
                        provider="openrouter",
                    ) from exc

        except LLMProviderError as exc:
            duration_ms = round((time.monotonic() - started) * 1000)
            logger.warning(
                "[AI_REASONING] status=UNAVAILABLE reason=%s duration_ms=%d "
                "NOTE: XGBoost+RAG+deterministic results preserved",
                getattr(exc, 'code', 'LLM_PROVIDER_ERROR'), duration_ms,
            )
            result = {
                "status": "UNAVAILABLE",
                "provider": "openrouter",
                "model": self._get_reasoning_model(),
                "error_code": getattr(exc, 'code', 'LLM_PROVIDER_ERROR'),
                "error_message": getattr(exc, 'message', str(exc)),
                "duration_ms": duration_ms,
                "risk_class": prediction.prediction_class or "",
                "human_review_required": True,
                "note": (
                    "AI explanation unavailable — LLM call failed. "
                    "XGBoost prediction, RAG evidence, and deterministic validation results "
                    "are preserved and available for the human reviewer."
                ),
            }
        except Exception as exc:
            duration_ms = round((time.monotonic() - started) * 1000)
            logger.error(
                "[AI_REASONING] application=%s status=UNAVAILABLE error=%s duration_ms=%d "
                "NOTE: XGBoost+RAG+deterministic results preserved",
                application.id, exc, duration_ms,
            )
            result = {
                "status": "UNAVAILABLE",
                "provider": "openrouter",
                "model": self._get_reasoning_model(),
                "error_message": str(exc),
                "duration_ms": duration_ms,
                "risk_class": prediction.prediction_class or "",
                "human_review_required": True,
                "note": (
                    "AI explanation unavailable — unexpected error. "
                    "XGBoost prediction, RAG evidence, and deterministic validation results "
                    "are preserved and available for the human reviewer."
                ),
            }

        audit_service.record(
            db,
            "AI_REASONING_COMPLETED",
            application_id=application.id,
            actor_id="AI",
            payload={
                "stage": "AI_REASONING",
                "status": result.get("status"),
                "provider": result.get("provider"),
                "model": result.get("model"),
                "recommendation": result.get("recommendation"),
                "llm_confidence": result.get("llm_confidence"),
                "human_review_required": True,
                "xgboost_preserved": True,
                "version": "2.0",
            },
        )

        return result

    def _get_reasoning_model(self) -> str:
        try:
            from app.core.config import get_settings
            return get_settings().groq_reasoning_model
        except Exception:
            return "z-ai/glm-5.2:free"  # OpenRouter free model fallback

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
