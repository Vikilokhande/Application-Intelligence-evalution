// ApplicationProcessing.tsx — Horizontal processing pipeline with animation.
// Human-readable stages. No technical telemetry in primary view.
import { useState } from "react";
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronRight,
  Clock, Loader2, PlayCircle, Sparkles, XCircle,
} from "lucide-react";
import { AlertBanner, PageHeader, TechnicalDetails, TechRow } from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail, WorkflowResponse } from "../types/api";

/* ── Pipeline stages ─────────────────────────────────────────────── */
interface PipelineStage {
  id: string;
  label: string;
  description: string;
  technicalKey: string;
}

const STAGES: PipelineStage[] = [
  { id: "received",    label: "Application Received",   description: "Application submitted and queued for review.", technicalKey: "received" },
  { id: "documents",  label: "Documents Processed",    description: "Uploaded documents classified and extracted.", technicalKey: "document_processing" },
  { id: "extracted",  label: "Information Extracted",  description: "Key fields and data normalised from documents.", technicalKey: "extraction" },
  { id: "validation", label: "Validation",             description: "Application checked against scheme requirements.", technicalKey: "validation" },
  { id: "evidence",   label: "Evidence Review",        description: "Scheme guidelines verified against application.", technicalKey: "evidence" },
  { id: "risk",       label: "Risk Assessment",        description: "ML model evaluated application risk.", technicalKey: "scoring" },
  { id: "ai",         label: "AI Assessment",          description: "AI generated recommendation and explanation.", technicalKey: "ai_reasoning" },
  { id: "review",     label: "Human Review",           description: "Awaiting final decision from reviewer.", technicalKey: "human_review" },
];

type StageStatus = "completed" | "active" | "failed" | "pending";

function getCurrentStageIndex(ps: string, st: string, busy: boolean): number {
  if (st.includes("APPROVED") || st.includes("REJECTED") || st.includes("CLARIFICATION")) return 8; // all completed
  if (st.includes("AWAITING_HUMAN_REVIEW") || ps.includes("AWAITING_HUMAN_REVIEW") || ps === "COMPLETED" || ps === "PROCESSED") return 7;
  if (ps.includes("AI") || ps.includes("LLM") || ps.includes("REASON")) return 6;
  if (ps.includes("SCOR") || ps.includes("ML") || ps.includes("FEATURE")) return 5;
  if (ps.includes("EVIDENCE") || ps.includes("RAG")) return 4;
  if (ps.includes("VALID")) return 3;
  if (ps.includes("EXTRACT") || ps.includes("NORMALIZ")) return 2;
  if (ps.includes("DOCUMENT") || ps.includes("CLASSIF") || ps.includes("OCR")) return 1;
  if (busy) return 1; // Actively processing
  return 0; // Not started yet, ready at step 1
}

/* ── Status icon ─────────────────────────────────────────────────── */
function StageIcon({ status }: { status: StageStatus }) {
  if (status === "completed") return <CheckCircle2 size={18} className="text-emerald-500" />;
  if (status === "active")    return <Loader2 size={18} className="text-teal-600 animate-spin" />;
  if (status === "failed")    return <XCircle size={18} className="text-rose-500" />;
  return <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-300 bg-white" />;
}

/* ── Connector ───────────────────────────────────────────────────── */
function Connector({ done }: { done: boolean }) {
  return (
    <div className={`hidden sm:block h-0.5 flex-1 min-w-[12px] transition-colors duration-500 ${done ? "bg-emerald-300" : "bg-slate-200"}`} />
  );
}

