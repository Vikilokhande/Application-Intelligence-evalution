export interface ApplicationSummary {
  id: string;
  scheme_id: string | null;
  external_reference: string | null;
  applicant_name: string | null;
  project_title: string | null;
  project_category: string | null;
  status: string;
  processing_status: string;
  ai_recommendation: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRead {
  id: string;
  application_id: string;
  filename: string;
  document_type: string;
  mime_type: string;
  file_path: string;
  uploaded_at: string;
  processing_status: string;
  extraction_status: string;
  validation_status: string;
  checksum: string;
  metadata_json: Record<string, unknown>;
  classification_confidence: number | null;
  classification_provider: string | null;
  ocr_provider: string | null;
  ocr_confidence: number | null;
  ocr_status: string | null;
}

export interface ValidationResult {
  id: string;
  validation_type: string;
  status: string;
  message: string;
  severity: string;
  evidence: Record<string, unknown>;
  created_at: string;
}

export interface RuleResult {
  id: string;
  rule_id: string;
  rule_name: string;
  result: string;
  expected_value: Record<string, unknown>;
  actual_value: Record<string, unknown>;
  reason: string;
  evidence: Record<string, unknown>;
  severity: string;
  created_at: string;
}

export interface PredictionRead {
  id: string;
  model_name: string;
  model_version: string;
  quality_score: number | null;
  risk_score: number | null;
  confidence: number;
  prediction_class: string;
  feature_contributions: Record<string, number>;
  /** LOW_RISK / MEDIUM_RISK / HIGH_RISK class probabilities from XGBoost */
  class_probabilities?: Record<string, number>;
  status: string;
  feature_version: string;
  policy_version: string;
  provider: string;
  /** ML_READY | BASELINE_FALLBACK | UNAVAILABLE */
  model_status?: string;
  created_at: string;
}

export interface EvidenceRead {
  id: string;
  application_id: string;
  document_id: string | null;
  finding_type: string;
  source: string;
  locator: string | null;
  field_name: string | null;
  extracted_value: string | null;
  confidence: number;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  form_data: Record<string, unknown>;
  documents: DocumentRead[];
  validation_results: ValidationResult[];
  rule_results: RuleResult[];
  evidence: EvidenceRead[];
  predictions: PredictionRead[];
  latest_profile: Record<string, unknown> | null;
  latest_features: Record<string, number> | null;
  latest_decision: Record<string, unknown> | null;
  reviewer_assignment: Record<string, unknown> | null;
  audit_trail: Array<Record<string, unknown>>;
}

export interface FeedbackRead {
  id: string;
  application_id: string;
  reviewer_id: string;
  feedback_type: string;
  comment: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export interface SchemeRule {
  id: string;
  scheme_id: string;
  rule_id: string;
  rule_name: string;
  rule_type: string;
  condition: Record<string, unknown>;
  severity: string;
  active: boolean;
  created_at: string;
}

export interface SchemeRead {
  id: string;
  code: string;
  name: string;
  description: string | null;
  configuration: Record<string, unknown>;
  active: boolean;
  created_at: string;
  rules: SchemeRule[];
}

export interface AnalyticsOverview {
  total_applications: number;
  applications_by_status: Record<string, number>;
  average_processing_time_hours: number | null;
  average_review_time_hours: number | null;
  decision_distribution: Record<string, number>;
  score_distribution: Record<string, number>;
  risk_distribution: Record<string, number>;
  reviewer_workload: Record<string, number>;
  reviewer_performance: Record<string, Record<string, number>>;
  rule_failure_frequency: Record<string, number>;
  suspicious_application_count: number;
  scheme_statistics: Record<string, number>;
  document_processing_statistics: Record<string, number>;
  ocr_usage: Record<string, number>;
  llm_usage: Record<string, number>;
  routing_distribution: Record<string, number>;
  validation_failure_frequency: Record<string, number>;
}

export interface WorkflowResponse {
  graph_available: boolean;
  nodes: string[];
  state: Record<string, unknown>;
}

export interface KnowledgeResult {
  source: string;
  scheme: string;
  chunk_id: string;
  score: number;
  text: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: string;
}
