import { Play, AlertTriangle, FileText, Activity, ScanText } from "lucide-react";
import { ProcessFlow } from "../components/ProcessFlow";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
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
  if (!detail) {
    return (
      <SectionPanel title="Application Processing Workflow">
        <div className="p-8 text-center text-sm text-[#64748B]">
          No application selected. Select an application from the{" "}
          <span className="font-bold text-[#0F766E]">Dashboard</span> to inspect
          or trigger processing.
        </div>
      </SectionPanel>
    );
  }

  const nodesToRender =
    workflow?.nodes && workflow.nodes.length > 0
      ? workflow.nodes
      : FULL_WORKFLOW_NODES;
  const currentNode =
    (workflow?.state?.current_node as string | undefined) ??
    detail.processing_status ??
    "INGEST";
  const maybeErrors = (workflow?.state as { errors?: unknown[] } | undefined)?.errors;
  const workflowErrors = Array.isArray(maybeErrors)
    ? (maybeErrors as Array<{ code?: string; message?: string }>)
    : [];
  const processingFailed =
    detail.processing_status === "FAILED" ||
    detail.status === "PROCESSING_FAILED";

  return (
    <div className="space-y-6">
      {/* Processing Banner Header */}
      <div className="panel border-l-4 border-l-[#0F766E] bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                Application Processing &amp; Workflow Lineage
              </h1>
              <span className="ai-boundary-badge">LangGraph Workflow Engine</span>
            </div>
            <p className="mt-1 text-xs text-[#475569]">
              Case:{" "}
              <strong className="text-[#0F172A]">
                {detail.project_title ?? "Selected Case"}
              </strong>{" "}
              - Tracking node states, document extractions &amp; automated pipeline steps.
            </p>
          </div>
          <button
            className="primary-button text-sm py-2 px-4 shadow-md"
            onClick={onProcess}
            disabled={busy}
          >
            <Play size={16} aria-hidden="true" />
            {busy ? "Processing Pipeline..." : "Run Processing Pipeline"}
          </button>
        </div>
      </div>

      {/* Processing Error Banner */}
      {processingFailed && workflowErrors.length > 0 && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
            <AlertTriangle size={16} />
            Processing Failed
          </div>
          {workflowErrors.map((err, i) => (
            <div key={i} className="text-xs text-rose-700 font-mono">
              [{err.code ?? "ERROR"}] {err.message}
            </div>
          ))}
        </div>
      )}

      {/* Visual Workflow Lineage Node Stepper */}
      <SectionPanel
        title="Workflow Pipeline Lineage"
        action={
          <div className="flex items-center gap-2 text-xs font-semibold text-[#475569]">
            <Activity size={14} className="text-[#0F766E]" />
            <span>
              Graph Status:{" "}
              <strong className="text-[#0F766E]">
                {workflow?.graph_available
                  ? "Active Graph Engine"
                  : "Linear Processing"}
              </strong>
            </span>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-[#64748B]">
              Current Node State:
            </span>
            <StatusBadge value={detail.processing_status} />
          </div>
          <ProcessFlow nodes={nodesToRender} currentNode={currentNode} />
        </div>
      </SectionPanel>

      {/* Grid: Current Node Payload + Document Processing Health */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* State Viewer */}
        <SectionPanel title="Active Node Execution State">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#0F172A] uppercase tracking-wider">
                Node Payload Data
              </span>
              <span className="font-mono text-[11px] text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {currentNode}
              </span>
            </div>
            <pre className="max-h-64 overflow-auto rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] p-3 text-xs font-mono text-[#0F172A]">
              {JSON.stringify(
                workflow?.state ?? {
                  current_node: currentNode,
                  processing_status: detail.processing_status,
                },
                null,
                2
              )}
            </pre>
          </div>
        </SectionPanel>

        {/* Document Processing Health */}
        <SectionPanel
          title={`Case Document Processing Status (${detail.documents.length})`}
        >
          <div className="space-y-3">
            {detail.documents.map((doc) => {
              const meta = doc.metadata_json ?? {};
              const metaOcrStatus = typeof meta.ocr_status === "string" ? meta.ocr_status : undefined;
              const ocrStatus = doc.ocr_status ?? metaOcrStatus;
              const ocrConfidence = doc.ocr_confidence;
              const extractionProvider: string | undefined =
                typeof meta.extraction_provider === "string" ? meta.extraction_provider : undefined;
              const classificationProvider: string | undefined =
                doc.classification_provider ??
                (typeof meta.classification_provider === "string" ? meta.classification_provider : undefined);
              const processingError =
                typeof meta.processing_error === "string" ? meta.processing_error : undefined;
              const processingErrorMessage =
                typeof meta.processing_error_message === "string" ? meta.processing_error_message : "";
              return (
                <div
                  key={doc.id}
                  className="p-3 rounded-xl border border-[#CBD5E1] bg-white space-y-2"
                >
                  <div className="font-bold text-[#0F172A] text-xs flex items-center justify-between gap-2">
                    <span className="truncate flex items-center gap-1.5">
                      <FileText size={15} className="text-[#0F766E]" />
                      {doc.filename}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700 uppercase">
                      {doc.document_type || "DOCUMENT"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                    <StatusBadge value={doc.extraction_status} />
                    <StatusBadge value={doc.validation_status} />
                    {ocrStatus && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-semibold text-purple-800">
                        <ScanText size={10} />
                        OCR: {ocrStatus}
                        {ocrConfidence != null
                          ? ` (${(ocrConfidence * 100).toFixed(0)}%)`
                          : ""}
                      </span>
                    )}
                  </div>
                  {(extractionProvider || classificationProvider) && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      {extractionProvider && (
                        <>
                          Extracted by:{" "}
                          <span className="text-slate-700">
                            {extractionProvider}
                          </span>
                        </>
                      )}
                      {classificationProvider && (
                        <>
                          {" "}
                          - Classified by:{" "}
                          <span className="text-slate-700">
                            {classificationProvider}
                            {doc.classification_confidence != null
                              ? ` (${(doc.classification_confidence * 100).toFixed(0)}%)`
                              : ""}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  {processingError && (
                    <div className="text-[10px] text-rose-700 font-mono bg-rose-50 rounded px-2 py-1">
                      {processingError}: {processingErrorMessage}
                    </div>
                  )}
                </div>
              );
            })}
            {!detail.documents.length && (
              <div className="py-6 text-xs text-[#64748B] italic text-center">
                No documents uploaded for processing.
              </div>
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
