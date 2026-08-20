import type {
  AnalyticsOverview,
  ApplicationDetail,
  ApplicationSummary,
  EvidenceRead,
  FeedbackRead,
  PredictionRead,
  SchemeRead,
  SchemeRule,
  ValidationResult,
  WorkflowResponse
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: init?.body instanceof FormData ? undefined : { "Content-Type": "application/json" },
    ...init
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  return (await response.json()) as T;
}

export const api = {
  listApplications: () => request<ApplicationSummary[]>("/applications"),
  createApplication: (payload: Record<string, unknown>) =>
    request<ApplicationSummary>("/applications", { method: "POST", body: JSON.stringify(payload) }),
  uploadDocument: (applicationId: string, file: File, documentType: string) => {
    const formData = new FormData();
    formData.append("file", file);
    if (documentType) {
      formData.append("document_type", documentType);
    }
    return request(`/applications/${applicationId}/documents`, { method: "POST", body: formData });
  },
  processApplication: (applicationId: string) =>
    request<Record<string, unknown>>(`/applications/${applicationId}/process`, { method: "POST" }),
  getApplication: (applicationId: string) => request<ApplicationDetail>(`/applications/${applicationId}`),
  getValidation: (applicationId: string) => request<ValidationResult[]>(`/applications/${applicationId}/validation`),
  getScore: (applicationId: string) => request<PredictionRead | null>(`/applications/${applicationId}/score`),
  getEvidence: (applicationId: string) => request<EvidenceRead[]>(`/applications/${applicationId}/evidence`),
  getWorkflow: (applicationId: string) => request<WorkflowResponse>(`/applications/${applicationId}/workflow`),
  recordReviewOpened: (applicationId: string) =>
    request(`/applications/${applicationId}/review/open`, { method: "POST" }),
  submitReview: (applicationId: string, payload: Record<string, unknown>) =>
    request(`/applications/${applicationId}/review`, { method: "POST", body: JSON.stringify(payload) }),
  requestClarification: (applicationId: string, message: string) =>
    request(`/applications/${applicationId}/clarification`, {
      method: "POST",
      body: JSON.stringify({ reviewer_id: "demo-reviewer", message })
    }),
  createFeedback: (applicationId: string, payload: Record<string, unknown>) =>
    request<FeedbackRead>(`/applications/${applicationId}/feedback`, { method: "POST", body: JSON.stringify(payload) }),
  listFeedback: (applicationId: string) => request<FeedbackRead[]>(`/applications/${applicationId}/feedback`),
  analytics: () => request<AnalyticsOverview>("/analytics/overview"),
  schemes: () => request<SchemeRead[]>("/schemes"),
  createRule: (schemeId: string, payload: Record<string, unknown>) =>
    request<SchemeRule>(`/schemes/${schemeId}/rules`, { method: "POST", body: JSON.stringify(payload) }),
  searchKnowledge: (query: string) =>
    request<Array<{ document: string; content: string; score?: number; source?: string }>>(
      `/knowledge/search?q=${encodeURIComponent(query)}`
    )
};

