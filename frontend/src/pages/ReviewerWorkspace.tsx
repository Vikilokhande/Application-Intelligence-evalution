import { UserCheck, Sparkles, ShieldCheck, FileText, CheckCircle2, MessageSquare } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { DecisionPanel } from "../components/DecisionPanel";
import { EvidenceList } from "../components/EvidenceList";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail } from "../types/api";

export function ReviewerWorkspace({
  detail,
  onDecision,
  onFeedback,
  busy
}: {
  detail: ApplicationDetail | null;
  onDecision: (payload: Record<string, unknown>) => Promise<void>;
  onFeedback: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  if (!detail) {
    return (
      <SectionPanel title="AI-Assisted Review Cockpit">
        <div className="p-8 text-center text-sm text-[#64748B]">
          No application selected for review. Select a case from the <span className="font-bold text-[#0F766E]">Dashboard</span> to enter the review cockpit.
        </div>
      </SectionPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Review Cockpit Header */}
      <div className="panel border-l-4 border-l-[#0F766E] bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                AI-Assisted Review Cockpit
              </h1>
              <span className="human-boundary-badge">✓ Human Authority</span>
            </div>
            <p className="mt-1 text-xs text-[#475569]">
              Review application context, inspect evidence findings, and render authorized human determination.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2">
            <UserCheck size={16} className="text-[#0F766E]" />
            <div className="text-xs font-bold text-[#0F766E]">AUTHORIZED REVIEW WORKSPACE</div>
          </div>
        </div>
      </div>

      {/* 3-Part Layout Cockpit */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: Application Context + Documents (3 Cols) */}
        <div className="space-y-5 lg:col-span-3">
          <SectionPanel title="Case Profile">
            <div className="space-y-3 text-xs">
              <Field label="Applicant Name" value={detail.applicant_name ?? "Pending"} />
              <Field label="Project Title" value={detail.project_title ?? "Untitled"} />
              <Field label="Category" value={detail.project_category ?? "Unassigned"} />
              <div>
                <span className="field-label">Current Status</span>
                <div className="mt-1">
                  <StatusBadge value={detail.status} />
                </div>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel title="Reviewer Assignment">
            <div className="space-y-2 text-xs">
              <div className="font-bold text-[#0F172A] flex items-center gap-1.5">
                <UserCheck size={14} className="text-[#0F766E]" />
                {String(detail.reviewer_assignment?.reviewer_role ?? "Authorized Case Reviewer").replaceAll("_", " ")}
              </div>
              <div className="text-[#475569] bg-[#F8FAFC] p-2.5 rounded-lg border border-slate-200">
                {String(detail.reviewer_assignment?.routing_reason ?? "Routed according to scheme escalation guidelines.")}
              </div>
            </div>
          </SectionPanel>

          <SectionPanel title={`Case Documents (${detail.documents.length})`}>
            <div className="space-y-2 text-xs">
              {detail.documents.map((doc) => (
                <div key={doc.id} className="p-2.5 rounded-lg border border-slate-200 bg-white flex items-center justify-between gap-2">
                  <span className="font-bold text-[#0F172A] truncate flex items-center gap-1.5">
                    <FileText size={14} className="text-[#0F766E] shrink-0" /> {doc.filename}
                  </span>
                  <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    {doc.processing_status}
                  </span>
                </div>
              ))}
              {!detail.documents.length && <div className="text-[#64748B] italic">No documents attached.</div>}
            </div>
          </SectionPanel>
        </div>

        {/* CENTER COLUMN: Evidence Inspection & Audit Comments (5 Cols) */}
        <div className="space-y-5 lg:col-span-5">
          <SectionPanel title="Extracted Evidence & Traces">
            <EvidenceList evidence={detail.evidence} />
          </SectionPanel>

          <SectionPanel title="Historical Decision Audit Stream">
            <div className="divide-y divide-[#E2E8F0] space-y-2">
              {detail.audit_trail
                .filter((event) => ["decision_submitted", "clarification_requested", "ai_overridden", "review_opened"].includes(String(event.event_type || event.action)))
                .map((event, index) => (
                  <div className="py-2.5 text-xs space-y-1" key={index}>
                    <div className="flex items-center justify-between font-bold text-[#0F172A]">
                      <span className="uppercase text-[11px] text-[#0F766E] flex items-center gap-1">
                        <CheckCircle2 size={12} /> {String(event.event_type || event.action).replaceAll("_", " ")}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">
                        {event.timestamp ? new Date(String(event.timestamp)).toLocaleTimeString() : `#${index + 1}`}
                      </span>
                    </div>
                    <p className="text-[#475569] font-mono text-[11px] bg-[#F8FAFC] p-2 rounded border border-slate-100">
                      {JSON.stringify(event.event_payload || event.details || {})}
                    </p>
                  </div>
                ))}
              {!detail.audit_trail.length && (
                <div className="py-4 text-xs text-[#64748B] italic text-center">No decision audit events recorded yet.</div>
              )}
            </div>
          </SectionPanel>

          <FeedbackForm onSubmit={onFeedback} busy={busy} />
        </div>

        {/* RIGHT COLUMN: AI Recommendation vs Final Human Decision Panel (4 Cols) */}
        <div className="space-y-5 lg:col-span-4">
          <DecisionPanel recommendation={detail.ai_recommendation} onSubmit={onDecision} busy={busy} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="font-bold text-[#0F172A] truncate">{value}</div>
    </div>
  );
}

function FeedbackForm({
  onSubmit,
  busy
}: {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [feedbackType, setFeedbackType] = useState("AI_RECOMMENDATION_CORRECT");
  const [comment, setComment] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      reviewer_id: "demo-reviewer",
      feedback_type: feedbackType,
      comment,
      metadata: { source: "reviewer_workspace" }
    });
    setComment("");
  }

  return (
    <SectionPanel title="Model Feedback & Evaluation Notes">
      <form className="space-y-3" onSubmit={submit}>
        <label className="block">
          <span className="field-label">Feedback Category</span>
          <select className="w-full text-xs" value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
            <option value="AI_RECOMMENDATION_CORRECT">AI recommendation correct</option>
            <option value="AI_RECOMMENDATION_INCORRECT">AI recommendation incorrect</option>
            <option value="RULE_INCORRECT">Rule condition incorrect</option>
            <option value="MISSING_EVIDENCE">Missing evidence trace</option>
            <option value="EXTRACTION_ERROR">Document extraction error</option>
            <option value="SCORE_MISLEADING">Risk score misleading</option>
          </select>
        </label>
        <label className="block">
          <span className="field-label">Reviewer Operational Notes</span>
          <textarea
            className="w-full text-xs min-h-16"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add operational notes or model feedback..."
          />
        </label>
        <div className="flex justify-end">
          <button className="secondary-button text-xs py-1.5 px-3" type="submit" disabled={busy}>
            <MessageSquare size={13} /> Record Feedback
          </button>
        </div>
      </form>
    </SectionPanel>
  );
}
