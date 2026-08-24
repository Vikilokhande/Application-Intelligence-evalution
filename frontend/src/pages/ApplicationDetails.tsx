// ApplicationDetails.tsx — Case Overview.
// Tabs: Overview | Documents | Validation | Evidence | Rules
// Human-readable scheme name. Clean layout matching Landing/Login aesthetic.
import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, FileText, FolderOpen,
  Trash2, XCircle, HelpCircle, ShieldCheck, Clock,
} from "lucide-react";
import {
  EvidenceCard, FindingCard, PageHeader, RiskBadge,
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

function fmtCurrency(v: unknown): string {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (isNaN(n)) return String(v);
  return `₹${n.toLocaleString("en-IN")}`;
}

type Tab = "overview" | "documents" | "validation" | "evidence" | "rules";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",   label: "Overview"   },
  { key: "documents",  label: "Documents"  },
  { key: "validation", label: "Validation" },
  { key: "evidence",   label: "Evidence"   },
  { key: "rules",      label: "Rules"      },
];

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
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        title="No application selected"
        description="Select an application from the Dashboard to view details."
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
    { label: "Applicant Name", value: detail.applicant_name },
    { label: "Organisation",   value: formData?.organization_name as string },
    { label: "Applied Scheme", value: schemeName(detail.scheme_id), isScheme: true },
    { label: "Project Title",  value: detail.project_title },
    { label: "Category",       value: detail.project_category },
    { label: "Location",       value: formData?.project_location as string },
    { label: "Estimated Cost", value: fmtCurrency(formData?.project_cost) },
    { label: "Duration",       value: formData?.project_duration ? `${formData.project_duration} months` : null },
  ];

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-slide-up font-sans">
      <PageHeader
        title="Application Review"
        subtitle={`${detail.project_title ?? "Untitled Application"} • ${detail.applicant_name ?? ""}`}
        breadcrumb="Applications"
        actions={<StatusBadge value={detail.status} />}
      />

      {/* ── Top KPI Status Cards (Matches Landing & Login Page Cards) ────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Clock size={12} className="text-slate-400" />
            Current Status
          </p>
          <div className="mt-1">
            <StatusBadge value={detail.status} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-[#C59B27]" />
            AI Recommendation
          </p>
          <div className="mt-1">
            <RecommendationBadge value={detail.ai_recommendation} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <AlertTriangle size={12} className="text-amber-500" />
            Risk Level
          </p>
          <div className="mt-1">
            <RiskBadge value={pred?.prediction_class} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Submission Date
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
          {/* Left: Well-proportioned Application Summary + Documents */}
          <div className="space-y-6">
            {/* Application Summary Box */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[#0A2540]" />
                  <h2 className="text-sm font-bold text-[#0A2540]">Application Summary</h2>
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
                  <h2 className="text-sm font-bold text-[#0A2540]">Submitted Documents</h2>
                </div>
                <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {detail.documents.length} files
                </span>
              </div>

              <div className="p-6">
                {detail.documents.length === 0 ? (
                  <p className="text-sm text-slate-400 italic text-center py-6">No documents submitted.</p>
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
                              {isOk ? "Ready" : isFail ? "Failed" : "Pending"}
                            </span>
                            <button
                              onClick={() => onDeleteDocument(doc.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 transition rounded"
                              title="Remove document"
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
                  Missing / Failed Documents
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">Validation Checks</h3>
                <span className="text-xs font-bold text-slate-500">{detail.validation_results.length} Total</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { n: passes.length, label: "Passed Checks",    icon: <CheckCircle2 size={15} className="text-emerald-600" />, color: "text-emerald-700", bg: "bg-emerald-50/60" },
                  { n: warns.length,  label: "Need Verification", icon: <AlertTriangle size={15} className="text-amber-600" />, color: "text-amber-700", bg: "bg-amber-50/60" },
                  { n: fails.length,  label: "Failed Checks",     icon: <XCircle size={15} className="text-rose-600" />,     color: "text-rose-700", bg: "bg-rose-50/60" },
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
                  <Trash2 size={13} /> Delete this application
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-rose-700">Permanently delete this application and all associated data?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onDeleteApplication(detail.id); setConfirmDelete(false); }}
                      disabled={busy}
                      className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 transition shadow-xs"
                    >
                      Confirm Delete
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                      Cancel
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
            <h2 className="text-sm font-bold text-[#0A2540]">Submitted Documents ({detail.documents.length})</h2>
          </div>
          {detail.documents.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-400">No documents submitted.</p>
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
                      <p className="text-xs text-slate-400 mt-0.5">{doc.document_type || "Document"} • Uploaded on {fmtDate(doc.uploaded_at)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${
                      isOk ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                      isFail ? "bg-rose-50 text-rose-700 border border-rose-200" :
                      "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {isOk ? "Ready" : isFail ? "Failed" : "Pending"}
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
              { n: passes.length, label: "Passed Checks",      cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
              { n: warns.length,  label: "Need Verification",  cls: "border-amber-200 bg-amber-50 text-amber-800" },
              { n: fails.length,  label: "Failed Checks",      cls: "border-rose-200 bg-rose-50 text-rose-800" },
            ].map(({ n, label, cls }) => (
              <div key={label} className={`rounded-xl border px-4 py-2.5 text-sm font-bold shadow-2xs ${cls}`}>
                {n} {label}
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <p className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">All Validation Checks</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Check Name", "Status", "Details"].map(h => (
                      <th key={h} className={`text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest ${h === "Details" ? "hidden md:table-cell" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...fails, ...warns, ...passes].map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5 font-semibold text-[#0A2540]">{v.validation_type.replaceAll("_", " ")}</td>
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
                      <td className="px-5 py-3.5 text-slate-600 text-xs hidden md:table-cell max-w-sm">{v.message || "—"}</td>
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
              <p className="text-sm text-slate-400">Evidence could not be retrieved for this application.</p>
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
              <p className="text-sm text-slate-400">No scheme rules have been evaluated yet.</p>
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
                      {pass ? "✓ Pass" : "✕ Fail"}
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
