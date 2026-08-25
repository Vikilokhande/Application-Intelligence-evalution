// ApplicationProcessing.tsx — Clean, Human-Readable Sequential Review Pipeline.
// Palette: Deep Navy Blue (#0A243F), Dark Navy (#071A2B), Mustard Gold (#D5A51A), Warm Off-White (#F8F9FA), White (#FFFFFF), Slate Gray (#66717C).
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Check, Loader2, PlayCircle, Sparkles,
  ShieldCheck, ArrowRight, Layers, X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail, WorkflowResponse } from "../types/api";

interface PipelineStageDef {
  id: string;
  stepNum: string;
  titleKey: string;
  defaultTitle: string;
  subKey: string;
  defaultSub: string;
  descKey: string;
  defaultDesc: string;
}

const STAGE_DEFS: PipelineStageDef[] = [
  { stepNum: "01", id: "received",    titleKey: "processing.stage_received_title",    defaultTitle: "Application Received", subKey: "processing.stage_received_sub",    defaultSub: "Intake Logged",     descKey: "processing.stage_received_desc",    defaultDesc: "Application form metadata and applicant identity successfully registered." },
  { stepNum: "02", id: "documents",   titleKey: "processing.stage_documents_title",   defaultTitle: "Documents Checked",     subKey: "processing.stage_documents_sub",   defaultSub: "Files Verified",    descKey: "processing.stage_documents_desc",   defaultDesc: "Required clearance reports, certificates, and attachments verified." },
  { stepNum: "03", id: "extraction",  titleKey: "processing.stage_extraction_title",  defaultTitle: "Data Extracted",        subKey: "processing.stage_extraction_sub",  defaultSub: "Key Field Data",    descKey: "processing.stage_extraction_desc",  defaultDesc: "Project costs, boundaries, schedules, and entity details extracted." },
  { stepNum: "04", id: "validation",  titleKey: "processing.stage_validation_title",  defaultTitle: "Validation",           subKey: "processing.stage_validation_sub",  defaultSub: "Consistency Audit", descKey: "processing.stage_validation_desc",  defaultDesc: "Cross-document consistency and data boundary checks completed." },
  { stepNum: "05", id: "rules",       titleKey: "processing.stage_rules_title",       defaultTitle: "Rule Check",           subKey: "processing.stage_rules_sub",       defaultSub: "Policy Compliance", descKey: "processing.stage_rules_desc",       defaultDesc: "Deterministic environmental guidelines and statutory thresholds evaluated." },
  { stepNum: "06", id: "assessment",  titleKey: "processing.stage_assessment_title",  defaultTitle: "AI Assessment",        subKey: "processing.stage_assessment_sub",  defaultSub: "Decision Support",  descKey: "processing.stage_assessment_desc",  defaultDesc: "Risk indicators analyzed and decision support advisory generated." },
  { stepNum: "07", id: "decision",    titleKey: "processing.stage_decision_title",    defaultTitle: "Reviewer Decision",    subKey: "processing.stage_decision_sub",    defaultSub: "Officer Sign-Off",  descKey: "processing.stage_decision_desc",    defaultDesc: "Case summary prepared for authorized Government Officer review." },
];

type StageStatus = "completed" | "active" | "failed" | "pending";

function getInitialStageIndex(ps: string, st: string): number {
  if (st.includes("APPROVED") || st.includes("REJECTED") || st.includes("CLARIFICATION")) return 7;
  if (st.includes("AWAITING_HUMAN_REVIEW") || ps.includes("AWAITING_HUMAN_REVIEW") || ps === "COMPLETED" || ps === "PROCESSED") return 7;
  if (ps.includes("AI") || ps.includes("LLM") || ps.includes("REASON")) return 6;
  if (ps.includes("SCOR") || ps.includes("ML") || ps.includes("RULE")) return 5;
  if (ps.includes("VALID") || ps.includes("EVIDENCE") || ps.includes("RAG")) return 4;
  if (ps.includes("EXTRACT") || ps.includes("NORMALIZ")) return 3;
  if (ps.includes("DOCUMENT") || ps.includes("CLASSIF") || ps.includes("OCR")) return 2;
  return 1;
}

