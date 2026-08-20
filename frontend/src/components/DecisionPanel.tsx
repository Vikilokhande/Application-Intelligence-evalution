import { UserCheck, Sparkles, AlertTriangle, ShieldCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

export function DecisionPanel({
  recommendation,
  onSubmit,
  busy
}: {
  recommendation?: string | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  busy?: boolean;
}) {
  const [decision, setDecision] = useState("REQUEST_CLARIFICATION");
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      reviewer_id: "demo-reviewer",
      decision,
      comments,
      override_ai_recommendation: override,
      override_reason: override ? reason : null
    });
  }

  return (
    <form onSubmit={submit} className="panel border-2 border-[#0F766E]/40 bg-[#F0FDF4] space-y-5">
      {/* Header with AI ASSISTS vs HUMAN DECIDES boundary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-sm">
            <UserCheck size={22} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#0F172A]">Final Human Decision</h2>
              <span className="human-boundary-badge">✓ Human Authority</span>
            </div>
            <p className="text-xs text-[#475569] mt-0.5">Final approval or clarification must be explicitly confirmed by an authorized human reviewer.</p>
          </div>
        </div>

        {/* AI Recommendation Context Badge */}
        <div className="flex items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 px-3.5 py-2">
          <Sparkles size={16} className="text-sky-700" />
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-sky-800">AI Recommendation</div>
            <div className="text-xs font-bold text-sky-900">{recommendation?.replaceAll("_", " ") ?? "Pending Evaluation"}</div>
          </div>
        </div>
      </div>

      {/* Decision Form Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="field-label">Human Action</span>
          <select
            className="w-full"
            value={decision}
            onChange={(event) => setDecision(event.target.value)}
          >
            <option value="APPROVE">Approve Application</option>
            <option value="REJECT">Reject Application</option>
            <option value="REQUEST_CLARIFICATION">Request Clarification</option>
            <option value="OVERRIDE_AI_RECOMMENDATION">Override AI Recommendation</option>
          </select>
        </label>

        <div className="flex items-end">
          <label className="flex h-[42px] w-full items-center gap-3 rounded-lg border border-[#CBD5E1] bg-white px-3.5 text-xs font-semibold text-[#0F172A] cursor-pointer hover:border-[#0D9488]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded accent-[#0F766E]"
              checked={override}
              onChange={(event) => setOverride(event.target.checked)}
            />
            <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <AlertTriangle size={14} /> Override AI Recommendation
            </span>
          </label>
        </div>
      </div>

      {override && (
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-wider text-amber-700 mb-1.5">
            Mandatory Override Reason *
          </span>
          <textarea
            className="min-h-20 w-full border-amber-300 focus:border-amber-500"
            placeholder="Explain why you are overriding the AI model's recommendation for governance auditing..."
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
          />
        </label>
      )}

      <label className="block">
        <span className="field-label">Reviewer Comments & Operational Notes</span>
        <textarea
          className="min-h-24 w-full"
          placeholder="Add operational notes or clarification request details..."
          value={comments}
          onChange={(event) => setComments(event.target.value)}
        />
      </label>

      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
        <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
          <ShieldCheck size={14} className="text-[#0F766E]" /> Action will be recorded to official audit log
        </div>
        <button type="submit" className="primary-button" disabled={busy}>
          {busy ? "Recording Decision..." : "Submit Human Decision"}
        </button>
      </div>
    </form>
  );
}
