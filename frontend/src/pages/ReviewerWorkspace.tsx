// Structural Idea: An authorized reviewer workspace pairing case context and evidence traces on the left with historical audit stream and docked human decision cockpit on the right.

import {
  CheckCircle2,
  FileText,
  MessageSquare,
  ShieldCheck,
  Terminal,
  UserCheck,
} from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { DecisionPanel } from "../components/DecisionPanel";
import { EvidenceList } from "../components/EvidenceList";
import type { ApplicationDetail } from "../types/api";

export function ReviewerWorkspace({
  detail,
  onDecision,
  onFeedback,
  busy,
}: {
  detail: ApplicationDetail | null;
  onDecision: (payload: Record<string, unknown>) => Promise<void>;
  onFeedback: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  if (!detail) {
    return (
      <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-8 text-center font-mono text-xs text-[#8B99A6]">
        NO CASE SELECTED FOR REVIEW. SELECT A CASE FROM THE{" "}
        <span className="text-[#3DDC84]">DASHBOARD</span> TO ENTER THE REVIEW COCKPIT.
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-3 font-sans text-[#E8EDF1] max-w-[1400px] mx-auto pb-4">
      {/* Topographic Contour Background Layer Signature Motif */}
      <div
        className="pointer-events-none absolute -inset-4 z-0 overflow-hidden opacity-[0.08]"
        aria-hidden="true"
      >
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,80 Q 250,40 500,110 T 1000,70 M 0,190 Q 300,150 600,220 T 1000,180 M 0,300 Q 200,270 500,330 T 1000,290"
            fill="none"
            stroke="#3DDC84"
            strokeWidth="1.5"
          />
          <path
            d="M 0,130 Q 350,170 700,110 T 1000,190 M 0,240 Q 200,280 500,230 T 1000,280 M 0,370 Q 450,400 800,350 T 1000,420"
            fill="none"
            stroke="#22303A"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Reviewer Workspace Telemetry Header Strip */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84] shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase truncate">
                AI-ASSISTED REVIEW COCKPIT
              </h1>
              <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px] shrink-0">
                HUMAN AUTHORITY ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#8B99A6] mt-0.5 truncate">
              Review case context, evidence findings, and render authorized human determination for:{" "}
              <strong className="text-[#E8EDF1]">
                {detail.project_title ?? "Selected Case"}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 rounded-[6px] shrink-0">
          <UserCheck size={14} className="text-[#3DDC84]" />
          <span className="text-[#3DDC84] font-bold uppercase">
            AUTHORIZED WORKSPACE
          </span>
        </div>
      </div>

      {/* Main Forensic Analysis & Decision Cockpit Layout */}
      <div className="relative z-10 grid gap-3 lg:grid-cols-12 lg:items-start">
        {/* LEFT COLUMN (5 Cols): Case Profile & Attached Documents */}
        <div className="lg:col-span-5 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#22303A] px-3.5 py-2.5 bg-[#0B0F14]/60 shrink-0">
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              1. CASE PROFILE & DOCUMENTS
            </h2>
            <span className="font-mono text-[10px] text-[#8B99A6]">METADATA</span>
          </div>

          <div className="relative flex-1 min-h-0">
            <div
              className="p-3.5 space-y-3 overflow-y-auto max-h-[calc(100vh-260px)]"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(61,220,132,0.4) #22303A",
              }}
            >
              {/* Case Profile Card */}
              <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-2.5 font-mono text-xs">
                <Field label="APPLICANT NAME" value={detail.applicant_name ?? "PENDING"} />
                <Field label="PROJECT TITLE" value={detail.project_title ?? "UNTITLED"} />
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#22303A]">
                  <Field label="CATEGORY" value={detail.project_category ?? "UNASSIGNED"} />
                  <div>
                    <span className="block text-[10px] font-bold text-[#8B99A6] uppercase mb-1">
                      CURRENT STATUS
                    </span>
                    <span className="inline-block font-bold px-2 py-0.5 rounded border border-[#3DDC84]/30 bg-[#3DDC84]/10 text-[#3DDC84] text-[10px] uppercase truncate max-w-full">
                      {detail.status.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reviewer Assignment Escalate Card */}
              <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-1.5 font-mono text-xs">
                <div className="font-bold text-[#E8EDF1] uppercase flex items-center gap-1.5">
                  <UserCheck size={14} className="text-[#3DDC84]" />
                  <span>
                    {String(
                      detail.reviewer_assignment?.reviewer_role ??
                        "SENIOR REVIEWER"
                    ).replaceAll("_", " ")}
                  </span>
                </div>
                <p className="text-[11px] text-[#8B99A6] font-sans leading-relaxed">
                  {String(
                    detail.reviewer_assignment?.routing_reason ??
                      "Routed according to Directorate scheme escalation guidelines."
                  )}
                </p>
              </div>

              {/* Case Documents List */}
              <div className="space-y-2 font-mono text-xs">
                <div className="font-bold text-[#8B99A6] text-[10px] uppercase flex items-center justify-between">
                  <span>ATTACHED DOCUMENTS ({detail.documents.length})</span>
                  <span className="text-[#3DDC84]">VERIFIED</span>
                </div>

                <div className="space-y-1.5">
                  {detail.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-2.5 flex items-center justify-between gap-2"
                    >
                      <span className="font-semibold text-[#E8EDF1] truncate flex items-center gap-1.5">
                        <FileText size={14} className="text-[#3DDC84] shrink-0" />
                        <span className="truncate">{doc.filename}</span>
                      </span>
                      <span className="text-[9px] text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-1.5 py-0.5 rounded uppercase shrink-0">
                        {doc.processing_status}
                      </span>
                    </div>
                  ))}

                  {!detail.documents.length && (
                    <div className="py-4 text-center text-[#8B99A6] border border-dashed border-[#22303A] rounded">
                      NO ATTACHED DOCUMENTS
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#131A21] to-transparent z-10" />
          </div>
        </div>

        {/* RIGHT COLUMN (7 Cols): Extracted Evidence, Audit Stream & Feedback Form */}
        <div className="lg:col-span-7 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#22303A] px-3.5 py-2.5 bg-[#0B0F14]/60 shrink-0">
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              2. EVIDENCE & AUDIT STREAM
            </h2>
            <span className="font-mono text-[10px] text-[#3DDC84]">TRACES & FEEDBACK</span>
          </div>

          <div className="relative flex-1 min-h-0">
            <div
              className="p-3.5 space-y-4 overflow-y-auto max-h-[calc(100vh-260px)]"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(61,220,132,0.4) #22303A",
              }}
            >
              {/* Extracted Evidence List */}
              <div className="space-y-2">
                <div className="font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
                  RECORDED EVIDENCE TRACES
                </div>
                <EvidenceList evidence={detail.evidence} />
              </div>

              {/* Historical Decision Audit Stream */}
              <div className="space-y-2 pt-3 border-t border-[#22303A]">
                <div className="font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
                  HISTORICAL DECISION AUDIT LOG
                </div>

                <div className="space-y-2 font-mono text-xs">
                  {detail.audit_trail
                    .filter((event) =>
                      [
                        "decision_submitted",
                        "clarification_requested",
                        "ai_overridden",
                        "review_opened",
                      ].includes(String(event.event_type || event.action))
                    )
                    .map((event, index) => (
                      <div
                        key={index}
                        className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-bold text-[#E8EDF1]">
                          <span className="uppercase text-[10px] text-[#3DDC84] flex items-center gap-1.5">
                            <CheckCircle2 size={13} />{" "}
                            {String(
                              event.event_type || event.action
                            ).replaceAll("_", " ")}
                          </span>
                          <span className="text-[10px] text-[#8B99A6] font-normal">
                            {event.timestamp
                              ? new Date(
                                  String(event.timestamp)
                                ).toLocaleTimeString()
                              : `#${index + 1}`}
                          </span>
                        </div>
                        <p className="text-[#8B99A6] text-[11px] break-all bg-[#131A21] p-2 rounded border border-[#22303A] font-mono leading-relaxed">
                          {JSON.stringify(
                            event.event_payload || event.details || {}
                          )}
                        </p>
                      </div>
                    ))}

                  {!detail.audit_trail.length && (
                    <div className="py-4 text-center text-[#8B99A6] text-[11px] border border-dashed border-[#22303A] rounded font-mono">
                      NO DECISION AUDIT EVENTS RECORDED YET
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback Form */}
              <div className="pt-3 border-t border-[#22303A]">
                <FeedbackForm onSubmit={onFeedback} busy={busy} />
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#131A21] to-transparent z-10" />
          </div>
        </div>

        {/* BOTTOM FULL-WIDTH PANEL (12 Cols): Human Review Decision Cockpit */}
        <div className="lg:col-span-12">
          <DecisionPanel
            recommendation={detail.ai_recommendation}
            onSubmit={onDecision}
            busy={busy}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase">
        {label}
      </span>
      <div className="font-mono text-xs font-semibold text-[#E8EDF1] truncate">
        {value}
      </div>
    </div>
  );
}

