import { useCallback, useEffect, useMemo, useState } from "react";
import { Shell, type PageKey } from "./layouts/Shell";
import { Analytics } from "./pages/Analytics";
import { ApplicationDetails } from "./pages/ApplicationDetails";
import { ApplicationProcessing } from "./pages/ApplicationProcessing";
import { AuditTrail } from "./pages/AuditTrail";
import { Dashboard } from "./pages/Dashboard";
import { NewApplication } from "./pages/NewApplication";
import { ReviewerWorkspace } from "./pages/ReviewerWorkspace";
import { SchemeRules } from "./pages/SchemeRules";
import { ScoringExplainability } from "./pages/ScoringExplainability";
import { ValidationVerification } from "./pages/ValidationVerification";
import { LoginPage } from "./pages/LoginPage";
import { LandingPage } from "./pages/LandingPage";
import { api } from "./services/api";
import type { AnalyticsOverview, ApplicationDetail, ApplicationSummary, SchemeRead, WorkflowResponse } from "./types/api";

export default function App() {
  // Session Persistence: Read stored session on load
  const [userSession, setUserSession] = useState<{ email: string; role: string } | null>(() => {
    try {
      const saved = localStorage.getItem("app_user_session");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Landing page is the default entry point for all visitors
  const [page, setPage] = useState<PageKey>("landing");
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [schemes, setSchemes] = useState<SchemeRead[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedTitle = useMemo(() => detail?.project_title ?? applications.find((item) => item.id === selectedId)?.project_title ?? null, [applications, detail, selectedId]);

  const refreshLists = useCallback(async () => {
    if (!userSession) return;
    const [apps, schemeList, overview] = await Promise.all([api.listApplications(), api.schemes(), api.analytics()]);
    setApplications(apps);
    setSchemes(schemeList);
    setAnalytics(overview);
    if (!selectedId && apps[0]) {
      setSelectedId(apps[0].id);
    }
  }, [selectedId, userSession]);

  const refreshDetail = useCallback(
    async (id: string | null = selectedId) => {
      if (!id || !userSession) {
        setDetail(null);
        setWorkflow(null);
        return;
      }
      const [nextDetail, nextWorkflow] = await Promise.all([api.getApplication(id), api.getWorkflow(id)]);
      setDetail(nextDetail);
      setWorkflow(nextWorkflow);
    },
    [selectedId, userSession]
  );

  useEffect(() => {
    if (userSession) {
      refreshLists().catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load data"));
    }
  }, [refreshLists, userSession]);

  useEffect(() => {
    if (userSession && selectedId) {
      refreshDetail().catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load application"));
    }
  }, [refreshDetail, selectedId, userSession]);

  useEffect(() => {
    if (page === "review" && selectedId && userSession) {
      api.recordReviewOpened(selectedId).catch(() => undefined);
    }
  }, [page, selectedId, userSession]);

  function handleLogin(user: { email: string; role: string }) {
    setUserSession(user);
    try {
      localStorage.setItem("app_user_session", JSON.stringify(user));
    } catch {}
    setPage("dashboard");
  }

  function handleLogout() {
    setUserSession(null);
    try {
      localStorage.removeItem("app_user_session");
    } catch {}
    setPage("landing");
  }

  function handleLaunchControlRoom() {
    if (!userSession) {
      setPage("login");
    } else {
      setPage("dashboard");
    }
  }

  async function selectApplication(id: string) {
    setSelectedId(id);
    setPage("details");
    await refreshDetail(id);
  }

  async function createApplication(payload: Record<string, unknown>, files: FileList | null) {
    setBusy(true);
    setError(null);
    try {
      const created = await api.createApplication(payload);
      if (files) {
        for (const file of Array.from(files)) {
          await api.uploadDocument(created.id, file, "");
        }
      }
      setSelectedId(created.id);
      await refreshLists();
      await refreshDetail(created.id);
      setPage("processing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create application failed");
    } finally {
      setBusy(false);
    }
  }

  async function processSelected() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await api.processApplication(selectedId);
      await refreshLists();
      await refreshDetail(selectedId);
      setPage("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitDecision(payload: Record<string, unknown>) {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await api.submitReview(selectedId, payload);
      await refreshLists();
      await refreshDetail(selectedId);
      setPage("audit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision submission failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitFeedback(payload: Record<string, unknown>) {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await api.createFeedback(selectedId, payload);
      await refreshDetail(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Feedback submission failed");
    } finally {
      setBusy(false);
    }
  }

  async function createRule(schemeId: string, payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      await api.createRule(schemeId, payload);
      await refreshLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rule creation failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRule(schemeId: string, ruleId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteRule(schemeId, ruleId);
      await refreshLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rule deletion failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteDocument(documentId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteDocument(documentId);
      if (selectedId) {
        await refreshDetail(selectedId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Document deletion failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteApplication(applicationId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.deleteApplication(applicationId);
      if (selectedId === applicationId) {
        setSelectedId(null);
        setDetail(null);
      }
      await refreshLists();
      setPage("dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application deletion failed");
    } finally {
      setBusy(false);
    }
  }

  // Public Landing Page view (unauthenticated or explicit landing)
  if (page === "landing") {
    return <LandingPage onLaunchControlRoom={handleLaunchControlRoom} />;
  }

  // Full-Screen Login Page view
  if (!userSession || page === "login") {
    return <LoginPage onLoginSuccess={handleLogin} onBack={() => setPage("landing")} />;
  }

  return (
    <Shell page={page} onPageChange={setPage} selectedTitle={selectedTitle} userSession={userSession} onLogout={handleLogout}>
      {error && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-[8px] border border-[#D9534F]/50 bg-[#D9534F]/10 px-4 py-3 font-mono text-xs text-[#E8EDF1]">
          <div className="flex items-start gap-2 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D9534F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <span className="text-[#E8EDF1] leading-relaxed">{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="shrink-0 text-[#8B99A6] hover:text-[#E8EDF1] transition-colors font-bold text-sm leading-none"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      {page === "dashboard" && <Dashboard applications={applications} analytics={analytics} onSelect={selectApplication} />}
      {page === "new" && <NewApplication schemes={schemes} onCreate={createApplication} />}
      {page === "processing" && <ApplicationProcessing detail={detail} workflow={workflow} busy={busy} onProcess={processSelected} />}
      {page === "details" && <ApplicationDetails detail={detail} onDecision={submitDecision} busy={busy} onDeleteDocument={deleteDocument} onDeleteApplication={deleteApplication} />}
      {page === "validation" && <ValidationVerification detail={detail} />}
      {page === "scoring" && <ScoringExplainability detail={detail} workflow={workflow} />}
      {page === "review" && <ReviewerWorkspace detail={detail} onDecision={submitDecision} onFeedback={submitFeedback} busy={busy} />}
      {page === "audit" && <AuditTrail detail={detail} />}
      {page === "schemes" && <SchemeRules schemes={schemes} onCreateRule={createRule} onDeleteRule={deleteRule} />}
      {page === "analytics" && <Analytics analytics={analytics} />}
    </Shell>
  );
}
