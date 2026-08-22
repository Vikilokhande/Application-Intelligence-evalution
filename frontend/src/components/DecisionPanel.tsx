// Structural Idea: A docked forensic decision cockpit framing reviewer authority with automatic AI override detection, dark token inputs, and zero emojis.

import { AlertTriangle, ShieldCheck, UserCheck } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";

export function DecisionPanel({
  recommendation,
  onSubmit,
  busy,
}: {
  recommendation?: string | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  busy?: boolean;
}) {
  const [decision, setDecision] = useState("REQUEST_CLARIFICATION");
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");

  // Normalize AI recommendation for automatic override detection
  const normRec = (recommendation || "").toUpperCase();
  let mappedRec = "REQUEST_CLARIFICATION";
  if (normRec.includes("APPROVE")) mappedRec = "APPROVE";
  else if (normRec.includes("REJECT")) mappedRec = "REJECT";
  else if (normRec.includes("CLARIF") || normRec.includes("EXPERT") || normRec.includes("REVIEW"))
    mappedRec = "REQUEST_CLARIFICATION";

  // Automatic override detection: true if selected decision differs from AI recommendation
  const isOverride = decision !== mappedRec;

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      reviewer_id: "demo-reviewer",
      decision,
      comments,
      override_ai_recommendation: isOverride,
      override_reason: isOverride ? reason : null,
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[10px] border border-[#22303A] bg-[#131A21] font-sans text-[#E8EDF1] overflow-hidden"
    >
      {/* ── Cockpit Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22303A] px-4 py-2.5 bg-[#0B0F14]/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#3DDC84]/40 bg-[#3DDC84]/10 text-[#3DDC84] shrink-0">
            <UserCheck size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-[#E8EDF1]">
                3. HUMAN REVIEW DECISION COCKPIT
              </h2>
              <span className="font-mono text-[9px] font-bold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px] uppercase">
                AUTHORIZED HUMAN FINAL
              </span>
            </div>
            <p className="text-[11px] text-[#8B99A6] mt-0.5">
              Decisions are permanently logged to the Directorate audit ledger.
            </p>
          </div>
        </div>

        {/* AI Recommendation badge */}
        <div className="flex items-center gap-2 rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 font-mono shrink-0">
          <span className="text-[10px] text-[#8B99A6] uppercase">AI REC:</span>
          <span className="text-xs font-bold text-[#3DDC84] uppercase">
            {recommendation?.replaceAll("_", " ") ?? "PENDING EVALUATION"}
          </span>
        </div>
      </div>

      {/* ── Controls ───────────────────────────────────────────────────── */}
      <div className="p-4 space-y-4 font-mono text-xs">
        {/* Row 1: Decision Action + Alignment Status side-by-side */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Decision dropdown */}
          <div>
            <label className="block text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1.5">
              DECISION ACTION <span className="text-[#D9534F]">*</span>
            </label>
            <select
              className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-2.5 text-xs font-semibold text-[#E8EDF1] focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
            >
              <option value="APPROVE">APPROVE APPLICATION</option>
              <option value="REJECT">REJECT APPLICATION</option>
              <option value="REQUEST_CLARIFICATION">REQUEST CLARIFICATION</option>
            </select>
          </div>

          {/* Override / alignment indicator */}
          <div>
            <label className="block text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1.5">
              AI ALIGNMENT STATUS
            </label>
            <div
              className={`flex items-center gap-2 rounded-[6px] border px-3 py-2.5 text-xs font-semibold transition-colors ${
                isOverride
                  ? "border-[#E0A93D] bg-[#E0A93D]/10 text-[#E0A93D]"
                  : "border-[#3DDC84]/30 bg-[#3DDC84]/5 text-[#3DDC84]"
              }`}
            >
              {isOverride ? (
                <>
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>AI OVERRIDE DETECTED</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={15} className="shrink-0" />
                  <span>ALIGNS WITH AI RECOMMENDATION</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Reviewer notes (full width) */}
        <div>
          <label className="block text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1.5">
            REVIEWER AUDIT NOTES
          </label>
          <textarea
            rows={3}
            className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-2.5 text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84] resize-none leading-relaxed"
            placeholder="Add operational notes or specific clarification requests for audit ledger..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>

        {/* Row 3: Mandatory override reason (only shown on override) */}
        {isOverride && (
          <div className="rounded-[8px] border border-[#E0A93D]/30 bg-[#E0A93D]/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#E0A93D] uppercase tracking-wider">
              <AlertTriangle size={12} />
              MANDATORY OVERRIDE RATIONALE <span className="text-[#D9534F]">*</span>
              <span className="text-[#8B99A6] font-normal normal-case tracking-normal ml-1">— Required for Audit Trail</span>
            </div>
            <textarea
              rows={2}
              className="w-full rounded-[6px] border border-[#E0A93D]/50 bg-[#0B0F14] px-3 py-2 text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#E0A93D] resize-none leading-relaxed"
              placeholder="Document forensic reason for overriding AI recommendation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
        )}
      </div>

      {/* ── Submit Footer ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#22303A] bg-[#0B0F14]/30">
        <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#8B99A6]">
          <ShieldCheck size={13} className="text-[#3DDC84]" />
          <span>AUDIT TRACEABLE DECISION RECORD</span>
        </div>
        <div className="flex items-center gap-2">
          {(comments || reason || decision !== mappedRec) && (
            <button
              type="button"
              onClick={() => {
                setDecision(mappedRec);
                setComments("");
                setReason("");
              }}
              className="font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#8B99A6] hover:text-[#E8EDF1] hover:border-[#8B99A6] transition-colors"
            >
              CLEAR FORM
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-5 py-2 rounded-[6px] border border-[#3DDC84] bg-[#3DDC84] text-[#0B0F14] hover:bg-[#3DDC84]/90 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] disabled:opacity-50 transition-colors"
          >
            {busy ? "RECORDING..." : "SUBMIT DECISION"}
          </button>
        </div>
      </div>
    </form>
  );
}