function FeedbackForm({
  onSubmit,
  busy,
}: {
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  const [feedbackType, setFeedbackType] = useState(
    "AI_RECOMMENDATION_CORRECT"
  );
  const [comment, setComment] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSubmit({
      reviewer_id: "demo-reviewer",
      feedback_type: feedbackType,
      comment,
      metadata: { source: "reviewer_workspace" },
    });
    setComment("");
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-2 font-mono text-xs pt-3 border-t border-[#22303A]"
    >
      <div className="flex items-center gap-1.5 font-bold text-[#E8EDF1] uppercase text-[11px]">
        <MessageSquare size={13} className="text-[#3DDC84]" />
        <span>MODEL EVALUATION FEEDBACK</span>
      </div>

      <label className="block space-y-1">
        <span className="block text-[10px] font-bold text-[#8B99A6] uppercase">
          FEEDBACK CATEGORY
        </span>
        <select
          className="w-full rounded-[6px] border border-[#22303A] bg-[#131A21] px-2.5 py-1.5 text-xs text-[#E8EDF1] focus:outline-none focus:ring-1 focus:ring-[#3DDC84]"
          value={feedbackType}
          onChange={(e) => setFeedbackType(e.target.value)}
        >
          <option value="AI_RECOMMENDATION_CORRECT">AI REC CORRECT</option>
          <option value="AI_RECOMMENDATION_INCORRECT">AI REC INCORRECT</option>
          <option value="RULE_INCORRECT">RULE CONDITION INCORRECT</option>
          <option value="MISSING_EVIDENCE">MISSING EVIDENCE TRACE</option>
          <option value="EXTRACTION_ERROR">EXTRACTION ERROR</option>
          <option value="SCORE_MISLEADING">RISK SCORE MISLEADING</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="block text-[10px] font-bold text-[#8B99A6] uppercase">
          REVIEWER OPERATIONAL NOTES
        </span>
        <textarea
          rows={2}
          className="w-full rounded-[6px] border border-[#22303A] bg-[#131A21] p-2 text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84]"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add operational model feedback..."
        />
      </label>

      <div className="flex justify-end pt-1">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded border border-[#3DDC84] bg-[#3DDC84]/10 text-[#3DDC84] hover:bg-[#3DDC84] hover:text-[#0B0F14] focus:outline-none focus:ring-1 focus:ring-[#3DDC84] transition-colors"
        >
          <MessageSquare size={12} />
          <span>RECORD FEEDBACK</span>
        </button>
      </div>
    </form>
  );
}
