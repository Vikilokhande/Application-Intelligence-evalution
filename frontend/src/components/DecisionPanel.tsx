import { ShieldCheck } from "lucide-react";
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
    <form onSubmit={submit} className="rounded-md border-2 border-pine bg-[#F4FBF7] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-pine text-white">
          <ShieldCheck size={20} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-ink">Human Decision</h2>
          <p className="text-sm text-slate-600">AI recommendation: {recommendation?.replaceAll("_", " ") ?? "Pending"}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Decision
          <select className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2" value={decision} onChange={(event) => setDecision(event.target.value)}>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
            <option value="REQUEST_CLARIFICATION">Request clarification</option>
            <option value="OVERRIDE_AI_RECOMMENDATION">Override AI recommendation</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} />
          Override AI recommendation
        </label>
      </div>

      {override && (
        <label className="mt-3 block text-sm font-medium text-slate-700">
          Override reason
          <textarea className="mt-1 min-h-20 w-full rounded-md border border-line bg-white px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value)} required />
        </label>
      )}

      <label className="mt-3 block text-sm font-medium text-slate-700">
        Comments
        <textarea className="mt-1 min-h-24 w-full rounded-md border border-line bg-white px-3 py-2" value={comments} onChange={(event) => setComments(event.target.value)} />
      </label>

      <div className="mt-4 flex justify-end">
        <button type="submit" className="primary-button" disabled={busy}>
          Submit Decision
        </button>
      </div>
    </form>
  );
}

