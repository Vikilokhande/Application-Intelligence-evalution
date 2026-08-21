from typing import Any, TypedDict


class ApplicationProcessingState(TypedDict, total=False):
    application_id: str
    document_ids: list[str]
    extracted_data: list[dict[str, Any]]
    normalized_profile: dict[str, Any]
    validation_results: list[dict[str, Any]]
    rule_results: list[dict[str, Any]]
    features: dict[str, float]
    ml_prediction: dict[str, Any]
    llm_reasoning: dict[str, Any]          # post-scoring LLM advisory reasoning
    explanations: dict[str, Any]
    evidence: list[dict[str, Any]]
    routing_result: dict[str, Any]
    review_status: str
    human_decision: dict[str, Any] | None
    errors: list[dict[str, Any]]
    current_node: str


WORKFLOW_NODES = [
    "INGEST",
    "CLASSIFY",
    "EXTRACT",
    "NORMALIZE",
    "VALIDATE",
    "RULE_EVALUATION",
    "FEATURE_ENGINEERING",
    "ML_SCORING",
    "LLM_REASONING",        # Post-scoring LLM advisory reasoning stage
    "EXPLAIN",
    "ROUTE",
    "HUMAN_REVIEW",
    "RECORD_DECISION",
]


def initial_state(application_id: str, document_ids: list[str]) -> ApplicationProcessingState:
    return {
        "application_id": application_id,
        "document_ids": document_ids,
        "extracted_data": [],
        "normalized_profile": {},
        "validation_results": [],
        "rule_results": [],
        "features": {},
        "ml_prediction": {},
        "llm_reasoning": {},
        "explanations": {},
        "evidence": [],
        "routing_result": {},
        "review_status": "NOT_STARTED",
        "human_decision": None,
        "errors": [],
        "current_node": "INGEST",
    }
