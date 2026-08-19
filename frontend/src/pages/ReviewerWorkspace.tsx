import { DecisionPanel } from "../components/DecisionPanel";
import { EvidenceList } from "../components/EvidenceList";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail } from "../types/api";
import type { FormEvent } from "react";
import { useState } from "react";

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
    return <SectionPanel title="Reviewer Workspace">Select or create an application.</SectionPanel>;
  }

  return (
    <div className="space-y-4">
      <DecisionPanel recommendation={detail.ai_recommendation} onSubmit={onDecision} busy={busy} />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <SectionPanel title="Case Summary">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Applicant" value={detail.applicant_name ?? "Pending"} />
            <Field label="Project" value={detail.project_title ?? "Untitled"} />
            <Field label="Recommendation" value={detail.ai_recommendation?.replaceAll("_", " ") ?? "Pending"} />
            <div>
              <div className="text-xs uppercase tracking-[0.08em] text-slate-500">Status</div>
              <div className="mt-1">
                <StatusBadge value={detail.status} />
              </div>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Reviewer Assignment">
          <div className="space-y-2 text-sm">
            <div className="font-semibold text-ink">{String(detail.reviewer_assignment?.reviewer_role ?? "Unassigned").replaceAll("_", " ")}</div>
            <div className="text-slate-600">{String(detail.reviewer_assignment?.routing_reason ?? "Routing pending")}</div>
          </div>
        </SectionPanel>
      </div>

      <SectionPanel title="Evidence">
        <EvidenceList evidence={detail.evidence} />
      </SectionPanel>

      <SectionPanel title="Comments">
        <div className="divide-y divide-line">
          {detail.audit_trail
            .filter((event) => ["decision_submitted", "clarification_requested", "ai_overridden"].includes(String(event.event_type)))
            .map((event, index) => (
              <div className="py-3 text-sm" key={`${event.event_type}-${index}`}>
                <div className="font-medium text-ink">{String(event.event_type).replaceAll("_", " ")}</div>
                <code className="text-xs text-slate-600">{JSON.stringify(event.event_payload)}</code>
              </div>
            ))}
        </div>
      </SectionPanel>

      <FeedbackForm onSubmit={onFeedback} busy={busy} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-ink">{value}</div>
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
    <SectionPanel title="Feedback">
      <form className="grid gap-3 md:grid-cols-[260px_1fr_120px]" onSubmit={submit}>
        <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" value={feedbackType} onChange={(event) => setFeedbackType(event.target.value)}>
          <option value="AI_RECOMMENDATION_CORRECT">AI recommendation correct</option>
          <option value="AI_RECOMMENDATION_INCORRECT">AI recommendation incorrect</option>
          <option value="RULE_INCORRECT">Rule incorrect</option>
          <option value="MISSING_EVIDENCE">Missing evidence</option>
          <option value="EXTRACTION_ERROR">Extraction error</option>
          <option value="SCORE_MISLEADING">Score misleading</option>
        </select>
        <input className="rounded-md border border-line px-3 py-2 text-sm" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Reviewer comment" />
        <button className="secondary-button" type="submit" disabled={busy}>
          Record
        </button>
      </form>
    </SectionPanel>
  );
}