export function ApplicationProcessing({
  detail,
  workflow: _workflow,
  busy,
  onProcess,
}: {
  detail: ApplicationDetail | null;
  workflow: WorkflowResponse | null;
  busy: boolean;
  onProcess: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [activeStageIdx, setActiveStageIdx] = useState<number>(0);
  const [dismissed, setDismissed]           = useState<boolean>(false);

  const ps = (detail?.processing_status ?? "NOT_STARTED").toUpperCase();
  const st = (detail?.status ?? "").toUpperCase();

  const isCompleted  = ps === "COMPLETED" || ps === "PROCESSED" || ps.includes("AWAITING") || st.includes("AWAITING") || st.includes("APPROVED") || st.includes("REJECTED") || st.includes("CLARIFICATION");
  const isFailed     = ps === "FAILED" || ps === "ERROR" || st === "FAILED";
  const isProcessing = busy || ps === "PROCESSING";
  const canProcess   = !busy && !isCompleted;

  // Travelling animation ticker during execution
  useEffect(() => {
    if (busy) {
      setDismissed(false);
      setActiveStageIdx(0);
      const interval = setInterval(() => {
        setActiveStageIdx((prev) => {
          if (prev < STAGE_DEFS.length - 1) return prev + 1;
          return prev;
        });
      }, 850);
      return () => clearInterval(interval);
    } else {
      setActiveStageIdx(getInitialStageIndex(ps, st) - 1);
    }
  }, [busy, ps, st]);

  if (!detail) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-[#66717C] animate-slide-up font-sans">
        <PlayCircle size={44} className="text-[#66717C]" />
        <p className="text-sm font-semibold text-[#071A2B]">{t("audit.empty_desc", "Select an application from the Dashboard to view its audit history.")}</p>
      </div>
    );
  }

  const currentStageDef = STAGE_DEFS[Math.min(activeStageIdx, STAGE_DEFS.length - 1)];

  const stageStatuses: StageStatus[] = STAGE_DEFS.map((s, i) => {
    if (isCompleted && !busy) return "completed";
    if (isFailed && i === activeStageIdx) return "failed";
    if (i < activeStageIdx) return "completed";
    if (i === activeStageIdx && isProcessing) return "active";
    if (i === 0 && !isProcessing && !isCompleted) return "completed";
    return "pending";
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-slide-up font-sans">
      <PageHeader
        title={t("processing.title", "Application Processing Pipeline")}
        subtitle={detail.project_title ?? t("processing.subtitle", "Sequential automated extraction, validation, and AI risk analysis")}
        breadcrumb={t("nav.group_case_review", "Case Review")}
        actions={<StatusBadge value={detail.status} />}
      />

      {/* ── Ready to Process Card ──────────────────────────── */}
      {canProcess && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center shadow-xs space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-1 text-xs font-bold text-[#B45309]">
            <span className="h-2 w-2 rounded-full bg-[#D5A51A]" />
            <span>{t("processing.current_stage", "Ready for Processing")}</span>
          </div>

          <div className="space-y-1.5 max-w-xl mx-auto">
            <h2 className="text-2xl font-extrabold text-[#0A243F] tracking-tight">
              {t("processing.start_btn", "Start Ingestion & Analysis Pipeline")}
            </h2>
            <p className="text-sm text-[#66717C] leading-relaxed">
              {t("processing.subtitle", "Sequential automated extraction, validation, and AI risk analysis")}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onProcess}
              disabled={busy}
              className="inline-flex items-center gap-2.5 rounded-xl bg-[#D5A51A] px-8 py-3.5 font-sans text-sm font-bold text-[#071A2B] hover:bg-[#b88c14] active:scale-[0.98] transition shadow-xs disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 size={18} className="animate-spin text-[#071A2B]" />
                  <span>{t("processing.running", "Processing Case...")}</span>
                </>
              ) : (
                <>
                  <span>{t("processing.start_btn", "Start Ingestion & Analysis Pipeline")}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Completed Status Banner ───────────────────────────────── */}
      {isCompleted && !busy && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A243F] text-white shrink-0">
              <Check size={18} strokeWidth={3} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide text-[#0A243F]">
                {t("processing.pipeline_complete_title", "Pipeline Processing Complete")}
              </p>
              <p className="text-xs text-[#66717C] mt-0.5">
                {t("processing.pipeline_complete_desc", "All automated checks and evidence extraction have finished. The case is ready for human review.")}
              </p>
            </div>
          </div>
          <span className="font-sans text-xs font-bold text-[#0A243F] border border-[#0A243F]/20 bg-[#0A243F]/5 px-3.5 py-1.5 rounded-xl shrink-0">
            {t("common.passed", "VERIFIED")}
          </span>
        </div>
      )}

      {/* ── Sequential Processing Pipeline Card ─────────────────────────── */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 lg:p-8 shadow-xs space-y-8">
        {/* Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A243F]/10 text-[#0A243F]">
              <Layers size={16} />
            </div>
            <div>
              <h2 className="font-sans text-sm font-bold tracking-wide text-[#0A243F]">
                {t("processing.title", "Sequential Verification Pipeline")}
              </h2>
              <p className="font-sans text-[11px] text-[#66717C]">7-Stage Continuous Review Workflow</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 text-[11px] font-semibold text-[#B45309]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#D5A51A]" />
            <span>{t("common.app_tagline", "STANDARDIZED GOVERNMENT WORKFLOW")}</span>
          </div>
        </div>

        {/* Desktop Pipeline Visual Track */}
        <div className="hidden lg:flex items-start justify-between relative pt-2 pb-4">
          {STAGE_DEFS.map((stage, i) => {
            const status = stageStatuses[i];
            const isLast = i === STAGE_DEFS.length - 1;
            const stageTitle = t(stage.titleKey, stage.defaultTitle);
            const stageSub = t(stage.subKey, stage.defaultSub);

            return (
              <div key={stage.id} className="flex-1 flex flex-col items-center relative group">
                {/* Connecting Track Line */}
                {!isLast && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-[3px] -z-0 transition-all duration-700 ${
                      status === "completed"
                        ? "bg-[#0A243F]"
                        : status === "active"
                        ? "bg-gradient-to-r from-[#0A243F] via-[#D5A51A] to-[#E5E7EB] animate-pulse"
                        : "bg-[#E5E7EB]"
                    }`}
                  />
                )}

                {/* Circular Stage Node */}
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    status === "completed"
                      ? "border-[#0A243F] bg-[#0A243F] text-white shadow-xs"
                      : status === "active"
                      ? "border-[#D5A51A] bg-[#0A243F] text-[#D5A51A] shadow-md ring-4 ring-[#D5A51A]/30 scale-110"
                      : status === "failed"
                      ? "border-rose-500 bg-rose-50 text-rose-700"
                      : "border-[#E5E7EB] bg-[#F8FAFC] text-[#66717C]"
                  }`}
                >
                  {status === "completed" ? (
                    <Check size={16} strokeWidth={3} />
                  ) : status === "active" ? (
                    <Loader2 size={16} className="animate-spin text-[#D5A51A]" />
                  ) : (
                    <span className="font-mono text-xs font-bold">{stage.stepNum}</span>
                  )}
                </div>

                {/* Stage Titles & Subtext */}
                <div className="text-center mt-3 px-1 max-w-[125px]">
                  <p className="font-mono text-[9px] font-bold text-[#66717C] uppercase tracking-wider">
                    {t("common.details", "STEP")} {stage.stepNum}
                  </p>
                  <p
                    className={`font-sans text-xs font-bold leading-tight mt-0.5 ${
                      status === "active"
                        ? "text-[#0A243F]"
                        : status === "completed"
                        ? "text-[#0A243F]"
                        : "text-[#66717C]"
                    }`}
                  >
                    {stageTitle}
                  </p>
                  <p className="font-sans text-[10px] text-[#66717C] mt-0.5 leading-snug">
                    {stageSub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile / Tablet Responsive Pipeline */}
        <div className="lg:hidden space-y-2.5">
          {STAGE_DEFS.map((stage, i) => {
            const status = stageStatuses[i];
            const stageTitle = t(stage.titleKey, stage.defaultTitle);
            const stageDesc = t(stage.descKey, stage.defaultDesc);

            return (
              <div
                key={stage.id}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                  status === "active"
                    ? "border-[#0A243F] bg-[#0A243F] text-white"
                    : status === "completed"
                    ? "border-[#E5E7EB] bg-[#F8FAFC] text-[#071A2B]"
                    : "border-[#E5E7EB] bg-white text-[#66717C]"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-mono font-bold text-xs shrink-0 ${
                    status === "active"
                      ? "bg-[#D5A51A] text-[#071A2B]"
                      : status === "completed"
                      ? "bg-[#0A243F] text-white"
                      : "bg-[#F8FAFC] text-[#66717C]"
                  }`}
                >
                  {status === "completed" ? <Check size={14} strokeWidth={3} /> : status === "active" ? <Loader2 size={14} className="animate-spin" /> : stage.stepNum}
                </div>
                <div className="min-w-0">
                  <p className="font-sans text-xs font-bold leading-tight">{stageTitle}</p>
                  <p className={`text-[10px] ${status === "active" ? "text-[#E5E7EB]" : "text-[#66717C]"}`}>{stageDesc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Focused Fullscreen Blur Modal During Pipeline Execution ─────────────────────────────── */}
      {isProcessing && !dismissed && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 animate-fade-in select-none"
          style={{
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            backgroundColor: "rgba(7, 26, 43, 0.75)",
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/20 bg-white shadow-2xl overflow-hidden animate-slide-up relative">
            {/* Modal Header in Deep Navy */}
            <div className="bg-[#0A243F] p-6 text-white space-y-3 relative">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D5A51A]/40 bg-[#D5A51A]/20 px-3 py-1 text-xs font-bold text-[#D5A51A]">
                  <Sparkles size={13} />
                  <span>STEP {currentStageDef.stepNum} OF 07 · {t("common.processing", "EXECUTING")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin text-[#D5A51A]" />
                  <button
                    type="button"
                    onClick={() => setDismissed(true)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/20 text-slate-300 hover:bg-white/10 hover:text-white transition focus:outline-none"
                    title={t("common.close", "Close")}
                    aria-label="Close loading overlay"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-white leading-tight">
                  {t(currentStageDef.titleKey, currentStageDef.defaultTitle)}
                </h3>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  {t(currentStageDef.descKey, currentStageDef.defaultDesc)}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 bg-[#F8F9FA] space-y-5">
              <div className="flex flex-col items-center justify-center py-2 space-y-2">
                <div className="relative flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full border-4 border-[#0A243F]/20 border-t-[#D5A51A] animate-spin" />
                  <Sparkles size={18} className="absolute text-[#0A243F]" />
                </div>
                <p className="text-xs font-bold text-[#0A243F] uppercase tracking-wider">{t("processing.running", "Processing Application Package…")}</p>
              </div>

              {/* Progress track */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#66717C]">
                  <span>{t("processing.stage_extraction_sub", "Verification Progress")}</span>
                  <span className="text-[#0A243F] font-black font-mono">
                    {Math.round(((activeStageIdx + 1) / STAGE_DEFS.length) * 100)}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#E5E7EB] overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#0A243F] via-[#D5A51A] to-[#0A243F] transition-all duration-700 shadow-2xs"
                    style={{ width: `${Math.max(((activeStageIdx + 1) / STAGE_DEFS.length) * 100, 14)}%` }}
                  />
                </div>
              </div>

              {/* Travelling Mini Stage Dots */}
              <div className="grid grid-cols-7 gap-1.5">
                {STAGE_DEFS.map((s, i) => (
                  <div
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i < activeStageIdx
                        ? "bg-[#0A243F]"
                        : i === activeStageIdx
                        ? "bg-[#D5A51A] animate-pulse scale-y-125"
                        : "bg-[#E5E7EB]"
                    }`}
                  />
                ))}
              </div>

              <div className="rounded-xl border border-[#E5E7EB] bg-white p-3 flex items-center justify-between text-xs text-[#66717C]">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck size={14} className="text-[#0A243F]" />
                  {t("common.app_tagline", "Automated Clearance Check")}
                </span>
                <span className="font-semibold text-[#0A243F]">{t("common.processing", "Processing...")}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
