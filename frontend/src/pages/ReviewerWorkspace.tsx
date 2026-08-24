// ReviewerWorkspace.tsx — Simplified Decision Cockpit.
// Shows status + clickable navigation cards for Evidence, Validation, AI Assessment.
// Removes: Document Status section, Validation Summary section, AI Status section.
// Keeps: Status row, Why this needs review, Evidence card, Validation card, AI Assessment card, Final Decision.
import { useState } from "react";
import type { FormEvent } from "react";
import {
  AlertTriangle, BarChart3, BookOpen, CheckCircle2, ClipboardList,
  ExternalLink, MessageSquare, Sparkles, UserCheck, XCircle,
} from "lucide-react";
import {
  AlertBanner, EmptyState, FindingCard, PageHeader,
  RecommendationBadge, RiskBadge, TechnicalDetails, TechRow,
} from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail, WorkflowResponse } from "../types/api";

/* ── Helpers ──────────────────────────────────────────────────────── */
function derivePriority(detail: ApplicationDetail): { label: string; color: string } {
  const st  = (detail.status ?? "").toUpperCase();
  const rec = (detail.ai_recommendation ?? "").toUpperCase();
  const pred = detail.predictions?.[detail.predictions.length - 1];
  if (!st.includes("AWAITING_HUMAN_REVIEW")) return { label: "—", color: "text-slate-400" };
  if (pred?.prediction_class === "HIGH_RISK"   || rec.includes("REJECT"))        return { label: "High",   color: "text-rose-600 font-bold" };
  if (pred?.prediction_class === "MEDIUM_RISK" || rec.includes("CLARIFICATION")) return { label: "Medium", color: "text-amber-600 font-semibold" };
  if (pred?.prediction_class === "LOW_RISK"    || rec.includes("APPROVE"))       return { label: "Normal", color: "text-emerald-600" };
  return { label: "—", color: "text-slate-400" };
}

function pct(v: number | null | undefined) { return v != null && v > 0 ? `${Math.round(v * 100)}%` : "N/A"; }

