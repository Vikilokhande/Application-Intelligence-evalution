// ReviewerWorkspace.tsx — Human-Readable Decision Cockpit.
// Palette: Deep Navy Blue (#0A243F), Dark Navy (#071A2B), Mustard Gold (#D5A51A), Warm Off-White (#F8F9FA), White (#FFFFFF), Slate Gray (#66717C).
// No backend technical jargon (no RAG, LLM, XGBoost terms). Balanced layout covering extra spaces.
import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle, BarChart3, BookOpen, CheckCircle2, ClipboardList,
  Copy, ExternalLink, Mail, MessageSquare, Sparkles, UserCheck,
  ShieldCheck, FileText, ArrowRight,
} from "lucide-react";
import {
  EmptyState, PageHeader,
  RecommendationBadge, RiskBadge,
} from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail, WorkflowResponse } from "../types/api";

/* ── Helpers ──────────────────────────────────────────────────────── */
function derivePriority(detail: ApplicationDetail): { label: string; color: string } {
  const st  = (detail.status ?? "").toUpperCase();
  const rec = (detail.ai_recommendation ?? "").toUpperCase();
  const pred = detail.predictions?.[detail.predictions.length - 1];
  if (!st.includes("AWAITING_HUMAN_REVIEW")) return { label: "—", color: "text-[#66717C]" };
  if (pred?.prediction_class === "HIGH_RISK"   || rec.includes("REJECT"))        return { label: "High Priority",   color: "text-rose-700 font-bold" };
  if (pred?.prediction_class === "MEDIUM_RISK" || rec.includes("CLARIFICATION")) return { label: "Medium Priority", color: "text-[#B45309] font-bold" };
  if (pred?.prediction_class === "LOW_RISK"    || rec.includes("APPROVE"))       return { label: "Normal",          color: "text-[#0A243F] font-semibold" };
  return { label: "—", color: "text-[#66717C]" };
}

function pct(v: number | null | undefined) { return v != null && v > 0 ? `${Math.round(v * 100)}%` : "—"; }

const DECISION_OPTIONS = [
  {
    value: "APPROVE",
    label: "✓  Approve Application",
    desc: "Application meets all statutory scheme guidelines and requirements.",
    activeCls: "border-[#0A243F] bg-[#0A243F] text-white shadow-sm",
    cls: "border-[#E5E7EB] bg-white text-[#071A2B] hover:bg-[#F8F9FA] hover:border-[#0A243F]",
  },
  {
    value: "REQUEST_CLARIFICATION",
    label: "⚠  Request Clarification",
    desc: "Additional documentation or parameter clarification required from applicant.",
    activeCls: "border-[#D5A51A] bg-[#FFFBEB] text-[#92400E] border-2 shadow-sm",
    cls: "border-[#E5E7EB] bg-white text-[#071A2B] hover:bg-[#F8F9FA] hover:border-[#D5A51A]",
  },
  {
    value: "REJECT",
    label: "✕  Reject Application",
    desc: "Application fails mandatory environmental criteria or scheme thresholds.",
    activeCls: "border-rose-600 bg-[#FEF2F2] text-[#991B1B] border-2 shadow-sm",
    cls: "border-[#E5E7EB] bg-white text-[#071A2B] hover:bg-[#F8F9FA] hover:border-rose-300",
  },
];