/* ── Stage Card (vertical fallback for mobile) ───────────────────── */
function MobileStage({ stage, status }: { stage: PipelineStage; status: StageStatus }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
      status === "active"    ? "border-teal-300 bg-teal-50" :
      status === "completed" ? "border-emerald-200 bg-emerald-50/40" :
      status === "failed"    ? "border-rose-200 bg-rose-50/40" :
                               "border-slate-100 bg-white opacity-60"
    }`}>
      <StageIcon status={status} />
      <div>
        <p className={`text-sm font-semibold ${
          status === "active"    ? "text-teal-800" :
          status === "completed" ? "text-emerald-800" :
          status === "failed"    ? "text-rose-800" :
                                   "text-slate-400"
        }`}>{stage.label}</p>
        {status === "active" && <p className="text-xs text-teal-600 mt-0.5">{stage.description}</p>}
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export function ApplicationProcessing({
  detail,
  workflow,
  busy,
  onProcess,
}: {
  detail: ApplicationDetail | null;
  workflow: WorkflowResponse | null;
  busy: boolean;
  onProcess: () => Promise<void>;
}) {
  const [showDetails, setShowDetails] = useState(false);

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400 animate-slide-up">
        <PlayCircle size={40} className="text-slate-300" />
        <p className="text-sm font-medium">Select an application to view processing status.</p>
      </div>
    );
  }

  const ps = (detail.processing_status ?? "NOT_STARTED").toUpperCase();
  const st = (detail.status ?? "").toUpperCase();

  const isCompleted = ps === "COMPLETED" || ps === "PROCESSED" || ps.includes("AWAITING") || st.includes("AWAITING") || st.includes("APPROVED") || st.includes("REJECTED") || st.includes("CLARIFICATION");
  const isFailed = ps === "FAILED" || ps === "ERROR" || st === "FAILED";
  const isProcessing = busy || ps === "PROCESSING";
  const canProcess = !busy && !isCompleted;

  const activeStageIdx = getCurrentStageIndex(ps, st, isProcessing);

  const stageStatuses: StageStatus[] = STAGES.map((s, i) => {
    if (isCompleted) return "completed";
    if (isFailed && i === activeStageIdx) return "failed";
    if (i < activeStageIdx) return "completed";
    if (i === activeStageIdx && isProcessing) return "active";
    if (i === 0 && !isProcessing && !isCompleted) return "completed"; // Application received is done
    return "pending";
  });

  const currentStage = STAGES[Math.min(activeStageIdx, STAGES.length - 1)];

  // Workflow state for technical details
  const wfState = (workflow?.state ?? {}) as Record<string, unknown>;

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 animate-slide-up">
      <PageHeader
        title="Processing"
        subtitle={detail.project_title ?? "Application Processing"}
        breadcrumb="Case Review"
        actions={<StatusBadge value={detail.status} />}
      />

      {/* ── Ready to Process Action Card ──────────────────────────── */}
      {canProcess && (
        <div className="rounded-xl border border-teal-300 bg-gradient-to-r from-teal-50 to-emerald-50 shadow-sm p-6 text-center space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Application Ready for Processing</h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto mt-1">
              Documents have been submitted. Run automated document extraction, scheme validation, policy evidence retrieval, and AI risk assessment.
            </p>
          </div>
          <div>
            <button
              onClick={onProcess}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-8 py-3.5 text-sm font-bold text-white hover:bg-teal-700 active:scale-[0.98] transition shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {busy ? <><Loader2 size={18} className="animate-spin" /> Processing Pipeline…</> : <><PlayCircle size={18} /> Start Processing Application</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Active stage call-out ─────────────────────────────────── */}
      {isProcessing && (
        <div className="rounded-xl border border-teal-300 bg-teal-50 shadow-sm overflow-hidden animate-slide-up">
          <div className="flex items-center gap-4 px-6 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 shrink-0">
              <Loader2 size={22} className="text-teal-600 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-bold text-teal-500 uppercase tracking-wide mb-0.5">Currently Processing</p>
              <p className="text-base font-bold text-teal-900">{currentStage.label}</p>
              <p className="text-sm text-teal-700 mt-0.5">
                Executing automated extraction, validation rules, RAG evidence retrieval, and AI assessment...
              </p>
            </div>
          </div>
          <div className="px-6 pb-4">
            <div className="h-1.5 w-full rounded-full bg-teal-200 overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full animate-pulse"
                style={{ width: `${Math.max(((activeStageIdx + 1) / STAGES.length) * 100, 25)}%` }}
              />
            </div>
            <p className="text-xs text-teal-500 mt-1.5">Processing pipeline running...</p>
          </div>
        </div>
      )}

      {/* ── Pipeline (desktop horizontal) ─────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 hidden sm:block">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-5">Processing Pipeline</p>

        {/* Nodes */}
        <div className="flex items-center gap-0">
          {STAGES.map((stage, i) => {
            const status = stageStatuses[i];
            return (
              <div key={stage.id} className="flex items-center flex-1 min-w-0">
                {/* Stage node */}
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                    status === "completed" ? "border-emerald-400 bg-emerald-50 text-emerald-600" :
                    status === "active"    ? "border-teal-500 bg-teal-50 shadow-md shadow-teal-100 text-teal-600" :
                    status === "failed"    ? "border-rose-400 bg-rose-50 text-rose-600" :
                                            "border-slate-200 bg-slate-50 text-slate-400"
                  }`}>
                    <StageIcon status={status} />
                  </div>
                  <span className={`text-center text-[10px] leading-tight font-semibold ${
                    status === "active"    ? "text-teal-700" :
                    status === "completed" ? "text-emerald-700" :
                    status === "failed"    ? "text-rose-700" :
                                            "text-slate-400"
                  }`} style={{ maxWidth: 72 }}>{stage.label}</span>
                </div>
                {i < STAGES.length - 1 && <Connector done={stageStatuses[i] === "completed"} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Pipeline (mobile vertical) ────────────────────────────── */}
      <div className="sm:hidden space-y-2">
        {STAGES.map((stage, i) => (
          <MobileStage key={stage.id} stage={stage} status={stageStatuses[i]} />
        ))}
      </div>

      {/* ── Stage descriptions ────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STAGES.map((stage, i) => {
          const status = stageStatuses[i];
          return (
            <div key={stage.id} className={`rounded-lg border p-3.5 transition-all animate-card-in ${
              status === "completed" ? "border-emerald-200 bg-emerald-50/40" :
              status === "active"    ? "border-teal-300 bg-teal-50" :
              status === "failed"    ? "border-rose-200 bg-rose-50/40" :
                                       "border-slate-100 bg-slate-50/40 opacity-70"
            }`} style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center gap-2 mb-1">
                <StageIcon status={status} />
                <p className={`text-xs font-bold ${
                  status === "completed" ? "text-emerald-700" :
                  status === "active"    ? "text-teal-700" :
                  status === "failed"    ? "text-rose-700" :
                                           "text-slate-500"
                }`}>{stage.label}</p>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{stage.description}</p>
            </div>
          );
        })}
      </div>

      {/* ── Technical processing details (collapsed) ─────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDetails(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-slate-400" />
            <span>View Processing Details</span>
          </div>
          {showDetails ? <ChevronDown size={15} className="text-slate-400" /> : <ChevronRight size={15} className="text-slate-400" />}
        </button>
        {showDetails && (
          <div className="border-t border-slate-100 p-5 space-y-4">
            <TechnicalDetails label="Processing status">
              <TechRow label="Status (raw)"       value={ps} />
              <TechRow label="Application status" value={detail.status} />
              <TechRow label="Created"            value={detail.created_at} />
              <TechRow label="Last updated"       value={detail.updated_at} />
            </TechnicalDetails>
            {workflow && (
              <TechnicalDetails label="Workflow state">
                <TechRow label="Graph available" value={String(workflow.graph_available)} />
                <TechRow label="Nodes"           value={workflow.nodes?.join(", ")} />
                {Object.entries(wfState).slice(0, 12).map(([k, v]) => (
                  <TechRow key={k} label={k} value={typeof v === "object" ? JSON.stringify(v).slice(0, 80) : String(v)} />
                ))}
              </TechnicalDetails>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
