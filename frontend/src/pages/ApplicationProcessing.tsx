// Structural Idea: A forensic workflow lineage telemetry console displaying real-time LangGraph node execution
// states, pipeline lineage progression, and node payload inspection within a single viewport.

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Play,
  ScanText,
  Terminal,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { ProcessFlow } from "../components/ProcessFlow";
import type { ApplicationDetail, WorkflowResponse } from "../types/api";

const FULL_WORKFLOW_NODES = [
  "INGEST",
  "CLASSIFY",
  "EXTRACT",
  "NORMALIZE",
  "VALIDATE",
  "RULE_EVALUATION",
  "FEATURE_ENGINEERING",
  "ML_SCORING",
  "EXPLAIN",
  "ROUTE",
  "HUMAN_REVIEW",
];

// ── Status pill helper ────────────────────────────────────────────────────────
function StatusPill({ label, status }: { label: string; status: string }) {
  const s = (status ?? "").toUpperCase();
  const isOk = ["EXTRACTED", "VALIDATED", "PROCESSED", "SUCCESS", "OK", "COMPLETED"].includes(s);
  const isFail = ["FAILED", "ERROR", "OCR_FAILED", "PROVIDER_UNAVAILABLE"].includes(s);
  const isPending = ["PENDING", "PROCESSING", "NOT_STARTED", "QUEUED"].includes(s);

  const cls = isOk
    ? "text-[#3DDC84] bg-[#3DDC84]/10 border-[#3DDC84]/30"
    : isFail
    ? "text-[#D9534F] bg-[#D9534F]/10 border-[#D9534F]/30"
    : isPending
    ? "text-[#F0A500] bg-[#F0A500]/10 border-[#F0A500]/30"
    : "text-[#8B99A6] bg-[#22303A]/40 border-[#22303A]";

  const icon = isOk ? (
    <CheckCircle2 size={10} />
  ) : isFail ? (
    <XCircle size={10} />
  ) : isPending ? (
    <Clock size={10} />
  ) : null;

  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase ${cls}`}>
      {icon}
      {label}: {s}
    </span>
  );
}

// ── Confidence bar ─────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "#3DDC84" : pct >= 45 ? "#F0A500" : "#D9534F";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 rounded-full bg-[#22303A] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="font-mono text-[9px] text-[#8B99A6] shrink-0">{pct}%</span>
    </div>
  );
}

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
  const [errorExpanded, setErrorExpanded] = useState(false);
  const [payloadExpanded, setPayloadExpanded] = useState(true);
  const [showRawJson, setShowRawJson] = useState(false);

  if (!detail) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-10 text-center font-mono text-xs text-[#8B99A6] max-w-md">
          <Terminal size={24} className="text-[#3DDC84] mx-auto mb-3" />
          NO CASE SELECTED. SELECT AN APPLICATION FROM THE{" "}
          <span className="text-[#3DDC84]">DASHBOARD</span> TO INSPECT OR TRIGGER PIPELINE PROCESSING.
        </div>
      </div>
    );
  }

  const nodesToRender =
    workflow?.nodes && workflow.nodes.length > 0 ? workflow.nodes : FULL_WORKFLOW_NODES;
  const currentNode =
    (workflow?.state?.current_node as string | undefined) ?? detail.processing_status ?? "INGEST";
  const maybeErrors = (workflow?.state as { errors?: unknown[] } | undefined)?.errors;
  const workflowErrors = Array.isArray(maybeErrors)
    ? (maybeErrors as Array<{ code?: string; message?: string }>)
    : [];
  const processingFailed =
    detail.processing_status === "FAILED" || detail.status === "PROCESSING_FAILED";

  const statusColor =
    detail.processing_status === "PROCESSED"
      ? "text-[#3DDC84]"
      : detail.processing_status === "FAILED"
      ? "text-[#D9534F]"
      : "text-[#F0A500]";

  return (
    <div className="relative flex flex-col gap-3 font-sans text-[#E8EDF1] max-w-[1400px] mx-auto pb-4">
      {/* Subtle topographic background */}
      <div className="pointer-events-none absolute -inset-4 z-0 overflow-hidden opacity-[0.06]" aria-hidden="true">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <path d="M 0,100 Q 250,60 500,130 T 1000,90 M 0,210 Q 300,170 600,240 T 1000,190 M 0,320 Q 200,290 500,350 T 1000,310" fill="none" stroke="#3DDC84" strokeWidth="1.5" />
          <path d="M 0,150 Q 350,190 700,130 T 1000,210 M 0,260 Q 200,300 500,250 T 1000,300" fill="none" stroke="#22303A" strokeWidth="2" />
        </svg>
      </div>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84] shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase">
                PROCESSING WORKFLOW TELEMETRY
              </h1>
              <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px] shrink-0">
                LANGGRAPH ENGINE
              </span>
            </div>
            <p className="text-xs text-[#8B99A6] mt-0.5 truncate">
              Case:{" "}
              <strong className="text-[#E8EDF1]">{detail.project_title ?? "Selected Case"}</strong>
              {" "}• Node lineage & execution tracking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Current node badge */}
          <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px] border border-[#22303A] bg-[#0B0F14] px-2.5 py-1.5 rounded-[6px]">
            <span className="text-[#8B99A6]">STATE:</span>
            <span className={`font-bold uppercase ${statusColor}`}>
              {detail.processing_status.replaceAll("_", " ")}
            </span>
          </div>
          <button
            onClick={onProcess}
            disabled={busy}
            className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-[6px] border border-[#3DDC84] bg-[#3DDC84] text-[#0B0F14] hover:bg-[#3DDC84]/90 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] disabled:opacity-50 transition-colors"
          >
            <Play size={14} />
            <span>{busy ? "PROCESSING..." : "RUN PIPELINE"}</span>
          </button>
        </div>
      </div>

      {/* ── ERROR BANNER (compact, expandable) ─────────────────────────────── */}
      {processingFailed && workflowErrors.length > 0 && (
        <div className="relative z-10 rounded-[6px] border border-[#D9534F] bg-[#D9534F]/10 overflow-hidden shrink-0">
          <button
            onClick={() => setErrorExpanded((v) => !v)}
            className="w-full flex items-center justify-between px-3 py-2 font-mono text-xs text-[#D9534F] font-bold uppercase tracking-wider hover:bg-[#D9534F]/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} />
              <span>PIPELINE EXECUTION FAILED — {workflowErrors.length} ERROR{workflowErrors.length > 1 ? "S" : ""}</span>
            </div>
            {errorExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {errorExpanded && (
            <div className="px-3 pb-3 space-y-1.5 border-t border-[#D9534F]/20">
              {workflowErrors.map((err, i) => (
                <div key={i} className="font-mono text-[11px] text-[#E8EDF1] bg-[#0B0F14] rounded p-2 leading-relaxed">
                  <span className="text-[#D9534F] font-bold">[{err.code ?? "ERROR"}]</span>{" "}
                  {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PIPELINE LINEAGE STEPPER ────────────────────────────────────────── */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-3.5 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
            <Activity size={13} className="text-[#3DDC84]" />
            <span>WORKFLOW PIPELINE LINEAGE</span>
          </div>
          <span className="font-mono text-[10px] text-[#8B99A6]">
            GRAPH:{" "}
            <strong className={workflow?.graph_available ? "text-[#3DDC84]" : "text-[#F0A500]"}>
              {workflow?.graph_available ? "ACTIVE LANGGRAPH" : "LINEAR ENGINE"}
            </strong>
          </span>
        </div>
        <ProcessFlow nodes={nodesToRender} currentNode={currentNode} failed={processingFailed} />
      </div>

      {/* ── BOTTOM SPLIT: Payload (40%) + Document Health (60%) ─────────────── */}
      {/* md:grid-cols-2 gives a sensible mid-breakpoint before lg kicks in */}
      <div className="relative z-10 grid gap-3 md:grid-cols-2 lg:grid-cols-5">

        {/* LEFT: Active Node Payload (40% = 2 cols) */}
        <div className="lg:col-span-2 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden min-w-0">
          <button
            onClick={() => setPayloadExpanded((v) => !v)}
            className="flex items-center justify-between border-b border-[#22303A] px-3.5 py-2.5 bg-[#0B0F14]/60 shrink-0 hover:bg-[#0B0F14]/80 transition-colors w-full"
          >
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              ACTIVE NODE PAYLOAD
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-[#3DDC84] border border-[#3DDC84]/30 bg-[#3DDC84]/10 px-2 py-0.5 rounded-[4px] uppercase">
                {currentNode.replaceAll("_", " ")}
              </span>
              {/* FIX 3 / FEATURE: JSON toggle — stopPropagation so it doesn't collapse the panel */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowRawJson((v) => !v); }}
                className="font-mono text-[9px] font-bold border border-[#22303A] bg-[#0B0F14] text-[#8B99A6] hover:text-[#3DDC84] hover:border-[#3DDC84] px-2 py-0.5 rounded-[4px] uppercase transition-colors"
              >
                {showRawJson ? "VIEW SUMMARY" : "</> VIEW JSON"}
              </button>
              {payloadExpanded ? <ChevronUp size={12} className="text-[#8B99A6]" /> : <ChevronDown size={12} className="text-[#8B99A6]" />}
            </div>
          </button>

          {payloadExpanded && (
            /* Relative wrapper so fade overlay positions against the scroll area */
            <div className="relative flex-1 min-h-0">
              <div
                className="overflow-y-auto p-3 pb-4 max-h-[calc(100vh-320px)] min-h-[220px]"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(61,220,132,0.4) #22303A",
                }}
              >
                {showRawJson ? (
                  /* Raw JSON view — unchanged */
                  <pre className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 font-mono text-[11px] text-[#E8EDF1] overflow-x-auto leading-relaxed whitespace-pre-wrap break-words">
                    {JSON.stringify(
                      workflow?.state ?? {
                        current_node: currentNode,
                        processing_status: detail.processing_status,
                      },
                      null,
                      2
                    )}
                  </pre>
                ) : (
                  /* Human-readable summary view */
                  (() => {
                    const state = (workflow?.state ?? {}) as Record<string, unknown>;
                    const docIds = Array.isArray(state.document_ids) ? state.document_ids : [];
                    const extractedData = Array.isArray(state.extracted_data) ? state.extracted_data : [];
                    const validationResults = Array.isArray(state.validation_results) ? state.validation_results : [];
                    const normalizedProfile = state.normalized_profile;
                    const isNormalized =
                      normalizedProfile != null &&
                      typeof normalizedProfile === "object" &&
                      Object.keys(normalizedProfile as object).length > 0;
                    // Total doc count — already available, used as denominator
                    const totalDocs = docIds.length > 0 ? docIds.length : detail.documents.length;
                    const appId = (state.application_id as string | undefined) ?? detail.id ?? "—";

                    return (
                      <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-2.5">

                        {/* Application ID — truncated with ellipsis, full UUID on hover */}
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <span className="font-mono text-[11px] text-[#8B99A6] shrink-0">Application ID</span>
                          <span
                            className="font-mono text-[11px] text-[#E8EDF1] text-right truncate min-w-0 overflow-hidden"
                            title={appId}
                          >
                            {appId}
                          </span>
                        </div>

                        {/* Current Node */}
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-mono text-[11px] text-[#8B99A6] shrink-0">Current Node</span>
                          <span className="font-mono text-[11px] text-[#E8EDF1] text-right">
                            {(state.current_node as string | undefined)?.replaceAll("_", " ") ?? currentNode.replaceAll("_", " ")}
                          </span>
                        </div>

                        {/* Pipeline Status */}
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-mono text-[11px] text-[#8B99A6] shrink-0">Pipeline Status</span>
                          <span className="font-mono text-[11px] text-[#E8EDF1] text-right">
                            {detail.processing_status.replaceAll("_", " ")}
                          </span>
                        </div>

                        {/* Documents Attached */}
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-mono text-[11px] text-[#8B99A6] shrink-0">Documents Attached</span>
                          <span className="font-mono text-[11px] text-[#E8EDF1] text-right tabular-nums">{totalDocs}</span>
                        </div>

                        {/* Extracted — X / Y denominator */}
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-mono text-[11px] text-[#8B99A6] shrink-0">Extracted</span>
                          <span className="font-mono text-[11px] text-[#E8EDF1] text-right tabular-nums">
                            {extractedData.length}
                            <span className="text-[#8B99A6]"> / {totalDocs}</span>
                          </span>
                        </div>

                        {/* Normalized — badge so it reads as status, not a count */}
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-mono text-[11px] text-[#8B99A6] shrink-0">Normalized</span>
                          <span
                            className={`font-mono text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase ${
                              isNormalized
                                ? "text-[#3DDC84] bg-[#3DDC84]/10 border-[#3DDC84]/30"
                                : "text-[#8B99A6] bg-[#22303A]/40 border-[#22303A]"
                            }`}
                          >
                            {isNormalized ? "YES" : "NOT YET"}
                          </span>
                        </div>

                        {/* Validated — X / Y denominator */}
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-mono text-[11px] text-[#8B99A6] shrink-0">Validated</span>
                          <span className="font-mono text-[11px] text-[#E8EDF1] text-right tabular-nums">
                            {validationResults.length}
                            <span className="text-[#8B99A6]"> / {totalDocs}</span>
                          </span>
                        </div>

                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Document Processing Health (60% = 3 cols) */}
        {/* max-h caps growth dynamically with viewport; min-w-0 prevents grid overflow */}
        <div className="lg:col-span-3 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden min-w-0">
          <div className="flex items-center justify-between border-b border-[#22303A] px-3.5 py-2.5 bg-[#0B0F14]/60 shrink-0">
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              DOCUMENT PROCESSING HEALTH
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px]">
                {detail.documents.length} DOC{detail.documents.length !== 1 ? "S" : ""}
              </span>
              <span className="font-mono text-[10px] text-[#8B99A6] hidden sm:inline">INGESTION MATRIX</span>
            </div>
          </div>

          {/* overflow-y-auto + dynamic max-h: scrolls with many docs and expands automatically on window resize */}
          <div className="overflow-y-auto p-3 space-y-2.5 max-h-[calc(100vh-320px)] min-h-[220px]"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(61,220,132,0.4) #22303A" }}
          >
            {detail.documents.map((doc) => {
              const meta = doc.metadata_json ?? {};
              const metaOcrStatus = typeof meta.ocr_status === "string" ? meta.ocr_status : undefined;
              const ocrStatus = doc.ocr_status ?? metaOcrStatus;
              const ocrConfidence = doc.ocr_confidence;
              const classificationConfidence = typeof doc.classification_confidence === "number" ? doc.classification_confidence : null;
              const extractionProvider: string | undefined =
                typeof meta.extraction_provider === "string" ? meta.extraction_provider : undefined;
              const classificationProvider: string | undefined =
                doc.classification_provider ??
                (typeof meta.classification_provider === "string" ? meta.classification_provider : undefined);
              const processingError =
                typeof meta.processing_error === "string" ? meta.processing_error : undefined;
              const processingErrorMessage =
                typeof meta.processing_error_message === "string" ? meta.processing_error_message : "";
              const isFailed = doc.extraction_status === "FAILED" || !!processingError;
              const isDone = doc.extraction_status === "EXTRACTED";

              return (
                <div
                  key={doc.id}
                  className={`rounded-[8px] border bg-[#0B0F14] p-3 font-mono text-xs transition-colors ${
                    isFailed
                      ? "border-[#D9534F]/40"
                      : isDone
                      ? "border-[#3DDC84]/30"
                      : "border-[#22303A]"
                  }`}
                >
                  {/* Row 1: Filename + type badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border ${
                        isFailed ? "border-[#D9534F]/40 text-[#D9534F]" : "border-[#22303A] text-[#3DDC84]"
                      }`}>
                        <FileText size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[#E8EDF1] text-[11px]">{doc.filename}</p>
                        <p className="text-[9px] text-[#8B99A6] truncate">
                          {extractionProvider ? `PARSER: ${extractionProvider}` : ""}
                          {classificationProvider ? ` · CLASSIFIER: ${classificationProvider}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase ${
                      isFailed
                        ? "text-[#D9534F] border-[#D9534F]/30 bg-[#D9534F]/10"
                        : "text-[#3DDC84] border-[#3DDC84]/30 bg-[#3DDC84]/10"
                    }`}>
                      {doc.document_type || "UNKNOWN"}
                    </span>
                  </div>

                  {/* Row 2: Status pills */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <StatusPill label="EXTRACT" status={doc.extraction_status ?? "PENDING"} />
                    <StatusPill label="VALIDATE" status={doc.validation_status ?? "PENDING"} />
                    {ocrStatus && (
                      <span className="inline-flex items-center gap-1 font-mono text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase text-[#8B99A6] bg-[#22303A]/40 border-[#22303A]">
                        <ScanText size={9} />
                        OCR: {ocrStatus}
                        {ocrConfidence != null ? ` (${(ocrConfidence * 100).toFixed(0)}%)` : ""}
                      </span>
                    )}
                  </div>

                  {/* Row 3: Classification confidence bar (only if available) */}
                  {classificationConfidence != null && (
                    <div className="mb-1.5">
                      <p className="text-[9px] text-[#8B99A6] mb-1 uppercase tracking-wider">Classification Confidence (per document)</p>
                      <ConfidenceBar value={classificationConfidence} />
                    </div>
                  )}

                  {/* Error message (collapsed by default) */}
                  {processingError && (
                    <div className="mt-2 rounded-[5px] border border-[#D9534F]/30 bg-[#D9534F]/8 p-2 text-[10px] text-[#D9534F] leading-relaxed">
                      <span className="font-bold">[{processingError}]</span>{" "}
                      <span className="text-[#E8EDF1]/70">{processingErrorMessage}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {!detail.documents.length && (
              <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                <FileText size={22} className="text-[#22303A] mb-2" />
                <p className="font-mono text-xs text-[#8B99A6]">NO DOCUMENTS IN PIPELINE</p>
                <p className="font-mono text-[10px] text-[#8B99A6]/60 mt-1">Upload documents via New Application</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
