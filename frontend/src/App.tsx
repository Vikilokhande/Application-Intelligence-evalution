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

  // Login is the DEFAULT 1st Entry Point if unauthenticated
  const [page, setPage] = useState<PageKey>(() => (userSession ? "dashboard" : "login"));
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
    setPage("login");
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

  // 1st Entry Point Guard: Unauthenticated users or "login" page render Full-Screen Login Page
  if (!userSession || page === "login") {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  return (
    <Shell page={page} onPageChange={setPage} selectedTitle={selectedTitle} userSession={userSession} onLogout={handleLogout}>
      {error && (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      {page === "dashboard" && <Dashboard applications={applications} analytics={analytics} onSelect={selectApplication} />}
      {page === "new" && <NewApplication schemes={schemes} onCreate={createApplication} />}
      {page === "processing" && <ApplicationProcessing detail={detail} workflow={workflow} busy={busy} onProcess={processSelected} />}
      {page === "details" && <ApplicationDetails detail={detail} onDecision={submitDecision} busy={busy} />}
      {page === "validation" && <ValidationVerification detail={detail} />}
      {page === "scoring" && <ScoringExplainability detail={detail} />}
      {page === "review" && <ReviewerWorkspace detail={detail} onDecision={submitDecision} onFeedback={submitFeedback} busy={busy} />}
      {page === "audit" && <AuditTrail detail={detail} />}
      {page === "schemes" && <SchemeRules schemes={schemes} onCreateRule={createRule} />}
      {page === "analytics" && <Analytics analytics={analytics} />}
    </Shell>
  );
}
