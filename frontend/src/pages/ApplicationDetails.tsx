// ApplicationDetails.tsx — Case Overview.
// Tabs: Overview | Documents | Validation | Evidence | Rules
// Removed: Evaluation, Technical, Audit tabs.
import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, FileText, FolderOpen,
  Trash2, XCircle, HelpCircle,
} from "lucide-react";
import {
  AlertBanner, EvidenceCard, FindingCard, PageHeader, RiskBadge,
  RecommendationBadge, TechnicalDetails, TechRow, EmptyState,
} from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail } from "../types/api";

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
  onDecision,
  busy,
  onDeleteDocument,
  onDeleteApplication,
}: {
  detail: ApplicationDetail | null;
  onDecision: (p: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  onDeleteDocument: (id: string) => Promise<void>;
  onDeleteApplication: (id: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const topFindings = [...fails, ...warns].slice(0, 5);

  const meaningfulEvidence = detail.evidence.filter(e => {
    const m = e.metadata_json as Record<string, unknown> | undefined;
    return m?.evidence_text || m?.knowledge_base_document;
  });

  return (
    <div className="max-w-[1100px] mx-auto space-y-5 animate-slide-up">
      <PageHeader
        title="Application Review"
        subtitle={`${detail.project_title ?? "Untitled"} — ${detail.applicant_name ?? ""}`}
        breadcrumb="Applications"
        actions={<StatusBadge value={detail.status} />}
      />

      {/* ── Status row ────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Status",           content: <StatusBadge value={detail.status} /> },
          { label: "AI Recommendation", content: <RecommendationBadge value={detail.ai_recommendation} /> },
          { label: "Risk Level",        content: <RiskBadge value={pred?.prediction_class} /> },
          { label: "Submitted",         content: <span className="text-sm text-slate-700">{fmtDate(detail.created_at)}</span> },
        ].map(({ label, content }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
            {content}
          </div>
        ))}
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === t.key
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.key === "validation" && (fails.length + warns.length) > 0 && (
              <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                {fails.length + warns.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ═════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* Left: Application Summary */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <FileText size={14} className="text-teal-600" />
              <h2 className="text-sm font-bold text-slate-800">Application Summary</h2>
            </div>
            <div className="p-5">
              <div className="grid gap-0 sm:grid-cols-2">
                {[
                  ["Applicant",    detail.applicant_name],
                  ["Organisation", formData?.organization_name as string],
                  ["Scheme",       detail.scheme_id],
                  ["Project",      detail.project_title],
                  ["Category",     detail.project_category],
                  ["Location",     formData?.project_location as string],
                  ["Cost",         fmtCurrency(formData?.project_cost)],
                  ["Duration",     formData?.project_duration ? `${formData.project_duration} months` : null],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-baseline gap-2 py-2 border-b border-slate-50 last:border-0">
                    <span className="text-xs font-semibold text-slate-400 w-24 shrink-0">{l}</span>
                    <span className="text-sm text-slate-800">{v ?? "—"}</span>
                  </div>
                ))}
              </div>

              {/* Documents submitted */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Submitted Documents</p>
                {detail.documents.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No documents submitted.</p>
                ) : (
                  <div className="space-y-1.5">
                    {detail.documents.map(doc => {
                      const s = (doc.processing_status ?? "").toUpperCase();
                      const isOk = s === "PROCESSED" || doc.extraction_status?.toUpperCase() === "EXTRACTED";
                      return (
                        <div key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            {isOk ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" /> :
                                    <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                            <span className="text-slate-700 truncate max-w-[220px]">{doc.filename}</span>
                          </div>
                          <button
                            onClick={() => onDeleteDocument(doc.id)}
                            className="text-slate-300 hover:text-rose-500 transition shrink-0"
                            title="Remove document"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Decision Summary */}
          <div className="space-y-4">
            {/* Key issues */}
            {topFindings.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <h3 className="text-sm font-bold text-slate-800">Why This Needs Attention</h3>
                </div>
                <div className="p-4 space-y-2">
                  {topFindings.map((f, i) => (
                    <FindingCard
                      key={i}
                      status={f.status}
                      title={f.validation_type.replaceAll("_", " ")}
                      message={f.message}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Missing docs */}
            {missingDocs.length > 0 && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-1.5">
                <p className="text-xs font-bold text-rose-500 uppercase tracking-wide mb-2">Missing / Failed Documents</p>
                {missingDocs.map(d => (
                  <div key={d.id} className="flex items-center gap-2 text-sm text-rose-700">
                    <XCircle size={13} />
                    <span>{d.filename}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Validation counts */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Validation Summary</p>
              <div className="space-y-2">
                {[
                  { n: passes.length, label: "Passed",   icon: <CheckCircle2 size={14} className="text-emerald-500" />, color: "text-emerald-700" },
                  { n: warns.length,  label: "Need Verification", icon: <AlertTriangle size={14} className="text-amber-500" />, color: "text-amber-700" },
                  { n: fails.length,  label: "Failed",   icon: <XCircle size={14} className="text-rose-500" />, color: "text-rose-700" },
                ].map(({ n, label, icon, color }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">{icon}<span className="text-slate-600">{label}</span></div>
                    <span className={`font-bold ${color}`}>{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Danger zone */}
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-xs text-slate-400 hover:text-rose-500 transition text-center py-2"
              >
                Delete this application
              </button>
            ) : (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                <p className="text-sm font-semibold text-rose-700">Delete this application permanently?</p>
                <div className="flex gap-2">
                  <button onClick={() => { onDeleteApplication(detail.id); setConfirmDelete(false); }} disabled={busy}
                    className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 transition">
                    Delete
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ DOCUMENTS TAB ════════════════════════════════════════ */}
      {tab === "documents" && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-bold text-slate-800">Documents</h2>
          </div>
          {detail.documents.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">No documents submitted.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {detail.documents.map(doc => {
                const ps = (doc.processing_status ?? "").toUpperCase();
                const isOk   = ps === "PROCESSED" || doc.extraction_status?.toUpperCase() === "EXTRACTED";
                const isFail = ps === "FAILED" || ps === "ERROR";
                return (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5">
                    {isOk ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> :
                     isFail ? <XCircle size={16} className="text-rose-500 shrink-0" /> :
                              <HelpCircle size={16} className="text-amber-500 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.filename}</p>
                      <p className="text-xs text-slate-400">{doc.document_type || "Document"} • {fmtDate(doc.uploaded_at)}</p>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${isOk ? "text-emerald-600" : isFail ? "text-rose-600" : "text-amber-600"}`}>
                      {isOk ? "Ready" : isFail ? "Failed" : "Pending"}
                    </span>
                    <TechnicalDetails label="">
                      <TechRow label="Status"     value={doc.processing_status} />
                      <TechRow label="Extraction" value={doc.extraction_status} />
                      <TechRow label="OCR"        value={doc.ocr_status ?? "—"} />
                    </TechnicalDetails>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ VALIDATION TAB ═══════════════════════════════════════ */}
      {tab === "validation" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {[
              { n: passes.length, label: "Passed",  cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
              { n: warns.length,  label: "Verify",  cls: "border-amber-200 bg-amber-50 text-amber-700" },
              { n: fails.length,  label: "Failed",  cls: "border-rose-200 bg-rose-50 text-rose-700" },
            ].map(({ n, label, cls }) => (
              <div key={label} className={`rounded-lg border px-4 py-2 text-sm font-bold ${cls}`}>
                {n} {label}
              </div>
            ))}
          </div>

          {topFindings.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Important Findings</p>
              {topFindings.map((f, i) => <FindingCard key={i} status={f.status} title={f.validation_type.replaceAll("_", " ")} message={f.message} />)}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-bold text-slate-700">All Checks</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    {["Check", "Result", "Detail"].map(h => (
                      <th key={h} className={`text-left px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wide ${h === "Detail" ? "hidden md:table-cell" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...fails, ...warns, ...passes].map((v, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-2.5 font-medium text-slate-700">{v.validation_type.replaceAll("_", " ")}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          v.status === "PASS"           ? "bg-emerald-100 text-emerald-700" :
                          v.status === "FAIL"           ? "bg-rose-100 text-rose-700" :
                          v.status.includes("NOT")      ? "bg-amber-100 text-amber-700" :
                          v.status === "WARN"           ? "bg-amber-100 text-amber-700" :
                                                          "bg-slate-100 text-slate-500"
                        }`}>
                          {v.status === "PASS" ? "✓ " : v.status === "FAIL" ? "✕ " : "⚠ "}
                          {v.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs hidden md:table-cell max-w-xs truncate">{v.message || "—"}</td>
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
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
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
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-400">No scheme rules have been evaluated yet.</p>
            </div>
          ) : (
            detail.rule_results.map(r => {
              const pass = r.result?.toUpperCase() === "PASS";
              return (
                <div key={r.id} className={`rounded-xl border shadow-sm p-4 ${pass ? "border-emerald-200 bg-emerald-50/30" : "border-rose-200 bg-rose-50/30"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{r.rule_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.reason}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${pass ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                      {pass ? "✓ Pass" : "✕ Fail"}
                    </span>
                  </div>
                  <TechnicalDetails label="Rule details">
                    <TechRow label="Rule ID"  value={r.rule_id} />
                    <TechRow label="Severity" value={r.severity} />
                    <TechRow label="Expected" value={JSON.stringify(r.expected_value)} />
                    <TechRow label="Actual"   value={JSON.stringify(r.actual_value)} />
                  </TechnicalDetails>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
