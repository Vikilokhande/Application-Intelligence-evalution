// ApplicationDetails.tsx — Case Overview.
// Tabs: Overview | Documents | Validation | Evidence | Rules
// Human-readable scheme name. Clean layout matching Landing/Login aesthetic.
import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, FileText, FolderOpen,
  Trash2, XCircle, HelpCircle, ShieldCheck, Clock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  EvidenceCard, PageHeader, RiskBadge,
  RecommendationBadge, EmptyState,
} from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail, SchemeRead } from "../types/api";

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function cleanCheckName(name: string): string {
  const map: Record<string, string> = {
    REQUIRED_FIELD: "Mandatory Field Verification",
    COMPLETENESS: "Data Completeness Check",
    BUSINESS_RULE_PRECHECK: "Scheme Rule Pre-Check",
    CROSS_DOCUMENT_CONSISTENCY: "Cross-Document Consistency Check",
    FIELD_VALIDATION: "Field Parameter Validation",
    DATA_RANGE: "Threshold & Cost Range Check",
    DATA_TYPE: "Data Format Validation",
  };
  return map[name] ?? name.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

function cleanValidationMessage(message: string | null | undefined): string {
  if (!message) return "Verification check pending supporting document evidence.";
  let text = message
    .replace(/applicant\.name/g, "Applicant Full Name")
    .replace(/applicant\.organization_type/g, "Organization / Entity Type")
    .replace(/applicant\.email/g, "Applicant Email Address")
    .replace(/project\.title/g, "Project Title")
    .replace(/project\.category/g, "Project Category")
    .replace(/project\.location/g, "Project Location")
    .replace(/project\.cost/g, "Estimated Project Cost")
    .replace(/project\.duration/g, "Project Duration");

  if (text.includes("has only 0 distinct document-derived value(s)")) {
    const match = text.match(/^(.*?) has only 0/);
    const fieldName = match ? match[1] : "Field parameter";
    return `${fieldName}: Awaiting extraction from uploaded documents for cross-verification.`;
  }
  if (text.includes("Required evidence unavailable")) {
    text = text.replace(/\.?\s*Required evidence unavailable\.?/g, "");
    if (text.includes("is required")) {
      return `${text}. Please attach supporting clearance certificate or official verification document.`;
    }
    if (text.trim()) {
      return `${text.trim()} (Awaiting supporting document evidence).`;
    }
    return "Awaiting supporting document evidence for official verification.";
  }
  if (text.includes("Application field completeness is")) {
    return text.replace("Application field completeness is", "Application parameters completeness rate is");
  }
  return text;
}

function fmtCurrency(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return `₹${n.toLocaleString("en-IN")}`;
}

type Tab = "overview" | "documents" | "validation" | "evidence" | "rules";

export function ApplicationDetails({
  detail,
  schemes = [],
  onDecision: _onDecision,
  busy,
  onDeleteDocument,
  onDeleteApplication,
}: {
  detail: ApplicationDetail | null;
  schemes?: SchemeRead[];
  onDecision: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  onDeleteDocument: (id: string) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview",   label: t("details.tab_overview", "Overview")     },
    { key: "documents",  label: t("details.tab_documents", "Documents")   },
    { key: "validation", label: t("details.tab_validation", "Validation") },
    { key: "evidence",   label: t("details.tab_evidence", "Evidence")     },
    { key: "rules",      label: t("details.tab_rules", "Scheme Rules")    },
  ];

  // Scheme ID → human readable name lookup
  const schemeMap = new Map(schemes.map(s => [s.id, s.name]));
  function schemeName(id: string | null | undefined): string {
    if (!id) return "—";
    return schemeMap.get(id) ?? id;
  }

  if (!detail) {
    return (
      <EmptyState
        icon={<FolderOpen size={24} />}
        title={t("audit.empty_title", "No application selected")}
        description={t("audit.empty_desc", "Select an application from the Dashboard to view details.")}
      />
    );
  }

  const pred     = detail.predictions?.[detail.predictions.length - 1];
  const formData = detail.form_data as Record<string, unknown> | undefined;
  const fails    = detail.validation_results.filter(v => v.status === "FAIL");
  const warns    = detail.validation_results.filter(v => v.status === "WARN" || v.status === "NOT_VERIFIABLE");
  const passes   = detail.validation_results.filter(v => v.status === "PASS");

  const missingDocs = detail.documents.filter(d => {
    const s = (d.processing_status ?? "").toUpperCase();
    return s === "FAILED" || s === "ERROR";
  });

  const meaningfulEvidence = detail.evidence.filter(e => {
    const m = e.metadata_json as Record<string, unknown> | undefined;
    return m?.evidence_text || m?.knowledge_base_document;
  });

  const summaryFields = [
    { label: t("details.applicant_name", "Applicant Name"), value: detail.applicant_name },
    { label: t("details.organization", "Organisation"),   value: formData?.organization_name as string },
    { label: t("details.scheme", "Applied Scheme"), value: schemeName(detail.scheme_id), isScheme: true },
    { label: t("details.project_title", "Project Title"),  value: detail.project_title },
    { label: t("details.project_cat", "Category"),       value: detail.project_category },
    { label: t("details.location", "Location"),       value: formData?.project_location as string },
    { label: t("details.cost", "Estimated Cost"), value: fmtCurrency(formData?.project_cost) },
    { label: t("details.duration", "Duration"),       value: formData?.project_duration ? `${formData.project_duration} ${t("details.duration", "Months")}` : null },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-slide-up font-sans">
      <PageHeader
        title={t("details.title", "Application Case Details")}
        subtitle={`${detail.project_title ?? "Untitled Application"} • ${detail.applicant_name ?? ""}`}
        breadcrumb={t("nav.applications", "Applications")}
        actions={<StatusBadge value={detail.status} />}
      />

      {/* ── Top KPI Status Cards ────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400" />
            {t("details.overall_status", "Current Status")}
          </p>
          <div className="mt-1">
            <StatusBadge value={detail.status} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-[#C59B27]" />
            {t("details.ai_recommendation", "AI Advisory")}
          </p>
          <div className="mt-1">
            <RecommendationBadge value={detail.ai_recommendation} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-500" />
            {t("common.priority", "Risk Level")}
          </p>
          <div className="mt-1">
            <RiskBadge value={pred?.prediction_class} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            {t("details.submitted_date", "Submission Date")}
          </p>
          <p className="text-sm font-bold text-[#0A2540] mt-1">
            {fmtDate(detail.created_at)}
          </p>
        </div>
      </div>

      {/* ── Clean Tabs Bar ─────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-slate-200 pb-px overflow-x-auto">
        {TABS.map(t => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all whitespace-nowrap flex items-center gap-2 ${
                isActive
                  ? "border-b-2 border-[#0A2540] text-[#0A2540] bg-white font-bold shadow-2xs"
                  : "text-slate-500 hover:text-[#0A2540] hover:bg-slate-100/60"
              }`}
            >
              <span>{t.label}</span>
              {t.key === "validation" && (fails.length + warns.length) > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                  {fails.length + warns.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ══ OVERVIEW TAB ═════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
          {/* Left: Application Summary + Documents */}
          <div className="space-y-6">
            {/* Application Summary Box */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[#0A2540]" />
                  <h2 className="text-sm font-bold text-[#0A2540]">{t("details.case_info", "Application Summary")}</h2>
                </div>
                {detail.project_category && (
                  <span className="rounded-lg bg-slate-200/80 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    {detail.project_category}
                  </span>
                )}
              </div>
              
              <div className="p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  {summaryFields.map(({ label, value, isScheme }) => (
                    <div
                      key={label}
                      className="rounded-xl border border-slate-100 bg-slate-50/40 p-3.5 space-y-1"
                    >
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {label}
                      </p>
                      {isScheme ? (
                        <div className="pt-0.5">
                          <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            {value ?? "—"}
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-[#0A2540] break-words">
                          {value ?? "—"}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submitted Documents Section */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#0A2540]" />
                  <h2 className="text-sm font-bold text-[#0A2540]">{t("details.tab_documents", "Submitted Documents")}</h2>
                </div>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {detail.documents.length} {t("common.records", "files")}
                </span>
              </div>

              <div className="p-6">
                {detail.documents.length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-6">{t("common.no_data", "No documents submitted.")}</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {detail.documents.map(doc => {
                      const s = (doc.processing_status ?? "").toUpperCase();
                      const isOk = s === "PROCESSED" || doc.extraction_status?.toUpperCase() === "EXTRACTED";
                      const isFail = s === "FAILED" || s === "ERROR";
                      return (
                        <div key={doc.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3 min-w-0">
                            {isOk ? (
                              <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                            ) : isFail ? (
                              <XCircle size={16} className="text-rose-500 shrink-0" />
                            ) : (
                              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-800 truncate">{doc.filename}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{doc.document_type || "Document"} • {fmtDate(doc.uploaded_at)}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              isOk ? "bg-emerald-50 text-emerald-700" : isFail ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
                            }`}>
                              {isOk ? t("common.passed", "Ready") : isFail ? t("common.failed", "Failed") : t("common.pending", "Pending")}
                            </span>
                            <button
                              onClick={() => onDeleteDocument(doc.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 transition rounded"
                              title={t("details.delete_doc_confirm", "Remove document")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Validation Summary & Management */}
          <div className="space-y-5">
            {/* Missing docs alert if any */}
            {missingDocs.length > 0 && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 space-y-2.5 shadow-2xs">
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <XCircle size={14} className="text-rose-600" />
                  {t("common.error", "Missing / Failed Documents")}
                </p>
                <div className="space-y-1.5">
                  {missingDocs.map(d => (
                    <div key={d.id} className="flex items-center gap-2 text-xs font-semibold text-rose-800 bg-white/60 rounded-lg px-2.5 py-1.5">
                      <span className="truncate">{d.filename}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Validation Breakdown */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">{t("details.tab_validation", "Validation Checks")}</h3>
                <span className="text-xs font-bold text-slate-500">{detail.validation_results.length} {t("common.all", "Total")}</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { n: passes.length, label: t("validation.kpi_passed", "Passed Checks"),    icon: <CheckCircle2 size={15} className="text-emerald-600" />, color: "text-emerald-700", bg: "bg-emerald-50/60" },
                  { n: warns.length,  label: t("validation.kpi_warnings", "Need Verification"), icon: <AlertTriangle size={15} className="text-amber-600" />, color: "text-amber-700", bg: "bg-amber-50/60" },
                  { n: fails.length,  label: t("validation.kpi_contradictions", "Failed Checks"),     icon: <XCircle size={15} className="text-rose-600" />,     color: "text-rose-700", bg: "bg-rose-50/60" },
                ].map(({ n, label, icon, color, bg }) => (
                  <div key={label} className={`flex items-center justify-between p-2.5 rounded-xl border border-slate-100 ${bg}`}>
                    <div className="flex items-center gap-2.5">
                      {icon}
                      <span className="text-xs font-semibold text-slate-700">{label}</span>
                    </div>
                    <span className={`text-sm font-bold ${color}`}>{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone / Permanent Delete */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full text-xs font-semibold text-slate-400 hover:text-rose-600 transition text-center py-1 flex items-center justify-center gap-1.5"
                >
                  <Trash2 size={13} /> {t("details.delete_app_btn", "Delete this application")}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-rose-700">{t("details.delete_app_confirm", "Permanently delete this application and all associated data?")}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onDeleteApplication(detail.id); setConfirmDelete(false); }}
                      disabled={busy}
                      className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 transition shadow-xs"
                    >
                      {t("common.confirm", "Confirm Delete")}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      {t("common.cancel", "Cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ DOCUMENTS TAB ════════════════════════════════════════ */}
      {tab === "documents" && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0A2540]">{t("details.tab_documents", "Submitted Documents")} ({detail.documents.length})</h2>
          </div>
          {detail.documents.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-400">{t("common.no_data", "No documents submitted.")}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {detail.documents.map(doc => {
                const ps = (doc.processing_status ?? "").toUpperCase();
                const isOk   = ps === "PROCESSED" || doc.extraction_status?.toUpperCase() === "EXTRACTED";
                const isFail = ps === "FAILED" || ps === "ERROR";
                return (
                  <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition">
                    {isOk ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> :
                     isFail ? <XCircle size={18} className="text-rose-500 shrink-0" /> :
                              <HelpCircle size={18} className="text-amber-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{doc.filename}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{doc.document_type || "Document"} • {fmtDate(doc.uploaded_at)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                      isOk ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      isFail ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {isOk ? t("common.passed", "Ready") : isFail ? t("common.failed", "Failed") : t("common.pending", "Pending")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ VALIDATION TAB ═══════════════════════════════════════ */}
      {tab === "validation" && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            {[
              { n: passes.length, label: t("validation.kpi_passed", "Passed Checks"),      cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
              { n: warns.length,  label: t("validation.kpi_warnings", "Need Verification"),  cls: "border-amber-200 bg-amber-50 text-amber-800" },
              { n: fails.length,  label: t("validation.kpi_contradictions", "Failed Checks"),      cls: "border-rose-200 bg-rose-50 text-rose-800" },
            ].map(({ n, label, cls }) => (
              <div key={label} className={`rounded-xl border px-4 py-2.5 text-sm font-bold shadow-2xs ${cls}`}>
                {n} {label}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">{t("validation.tab_all", "All Validation Checks")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {[
                      { label: t("validation.col_check", "Check Name"), hide: "" },
                      { label: t("validation.col_status", "Status"), hide: "" },
                      { label: t("validation.col_rationale", "Details"), hide: "hidden md:table-cell" }
                    ].map((h, i) => (
                      <th key={i} className={`text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest ${h.hide}`}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...fails, ...warns, ...passes].map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5 font-semibold text-[#0A2540]">{cleanCheckName(v.validation_type)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          v.status === "PASS"           ? "bg-emerald-100 text-emerald-800" :
                          v.status === "FAIL"           ? "bg-rose-100 text-rose-800" :
                          v.status.includes("NOT")      ? "bg-amber-100 text-amber-800" :
                          v.status === "WARN"           ? "bg-amber-100 text-amber-800" :
                                                          "bg-slate-100 text-slate-600"
                        }`}>
                          {v.status === "PASS" ? "✓ " : v.status === "FAIL" ? "✕ " : "⚠ "}
                          {v.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 text-xs hidden md:table-cell max-w-sm">{cleanValidationMessage(v.message)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ EVIDENCE TAB ═════════════════════════════════════════ */}
      {tab === "evidence" && (
        <div className="space-y-4">
          {meaningfulEvidence.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-400">{t("common.no_data", "Evidence could not be retrieved for this application.")}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {meaningfulEvidence.map(ev => <EvidenceCard key={ev.id} item={ev} />)}
            </div>
          )}
        </div>
      )}

      {/* ══ RULES TAB ════════════════════════════════════════════ */}
      {tab === "rules" && (
        <div className="space-y-3">
          {detail.rule_results.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <p className="text-sm text-slate-400">{t("schemes.rules_count", "No scheme rules have been evaluated yet.")}</p>
            </div>
          ) : (
            detail.rule_results.map(r => {
              const pass = r.result?.toUpperCase() === "PASS";
              return (
                <div key={r.id} className={`rounded-2xl border p-5 shadow-xs transition ${pass ? "border-emerald-200 bg-emerald-50/20" : "border-rose-200 bg-rose-50/20"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-[#0A2540]">{r.rule_name}</p>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{r.reason}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${pass ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                      {pass ? `✓ ${t("common.passed", "Pass")}` : `✕ ${t("common.failed", "Fail")}`}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