/* ── Proportional Navigation Card ───────────────────────────────────── */
function NavCard({
  icon, title, count, countLabel, summary, action, onNavigate,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number | string;
  countLabel?: string;
  summary: string;
  action: string;
  onNavigate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full text-left rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:p-5 shadow-xs hover:border-[#0A243F] hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A243F]/10 text-[#0A243F] shrink-0 group-hover:bg-[#0A243F] group-hover:text-white transition-colors">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[#0A243F] truncate">{title}</p>
              {count != null && (
                <span className="text-[11px] font-bold text-[#0A243F] bg-[#F8F9FA] border border-[#E5E7EB] px-2 py-0.5 rounded-full shrink-0">
                  {count} {countLabel}
                </span>
              )}
            </div>
            <p className="text-xs text-[#66717C] mt-0.5 leading-relaxed truncate max-w-md">{summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[#0A243F] text-xs font-bold shrink-0 group-hover:text-[#D5A51A] transition-colors">
          <span>{action}</span>
          <ArrowRight size={13} />
        </div>
      </div>
    </button>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export function ReviewerWorkspace({
  detail,
  workflow,
  onDecision,
  onFeedback,
  busy,
  onNavigate,
}: {
  detail: ApplicationDetail | null;
  workflow?: WorkflowResponse | null;
  onDecision: (payload: Record<string, unknown>) => Promise<void>;
  onFeedback: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
  onNavigate?: (page: string) => void;
}) {
  const [decision,         setDecision]         = useState("REQUEST_CLARIFICATION");
  const [notes,            setNotes]            = useState("");
  const [overrideReason,   setOverrideReason]   = useState("");
  const [feedbackHelpful,  setFeedbackHelpful]  = useState<"yes" | "no" | null>(null);
  const [feedbackComment,  setFeedbackComment]  = useState("");
  const [submitted,        setSubmitted]        = useState(false);
  const [showConclusion,   setShowConclusion]   = useState(false);
  const [copied,           setCopied]           = useState(false);

  if (!detail) {
    return (
      <EmptyState
        icon={<ClipboardList size={24} />}
        title="No application selected"
        description="Select an application from the Dashboard to begin your review."
      />
    );
  }

  const pred        = detail.predictions?.[detail.predictions.length - 1];
  const confidence  = pred && pred.confidence > 0 ? pred.confidence : null;
  const priority    = derivePriority(detail);
  const wfState     = (workflow?.state ?? {}) as Record<string, unknown>;
  const llm         = (wfState.llm_reasoning ?? null) as Record<string, unknown> | null;
  const keyFindings = (llm?.key_findings as string[] | undefined) ?? [];

  const fails = detail.validation_results.filter(v => v.status === "FAIL");
  const warns = detail.validation_results.filter(v => v.status === "WARN" || v.status === "NOT_VERIFIABLE");
  const topIssues  = [...fails, ...warns].slice(0, 4);

  const meaningfulEvidence = detail.evidence.filter(e => {
    const m = e.metadata_json as Record<string, unknown> | undefined;
    return m?.evidence_text || m?.knowledge_base_document;
  });

  const recNorm  = (detail.ai_recommendation ?? "").toUpperCase();
  let mappedRec  = "REQUEST_CLARIFICATION";
  if (recNorm.includes("APPROVE")) mappedRec = "APPROVE";
  else if (recNorm.includes("REJECT")) mappedRec = "REJECT";
  const isOverride = decision !== mappedRec && mappedRec !== "REQUEST_CLARIFICATION";

  async function handleDecision(e: FormEvent) {
    e.preventDefault();
    await onDecision({
      reviewer_id: "demo-reviewer",
      decision,
      comments: notes,
      override_ai_recommendation: isOverride,
      override_reason: isOverride ? overrideReason : null,
    });
    setSubmitted(true);
  }

  async function handleFeedback(e: FormEvent) {
    e.preventDefault();
    await onFeedback({
      reviewer_id: "demo-reviewer",
      feedback_type: feedbackHelpful === "yes" ? "AI_RECOMMENDATION_CORRECT" : "AI_RECOMMENDATION_INCORRECT",
      comment: feedbackComment,
    });
    setFeedbackHelpful(null);
    setFeedbackComment("");
  }

  if (submitted) {
    return (
      <div className="max-w-[620px] mx-auto mt-16 text-center space-y-5 animate-slide-up font-sans">
        <div className="rounded-3xl border border-[#E5E7EB] bg-white p-10 shadow-sm space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0A243F] text-[#D5A51A]">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-extrabold text-[#0A243F]">Review Decision Recorded</h2>
          <p className="text-[#66717C] text-sm leading-relaxed max-w-md mx-auto">
            Your clearance decision has been saved and officially logged in the application trail.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-slide-up font-sans">
      <PageHeader
        title="Reviewer Workspace"
        subtitle={`${detail.project_title ?? "Clearance Application"} • ${detail.applicant_name ?? ""}`}
        breadcrumb="Case Review"
        actions={<StatusBadge value={detail.status} />}
      />

      {/* ── Top Status Strip (4 Medium Proportional Cards) ─────────────────────────────────────── */}
      <div className="grid gap-3.5 grid-cols-2 sm:grid-cols-4">
        <Tile label="Application Status">
          <StatusBadge value={detail.status} />
        </Tile>
        <Tile label="Advisory Recommendation">
          <RecommendationBadge value={detail.ai_recommendation} />
        </Tile>
        <Tile label="Assessed Risk Level">
          <RiskBadge value={pred?.prediction_class} />
        </Tile>
        <Tile label="Case Review Priority">
          <span className={`text-sm font-bold ${priority.color}`}>{priority.label}</span>
        </Tile>
      </div>

      {/* ── Main Workspace Grid (Balanced 2-Columns, No Empty Gaps) ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_390px] items-start">

        {/* ── Left Column: Primary Case Findings & Nav Cards ───────────────────────── */}
        <div className="space-y-6">

          {/* "Why This Needs Review" Section (Clean, User-Friendly & Human-Readable) */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FA]">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-[#B45309]" />
                <h2 className="text-sm font-bold text-[#0A243F]">Why This Case Needs Review</h2>
              </div>
              {topIssues.length > 0 && (
                <span className="rounded-full bg-[#FFFBEB] border border-[#FDE68A] px-2.5 py-0.5 text-xs font-bold text-[#B45309]">
                  {topIssues.length} Observation{topIssues.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div className="p-6 space-y-3">
              {topIssues.length === 0 && keyFindings.length === 0 ? (
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA]">
                  <CheckCircle2 size={16} className="text-[#0A243F] shrink-0" />
                  <p className="text-xs text-[#071A2B] font-medium">
                    All automated compliance checks have been verified. Review details and confirm decision below.
                  </p>
                </div>
              ) : (
                <>
                  {topIssues.map((issue, i) => {
                    const isFail = issue.status === "FAIL";
                    return (
                      <div
                        key={i}
                        className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                          isFail
                            ? "border-[#FECACA] bg-[#FEF2F2]/60 text-[#991B1B]"
                            : "border-[#FDE68A] bg-[#FFFBEB]/60 text-[#92400E]"
                        }`}
                      >
                        <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${isFail ? "text-[#DC2626]" : "text-[#D5A51A]"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-bold">{issue.validation_type.replaceAll("_", " ")}</p>
                          <p className="text-xs mt-0.5 leading-relaxed opacity-90">{issue.message}</p>
                        </div>
                      </div>
                    );
                  })}

                  {keyFindings.slice(0, 2).map((f, i) => (
                    <div key={`kf-${i}`} className="flex items-start gap-2.5 p-3 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] text-xs text-[#071A2B]">
                      <CheckCircle2 size={14} className="text-[#0A243F] shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed">{f}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Direct Navigation Cards */}
          <div className="space-y-3">
            <NavCard
              icon={<BookOpen size={17} />}
              title="Scheme &amp; Policy Evidence"
              count={meaningfulEvidence.length}
              countLabel="Guidelines"
              summary="View applicable statutory scheme guidelines and cross-referenced evidence."
              action="Open Evidence"
              onNavigate={() => onNavigate?.("details")}
            />

            <NavCard
              icon={<CheckCircle2 size={17} />}
              title="Compliance Validation"
              count={fails.length + warns.length}
              countLabel={`Issue${(fails.length + warns.length) !== 1 ? "s" : ""}`}
              summary={`${detail.validation_results.length} total checks evaluated across applicant data and documents.`}
              action="Open Validation"
              onNavigate={() => onNavigate?.("validation")}
            />

            <NavCard
              icon={<BarChart3 size={17} />}
              title="Clearance Assessment &amp; Advisory"
              count={confidence ? `${Math.round(confidence * 100)}%` : undefined}
              countLabel="Confidence"
              summary="Inspect assessed risk index, confidence metrics, and clearance recommendations."
              action="Open Assessment"
              onNavigate={() => onNavigate?.("scoring")}
            />
          </div>

          {/* Feedback Section */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
            <div className="px-6 py-3.5 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#D5A51A]" />
                <h3 className="text-xs font-bold text-[#0A243F]">Was this advisory assessment helpful?</h3>
              </div>
              <span className="text-[10px] font-semibold text-[#66717C]">Quality feedback</span>
            </div>
            <form onSubmit={handleFeedback} className="p-5 space-y-3.5">
              <div className="flex gap-2.5">
                {(["yes", "no"] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setFeedbackHelpful(v)}
                    className={`flex-1 rounded-xl border py-2.5 text-xs font-bold transition-colors ${
                      feedbackHelpful === v
                        ? v === "yes"
                          ? "border-[#0A243F] bg-[#0A243F] text-white"
                          : "border-rose-300 bg-rose-50 text-rose-800"
                        : "border-[#E5E7EB] bg-white text-[#66717C] hover:bg-[#F8F9FA]"
                    }`}
                  >
                    {v === "yes" ? "✓ Yes, helpful" : "✕ Not helpful"}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                className="form-input resize-none text-xs"
                placeholder="Optional reviewer notes or suggestions…"
                value={feedbackComment}
                onChange={e => setFeedbackComment(e.target.value)}
              />
              <button
                type="submit"
                disabled={busy || feedbackHelpful === null}
                className="w-full rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] py-2 text-xs font-bold text-[#0A243F] hover:bg-[#0A243F] hover:text-white transition disabled:opacity-40"
              >
                Submit Feedback
              </button>
            </form>
          </div>
        </div>

        {/* ── Right Column: Decision Form ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* Assessment Confidence Card */}
          {confidence && (
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs text-center space-y-2">
              <p className="text-[11px] font-bold text-[#66717C] uppercase tracking-wider">Assessment Confidence</p>
              <p className="text-3xl font-black text-[#0A243F] leading-none">{pct(confidence)}</p>
              <div className="h-1.5 rounded-full bg-[#F8F9FA] border border-[#E5E7EB] overflow-hidden mx-6 mt-2">
                <div className="h-full rounded-full bg-[#0A243F] transition-all duration-500" style={{ width: `${confidence * 100}%` }} />
              </div>
            </div>
          )}

          {/* Decision Form Container */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#0A243F] text-white flex items-center gap-2.5">
              <UserCheck size={17} className="text-[#D5A51A]" />
              <div>
                <h2 className="text-sm font-bold text-white">Final Reviewer Decision</h2>
                <p className="text-[11px] text-slate-300">Officially logged to clearance record.</p>
              </div>
            </div>

            <form onSubmit={handleDecision} className="p-6 space-y-5">
              {detail.ai_recommendation && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5">
                  <span className="text-xs font-bold text-[#B45309]">Advisory Recommendation:</span>
                  <RecommendationBadge value={detail.ai_recommendation} />
                </div>
              )}

              {/* 3 Decision Radio Options */}
              <div className="space-y-2">
                {DECISION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDecision(opt.value)}
                    className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                      decision === opt.value ? opt.activeCls : opt.cls
                    }`}
                  >
                    <p className="text-xs font-bold leading-tight">{opt.label}</p>
                    <p className="text-[10px] mt-1 opacity-80 leading-snug">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* Override reason if different */}
              {isOverride && (
                <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 space-y-2">
                  <p className="text-xs font-bold text-[#B45309] flex items-center gap-1.5">
                    <AlertTriangle size={13} /> Decision differs from advisory recommendation
                  </p>
                  <textarea
                    rows={2}
                    required
                    className="form-input resize-none text-xs"
                    placeholder="Provide brief justification for decision…"
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                  />
                </div>
              )}

              {/* Reviewer Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-[#66717C] uppercase tracking-wider mb-1.5">
                  <MessageSquare size={12} /> Decision Notes &amp; Conditions
                </label>
                <textarea
                  rows={3}
                  className="form-input resize-none text-xs"
                  placeholder="Official comments, terms, or notes attached to this application…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Officer Authority Notice */}
              <div className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] px-3.5 py-2.5">
                <ShieldCheck size={15} className="text-[#0A243F] shrink-0" />
                <p className="text-xs text-[#071A2B] font-semibold">Authorised Reviewer Sign-Off</p>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[#0A243F] py-3.5 text-sm font-bold text-white hover:bg-[#0d2f50] active:scale-[0.98] transition shadow-xs disabled:opacity-50"
              >
                {busy ? "Recording Decision…" : "Submit Official Decision"}
              </button>
            </form>
          </div>

          {/* Send Conclusion Action Button */}
          <button
            type="button"
            onClick={() => setShowConclusion(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white py-3 text-xs font-bold text-[#0A243F] hover:bg-[#F8F9FA] hover:border-[#0A243F] transition shadow-2xs"
          >
            <Mail size={14} className="text-[#D5A51A]" />
            <span>Generate &amp; Copy Conclusion Report</span>
          </button>
        </div>
      </div>

      {/* ── Conclusion Modal ────────────────────────────────────── */}
      {showConclusion && (
        <ConclusionModal
          detail={detail}
          topIssues={topIssues}
          keyFindings={keyFindings}
          copied={copied}
          onCopy={() => {
            const text = buildConclusion(detail, topIssues, keyFindings);
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          onClose={() => setShowConclusion(false)}
        />
      )}
    </div>
  );
}

/* ── Status Tile ───────────────────────────────────────────────── */
function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs">
      <p className="text-[11px] font-bold text-[#66717C] uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  );
}

/* ── buildConclusion Report ──────────────────────────────────────── */
function buildConclusion(
  detail: ApplicationDetail,
  topIssues: { validation_type: string; status: string; message: string }[],
  keyFindings: string[],
): string {
  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return iso; }
  };

  const docOk     = detail.documents.filter(d => (d.processing_status ?? "").toUpperCase() === "PROCESSED" || d.extraction_status?.toUpperCase() === "EXTRACTED");
  const docFailed = detail.documents.filter(d => { const s = (d.processing_status ?? "").toUpperCase(); return s === "FAILED" || s === "ERROR"; });
  const fails     = topIssues.filter(v => v.status === "FAIL");
  const warns     = topIssues.filter(v => v.status === "WARN" || v.status === "NOT_VERIFIABLE");

  const rec = (detail.ai_recommendation ?? "").toUpperCase();
  let recLabel = "Clarification Required";
  if (rec.includes("APPROVE")) recLabel = "Approve";
  else if (rec.includes("REJECT")) recLabel = "Reject";

  const lines: string[] = [
    `ENVIRONMENTAL CLEARANCE REVIEW CONCLUSION`,
    `Project:    ${detail.project_title ?? "—"}`,
    `Applicant:  ${detail.applicant_name ?? "—"}`,
    `Date:       ${fmtDate(new Date().toISOString())}`,
    ``,
    `DOCUMENT SUMMARY`,
    `  Verified: ${docOk.length} of ${detail.documents.length} document(s)`,
  ];
  if (docFailed.length > 0) {
    lines.push(`  Missing/Unclear:`);
    docFailed.forEach(d => lines.push(`    - ${d.filename}`));
  }
  if (fails.length > 0) {
    lines.push(``, `CHECKLIST OBSERVATIONS`);
    fails.forEach(f => lines.push(`  - ${f.validation_type.replaceAll("_", " ")}: ${f.message}`));
  }
  if (warns.length > 0) {
    lines.push(``, `VERIFICATION ITEMS`);
    warns.forEach(w => lines.push(`  - ${w.validation_type.replaceAll("_", " ")}: ${w.message}`));
  }
  if (keyFindings.length > 0) {
    lines.push(``, `CLEARANCE FINDINGS`);
    keyFindings.slice(0, 4).forEach(f => lines.push(`  - ${f}`));
  }
  lines.push(``, `ADVISORY RECOMMENDATION: ${recLabel}`);
  lines.push(``, `AUTHORISED REVIEWER ACTION`);
  lines.push(`Official clearance review completed and recorded.`);
  return lines.join("\n");
}

/* ── Conclusion Modal ──────────────────────────────────────────────── */
function ConclusionModal({
  detail, topIssues, keyFindings, copied, onCopy, onClose,
}: {
  detail: ApplicationDetail;
  topIssues: { validation_type: string; status: string; message: string }[];
  keyFindings: string[];
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  const text = buildConclusion(detail, topIssues, keyFindings);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A243F]/60 backdrop-blur-sm animate-fade-in font-sans">
      <div className="w-full max-w-xl rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl flex flex-col max-h-[90vh] animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#0A243F] text-white">
          <div className="flex items-center gap-2.5">
            <Mail size={17} className="text-[#D5A51A]" />
            <div>
              <p className="text-sm font-bold text-white">Clearance Review Conclusion</p>
              <p className="text-[11px] text-slate-300">Copy text to share with applicant or attach to formal record.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 text-slate-300 hover:bg-white/10 hover:text-white transition"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F8F9FA]">
          <pre className="whitespace-pre-wrap font-mono text-xs text-[#071A2B] leading-relaxed bg-white rounded-xl border border-[#E5E7EB] p-4 shadow-2xs">
            {text}
          </pre>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E5E7EB] bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#66717C] hover:text-[#0A243F] transition"
          >
            Close
          </button>
          <button
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A243F] px-5 py-2 text-xs font-bold text-white hover:bg-[#0d2f50] transition shadow-xs"
          >
            <Copy size={13} className="text-[#D5A51A]" />
            {copied ? "Copied to Clipboard!" : "Copy Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