const DECISION_OPTIONS = [
  { value: "APPROVE",              label: "✓  Approve",              activeCls: "border-emerald-500 bg-emerald-600 text-white", cls: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100" },
  { value: "REQUEST_CLARIFICATION", label: "⚠  Request Clarification", activeCls: "border-amber-500 bg-amber-500 text-white",   cls: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" },
  { value: "REJECT",               label: "✕  Reject",               activeCls: "border-rose-500 bg-rose-600 text-white",     cls: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100" },
];

/* ── Clickable navigation card ───────────────────────────────────── */
function NavCard({
  icon, title, count, countLabel, summary, action, onNavigate,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  countLabel?: string;
  summary: string;
  action: string;
  onNavigate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full text-left rounded-xl border border-slate-200 bg-white shadow-sm p-4 hover:border-teal-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 border border-teal-100 shrink-0 group-hover:bg-teal-100 transition">
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{title}</p>
            {count != null && (
              <p className="text-xs text-slate-500 mt-0.5">
                <span className="font-semibold text-slate-700">{count}</span> {countLabel}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">{summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-teal-600 text-xs font-semibold shrink-0 mt-1 group-hover:gap-2 transition-all">
          {action} <ExternalLink size={11} />
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
  const [decision,       setDecision]       = useState("REQUEST_CLARIFICATION");
  const [notes,          setNotes]          = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [feedbackHelpful,setFeedbackHelpful]= useState<"yes" | "no" | null>(null);
  const [feedbackComment,setFeedbackComment]= useState("");
  const [submitted,      setSubmitted]      = useState(false);

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
  const top5  = [...fails, ...warns].slice(0, 5);

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
      <div className="max-w-[600px] mx-auto mt-20 text-center space-y-5 animate-slide-up">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Decision Recorded</h2>
        <p className="text-slate-500 text-sm">Your decision has been submitted and recorded in the audit log.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto space-y-5 animate-slide-up">
      <PageHeader
        title="Reviewer Workspace"
        subtitle={`${detail.project_title ?? "Untitled"} — ${detail.applicant_name ?? ""}`}
        breadcrumb="Case Review"
        actions={<StatusBadge value={detail.status} />}
      />

      {/* ── L1: Status strip ─────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <Tile label="Status">
          <StatusBadge value={detail.status} />
        </Tile>
        <Tile label="AI Recommendation">
          <RecommendationBadge value={detail.ai_recommendation} />
        </Tile>
        <Tile label="Risk">
          <RiskBadge value={pred?.prediction_class} />
        </Tile>
        <Tile label="Priority">
          <span className={`text-sm font-bold ${priority.color}`}>{priority.label}</span>
        </Tile>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">

        {/* ── Left: Info + Navigation cards ───────────────────────── */}
        <div className="space-y-5">

          {/* Why this needs review */}
          {(top5.length > 0 || keyFindings.length > 0) && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-card-in">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-slate-50">
                <AlertTriangle size={14} className="text-amber-500" />
                <h2 className="text-sm font-bold text-slate-800">Why This Needs Review</h2>
                {top5.length > 0 && (
                  <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    {top5.length} issue{top5.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2">
                {top5.map((f, i) => (
                  <FindingCard
                    key={i}
                    status={f.status}
                    title={f.validation_type.replaceAll("_", " ")}
                    message={f.message}
                  />
                ))}
                {keyFindings.slice(0, top5.length === 0 ? 5 : 2).map((f, i) => (
                  <div key={`kf-${i}`} className="flex items-start gap-2 text-sm text-slate-600 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <CheckCircle2 size={13} className="text-teal-500 shrink-0 mt-0.5" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation cards */}
          <div className="space-y-3">
            {/* Evidence */}
            <NavCard
              icon={<BookOpen size={16} className="text-teal-600" />}
              title="Scheme Evidence"
              count={meaningfulEvidence.length}
              countLabel="evidence items"
              summary={meaningfulEvidence.length > 0
                ? "View the scheme guidelines and evidence used to assess this application."
                : "Evidence could not be retrieved for this application."}
              action="View Evidence"
              onNavigate={() => onNavigate?.("details")}
            />

            {/* Validation */}
            <NavCard
              icon={<CheckCircle2 size={16} className="text-emerald-600" />}
              title="Validation"
              count={fails.length + warns.length}
              countLabel={`issue${(fails.length + warns.length) !== 1 ? "s" : ""} found`}
              summary={`${detail.validation_results.length} checks run — ${fails.length} failed, ${warns.length} need verification.`}
              action="View Validation"
              onNavigate={() => onNavigate?.("validation")}
            />

            {/* AI Assessment */}
            <NavCard
              icon={<BarChart3 size={16} className="text-violet-600" />}
              title="AI Assessment"
              count={confidence ? Math.round(confidence * 100) : undefined}
              countLabel="% confidence"
              summary="View risk score, key factors, and detailed AI reasoning."
              action="View Assessment"
              onNavigate={() => onNavigate?.("scoring")}
            />
          </div>

          {/* AI Feedback */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-violet-500" />
                <h3 className="text-xs font-bold text-slate-700">Was the AI assessment helpful?</h3>
              </div>
            </div>
            <form onSubmit={handleFeedback} className="p-4 space-y-3">
              <div className="flex gap-2">
                {(["yes", "no"] as const).map(v => (
                  <button key={v} type="button" onClick={() => setFeedbackHelpful(v)}
                    className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                      feedbackHelpful === v
                        ? v === "yes" ? "border-teal-400 bg-teal-50 text-teal-700" : "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}>
                    {v === "yes" ? "Yes, helpful" : "Not helpful"}
                  </button>
                ))}
              </div>
              <textarea rows={2}
                className="form-input resize-none text-xs"
                placeholder="Optional comments…"
                value={feedbackComment}
                onChange={e => setFeedbackComment(e.target.value)}
              />
              <button type="submit" disabled={busy || feedbackHelpful === null}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition disabled:opacity-40">
                Submit Feedback
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: Decision Form ─────────────────────────────────── */}
        <div className="space-y-4">
          {/* Confidence pill */}
          {confidence && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">AI Confidence</p>
              <p className="text-4xl font-black text-teal-600">{pct(confidence)}</p>
              <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden mx-4">
                <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${confidence * 100}%` }} />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
              <UserCheck size={16} className="text-teal-600" />
              <div>
                <h2 className="text-sm font-bold text-slate-800">Final Reviewer Decision</h2>
                <p className="text-xs text-slate-400">Recorded to audit log immediately.</p>
              </div>
            </div>

            <form onSubmit={handleDecision} className="p-5 space-y-4">
              {detail.ai_recommendation && (
                <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <span className="text-xs text-slate-500 shrink-0">AI recommends:</span>
                  <RecommendationBadge value={detail.ai_recommendation} />
                </div>
              )}

              <div className="space-y-2">
                {DECISION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDecision(opt.value)}
                    className={`w-full rounded-lg border px-4 py-3 text-sm font-bold text-left transition-all ${
                      decision === opt.value ? opt.activeCls : opt.cls
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {isOverride && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                    <AlertTriangle size={12} /> Your decision differs from the AI recommendation.
                  </p>
                  <textarea rows={2} required
                    className="form-input resize-none text-sm"
                    placeholder="Reason for your decision…"
                    value={overrideReason}
                    onChange={e => setOverrideReason(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  <MessageSquare size={12} /> Reviewer Notes
                </label>
                <textarea
                  rows={3}
                  className="form-input resize-none"
                  placeholder="Conditions, clarification requests, comments…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
                <CheckCircle2 size={13} className="text-teal-600 shrink-0" />
                <p className="text-xs text-teal-700 font-semibold">Human reviewer has final authority.</p>
              </div>

              <button
                type="submit"
                disabled={busy}
                className={`w-full rounded-xl px-5 py-3 text-sm font-black text-white transition-all shadow-sm disabled:opacity-50 ${
                  decision === "APPROVE"  ? "bg-emerald-600 hover:bg-emerald-700" :
                  decision === "REJECT"   ? "bg-rose-600 hover:bg-rose-700" :
                                            "bg-amber-500 hover:bg-amber-600"
                }`}
              >
                {busy ? "Submitting…" : "Submit Final Decision"}
              </button>
            </form>
          </div>

          <TechnicalDetails label="Technical reference">
            <TechRow label="Application ID" value={detail.id} />
            <TechRow label="Status (raw)"   value={detail.status} />
            <TechRow label="Processing"     value={detail.processing_status} />
            <TechRow label="Last updated"   value={detail.updated_at} />
          </TechnicalDetails>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */
function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
      {children}
    </div>
  );
}
