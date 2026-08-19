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
import { api } from "./services/api";
import type { AnalyticsOverview, ApplicationDetail, ApplicationSummary, SchemeRead, WorkflowResponse } from "./types/api";

export default function App() {
  const [page, setPage] = useState<PageKey>("dashboard");
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
    const [apps, schemeList, overview] = await Promise.all([api.listApplications(), api.schemes(), api.analytics()]);
    setApplications(apps);
    setSchemes(schemeList);
    setAnalytics(overview);
    if (!selectedId && apps[0]) {
      setSelectedId(apps[0].id);
    }
  }, [selectedId]);

  const refreshDetail = useCallback(
    async (id: string | null = selectedId) => {
      if (!id) {
        setDetail(null);
        setWorkflow(null);
        return;
      }
      const [nextDetail, nextWorkflow] = await Promise.all([api.getApplication(id), api.getWorkflow(id)]);
      setDetail(nextDetail);
      setWorkflow(nextWorkflow);
    },
    [selectedId]
  );

  useEffect(() => {
    refreshLists().catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load data"));
  }, [refreshLists]);

  useEffect(() => {
    refreshDetail().catch((err: unknown) => setError(err instanceof Error ? err.message : "Failed to load application"));
  }, [refreshDetail]);

  useEffect(() => {
    if (page === "review" && selectedId) {
      api.recordReviewOpened(selectedId).catch(() => undefined);
    }
  }, [page, selectedId]);

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

  return (
    <Shell page={page} onPageChange={setPage} selectedTitle={selectedTitle}>
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
