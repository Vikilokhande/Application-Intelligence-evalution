import type {
  AuthTokenResponse,
  AnalyticsOverview,
  ApplicationDetail,
  ApplicationSummary,
  EvidenceRead,
  FeedbackRead,
  KnowledgeResult,
  PredictionRead,
  SchemeRead,
  SchemeRule,
  ValidationResult,
  WorkflowResponse
} from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";
const TOKEN_STORAGE_KEY = "application_intelligence_token";

let authToken = localStorage.getItem(TOKEN_STORAGE_KEY);

function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (authToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${authToken}`);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers
  });
  if (!response.ok) {
    // Try to parse a structured FastAPI error body: { detail: string | { code, message } }
    let message = response.statusText;
    try {
      const body = await response.json() as { detail?: string | { code?: string; message?: string } };
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (body.detail && typeof body.detail === "object") {
        message = body.detail.message ?? body.detail.code ?? JSON.stringify(body.detail);
      }
    } catch {
      // JSON parse failed — try raw text
      try {
        const text = await response.text();
        if (text) message = text;
      } catch { /* ignore */ }
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export const api = {
  setAuthToken,
  getToken: async (userId: string, role: string) => {
    const token = await request<AuthTokenResponse>(
      `/auth/token?user_id=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`,
      { method: "POST" }
    );
    setAuthToken(token.access_token);
    return token;
  },
  getCurrentUser: () => request<{ user_id: string; role: string }>("/auth/me"),
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
  createScheme: (payload: Record<string, unknown>) =>
    request<SchemeRead>("/schemes", { method: "POST", body: JSON.stringify(payload) }),
  createRule: (schemeId: string, payload: Record<string, unknown>) =>
    request<SchemeRule>(`/schemes/${schemeId}/rules`, { method: "POST", body: JSON.stringify(payload) }),
  deleteRule: (schemeId: string, ruleId: string) =>
    request<{ status: string; id: string }>(`/schemes/${schemeId}/rules/${ruleId}`, { method: "DELETE" }),
  deleteDocument: (documentId: string) =>
    request<{ status: string; id: string }>(`/documents/${documentId}`, { method: "DELETE" }),
  deleteApplication: (applicationId: string) =>
    request<{ status: string; id: string }>(`/applications/${applicationId}`, { method: "DELETE" }),
  searchKnowledge: (query: string) =>
    request<KnowledgeResult[]>(
      `/knowledge/search?q=${encodeURIComponent(query)}`
    )
};

