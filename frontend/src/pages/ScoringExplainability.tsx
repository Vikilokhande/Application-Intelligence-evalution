// ScoringExplainability.tsx
// Displays XGBoost ML prediction, feature attributions, AI reasoning, and evidence.
// NEVER shows fake default scores — all values come from real pipeline output.

import { AlertTriangle, BrainCircuit, CheckCircle, Info, Sparkles, Terminal, XCircle } from "lucide-react";
import { EvidenceList } from "../components/EvidenceList";
import { ScoreBar } from "../components/ScoreBar";
import { ScoreContributionChart } from "../components/ScoreContributionChart";
import type { ApplicationDetail, WorkflowResponse } from "../types/api";

// ── Class Probability Bars ────────────────────────────────────────────────────

const CLASS_COLORS: Record<string, { bar: string; text: string; border: string }> = {
  LOW_RISK:    { bar: "bg-[#3DDC84]",  text: "text-[#3DDC84]",  border: "border-[#3DDC84]/40" },
  MEDIUM_RISK: { bar: "bg-[#E0A93D]",  text: "text-[#E0A93D]",  border: "border-[#E0A93D]/40" },
  HIGH_RISK:   { bar: "bg-[#D9534F]",  text: "text-[#D9534F]",  border: "border-[#D9534F]/40" },
};

function ClassProbabilityBars({
  probabilities,
  predictionClass,
}: {
  probabilities: Record<string, number> | undefined;
  predictionClass: string | undefined;
}) {
  if (!probabilities) return null;
  const classes: [string, string][] = [
    ["LOW_RISK", "Low Risk"],
    ["MEDIUM_RISK", "Medium Risk"],
    ["HIGH_RISK", "High Risk"],
  ];
  return (
    <div className="space-y-1.5">
      <div className="font-mono text-[10px] text-[#8B99A6] uppercase font-bold tracking-wider">CLASS PROBABILITIES</div>
      {classes.map(([cls, label]) => {
        const prob = (probabilities[cls] ?? 0) * 100;
        const style = CLASS_COLORS[cls];
        const isActive = predictionClass === cls;
        return (
          <div key={cls} className="space-y-0.5">
            <div className="flex justify-between font-mono text-[10px]">
              <span className={`${isActive ? style.text + " font-bold" : "text-[#8B99A6]"}`}>
                {label}{isActive ? " ◄ PREDICTED" : ""}
              </span>
              <span className={`${isActive ? style.text : "text-[#8B99A6]"}`}>{prob.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#0B0F14] border border-[#22303A] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${style.bar} ${isActive ? "opacity-100" : "opacity-40"}`}
                style={{ width: `${prob}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 13-Feature Table ──────────────────────────────────────────────────────────

const FEATURE_SOURCES: Record<string, string> = {
  document_completeness:       "Required document validation",
  required_field_completeness: "Required field validation",
  eligibility_pass_ratio:      "Scheme rule evaluation",
  budget_consistency:          "Cross-document cost comparison",
  certificate_validity:        "Authenticity indicator check",
  contradiction_count:         "Cross-document consistency",
  duplicate_similarity:        "Duplicate detection",
  suspicious_indicator_count:  "Suspicious indicator check",
  document_quality:            "Validation pass/warn/fail ratio",
  proposal_quality:            "Field completeness + extraction confidence",
  project_feasibility:         "Rule pass ratio + budget + duration",
  environmental_impact:        "Environmental attribute extraction",
  extraction_confidence:       "OCR/LLM extraction metadata",
};

function FeatureTable({ features }: { features: Record<string, number> | null | undefined }) {
  if (!features) return null;
  const ML_FEATURES = [
    "document_completeness", "required_field_completeness", "eligibility_pass_ratio",
    "budget_consistency", "certificate_validity", "contradiction_count",
    "duplicate_similarity", "suspicious_indicator_count", "document_quality",
    "proposal_quality", "project_feasibility", "environmental_impact",
    "extraction_confidence",
  ];
  return (
    <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 space-y-2">
      <div className="flex items-center justify-between border-b border-[#22303A] pb-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
        <span>13 ML FEATURE VALUES — XGBoost Inputs</span>
        <span className="text-[#3DDC84] text-[10px]">EVIDENCE BASED</span>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-left font-mono text-[11px] border-collapse">
          <thead className="border-b border-[#22303A] text-[10px] text-[#8B99A6] uppercase">
            <tr>
              <th className="py-1.5 pr-3">Feature</th>
              <th className="py-1.5 pr-3 text-right">Value</th>
              <th className="py-1.5">Evidence Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#22303A]">
            {ML_FEATURES.map((name, i) => {
              const val = features[name];
              const source = FEATURE_SOURCES[name] ?? "Pipeline output";
              return (
                <tr key={name} className="hover:bg-[#0B0F14]/50 transition-colors">
                  <td className="py-1 pr-3 text-[#C8D6E0]">
                    <span className="text-[#3DDC84] mr-1.5 text-[9px]">F{i+1}</span>
                    {name.replaceAll("_", " ")}
                  </td>
                  <td className="py-1 pr-3 text-right font-bold text-[#E8EDF1]">
                    {val != null ? val.toFixed(4) : <span className="text-[#D9534F]">MISSING</span>}
                  </td>
                  <td className="py-1 text-[10px] text-[#8B99A6]">{source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Model status banners ──────────────────────────────────────────────────────

function ModelStatusBanner({
  modelStatus,
  predictionClass,
  provider,
  status,
}: {
  modelStatus?: string;
  predictionClass?: string;
  provider?: string;
  status?: string;
}) {
  if (predictionClass === "UNAVAILABLE" || modelStatus === "UNAVAILABLE") {
    return (
      <div className="flex items-start gap-3 rounded-[6px] border border-[#D9534F] bg-[#D9534F]/10 p-3 font-mono text-xs text-[#E8EDF1]">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[#D9534F]" />
        <div className="space-y-1 min-w-0 flex-1">
          <div className="font-bold text-[#D9534F] uppercase tracking-wider flex items-center justify-between">
            <span>ML MODEL UNAVAILABLE</span>
            <span className="text-[10px] text-[#D9534F] bg-[#D9534F]/20 px-2 py-0.5 rounded border border-[#D9534F]/40">
              STATUS: UNAVAILABLE
            </span>
          </div>
          <p className="text-[11px] text-[#8B99A6] font-sans leading-relaxed">
            XGBoost model artifact could not be loaded. Ensure models exist in the artifacts directory
            and <code className="rounded bg-[#0B0F14] border border-[#22303A] px-1 text-[#3DDC84]">ML_PROVIDER=xgboost</code> is set.
          </p>
        </div>
      </div>
    );
  }
  if (modelStatus === "BASELINE_FALLBACK" || status === "GENERATED_DEVELOPMENT_MODEL" || provider === "baseline") {
    return (
      <div className="flex items-start gap-3 rounded-[6px] border border-[#E0A93D] bg-[#E0A93D]/10 p-3 font-mono text-xs text-[#E8EDF1]">
        <Info size={16} className="mt-0.5 shrink-0 text-[#E0A93D]" />
        <div className="space-y-1">
          <div className="font-bold text-[#E0A93D] uppercase tracking-wider">
            BASELINE FALLBACK — DEVELOPMENT SCORING ACTIVE
          </div>
          <p className="text-[11px] text-[#8B99A6] font-sans">
            Scores are generated by a deterministic baseline formula, not a trained XGBoost model.
            Labeled <strong className="text-[#E0A93D] font-mono">GENERATED_DEVELOPMENT_MODEL</strong> for audit clarity.
          </p>
        </div>
      </div>
    );
  }
  if (modelStatus === "ML_READY" || provider === "xgboost") {
    return (
      <div className="flex items-start gap-3 rounded-[6px] border border-[#3DDC84] bg-[#3DDC84]/10 p-3 font-mono text-xs text-[#E8EDF1]">
        <CheckCircle size={16} className="mt-0.5 shrink-0 text-[#3DDC84]" />
        <div className="space-y-1">
          <div className="font-bold text-[#3DDC84] uppercase tracking-wider">
            XGBOOST ML MODEL ACTIVE — REAL PREDICTION
          </div>
          <p className="text-[11px] text-[#8B99A6] font-sans">
            Risk class, risk score, and quality score are generated by the trained XGBoost ensemble
            (risk_classifier + risk_regressor + quality_regressor). All values are real model outputs.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

// ── AI Reasoning Panel ───────────────────────────────────────────────────────

function AIReasoningPanel({ reasoning }: { reasoning: Record<string, unknown> | null | undefined }) {
  if (!reasoning) return null;

  const status = reasoning.status as string | undefined;
  const model = reasoning.model as string | undefined;
  const summary = reasoning.summary as string | undefined;
  const keyFindings = reasoning.key_findings as string[] | undefined;
  const riskExplanation = reasoning.risk_explanation as string | undefined;
  const recommendation = reasoning.recommendation as string | undefined;
  const missingEvidence = reasoning.missing_evidence as string[] | undefined;
  const clarificationQs = reasoning.clarification_questions as string[] | undefined;
  const llmConfidence = reasoning.llm_confidence as number | undefined;
  const note = reasoning.note as string | undefined;

  const isUnavailable = status === "UNAVAILABLE";

  return (
    <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-[#22303A] pb-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
        <div className="flex items-center gap-2">
          <BrainCircuit size={14} className={isUnavailable ? "text-[#8B99A6]" : "text-[#3DDC84]"} />
          <span>AI REASONING</span>
        </div>
        <div className="flex items-center gap-2">
          {model && (
            <span className="text-[10px] text-[#8B99A6] font-mono bg-[#0B0F14] border border-[#22303A] px-2 py-0.5 rounded">
              {model}
            </span>
          )}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              isUnavailable
                ? "text-[#8B99A6] bg-[#8B99A6]/10 border-[#8B99A6]/30"
                : "text-[#3DDC84] bg-[#3DDC84]/10 border-[#3DDC84]/30"
            }`}
          >
            {status ?? "UNKNOWN"}
          </span>
        </div>
      </div>

      {isUnavailable ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-[#8B99A6] font-mono">
            <Info size={13} className="mt-0.5 shrink-0 text-[#8B99A6]" />
            <span>
              AI explanation unavailable — LLM call failed or was not attempted.
              XGBoost prediction, RAG evidence, and deterministic validation results are preserved below.
            </span>
          </div>
          {note && (
            <p className="text-[11px] text-[#8B99A6] font-sans leading-relaxed border-l-2 border-[#22303A] pl-3">
              {note}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          {summary && (
            <div className="text-xs text-[#C8D6E0] font-sans leading-relaxed border-l-2 border-[#3DDC84] pl-3">
              {summary}
            </div>
          )}

          {/* Key findings */}
          {keyFindings && keyFindings.length > 0 && (
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-[#8B99A6] uppercase font-bold">KEY FINDINGS</div>
              <ul className="space-y-1">
                {keyFindings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#C8D6E0]">
                    <span className="text-[#3DDC84] font-mono shrink-0">›</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk explanation */}
          {riskExplanation && (
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-[#8B99A6] uppercase font-bold">RISK EXPLANATION</div>
              <p className="text-xs text-[#C8D6E0] font-sans leading-relaxed">{riskExplanation}</p>
            </div>
          )}

          {/* Recommendation + confidence */}
          <div className="flex items-center gap-3 pt-1 border-t border-[#22303A]">
            <div className="space-y-0.5">
              <div className="font-mono text-[10px] text-[#8B99A6] uppercase font-bold">AI RECOMMENDATION</div>
              <span className="inline-block font-mono font-bold text-xs px-2 py-1 rounded border border-[#E0A93D]/40 bg-[#E0A93D]/10 text-[#E0A93D]">
                {recommendation ?? "REVIEW_REQUIRED"}
              </span>
            </div>
            {llmConfidence != null && (
              <div className="space-y-0.5">
                <div className="font-mono text-[10px] text-[#8B99A6] uppercase font-bold">LLM CONFIDENCE</div>
                <span className="font-mono font-bold text-xs text-[#3DDC84]">
                  {(llmConfidence * 100).toFixed(0)}%
                </span>
              </div>
            )}
            <div className="ml-auto text-[10px] text-[#8B99A6] font-sans italic">
              Advisory only — human reviewer makes the final decision
            </div>
          </div>

          {/* Missing evidence */}
          {missingEvidence && missingEvidence.length > 0 && (
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-[#E0A93D] uppercase font-bold flex items-center gap-1">
                <AlertTriangle size={11} /> MISSING EVIDENCE
              </div>
              <ul className="space-y-0.5">
                {missingEvidence.map((item, i) => (
                  <li key={i} className="text-[11px] text-[#8B99A6] flex items-start gap-2">
                    <XCircle size={10} className="shrink-0 mt-0.5 text-[#E0A93D]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Clarification questions */}
          {clarificationQs && clarificationQs.length > 0 && (
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-[#8B99A6] uppercase font-bold">CLARIFICATION QUESTIONS</div>
              <ul className="space-y-1">
                {clarificationQs.map((q, i) => (
                  <li key={i} className="text-[11px] text-[#C8D6E0] flex items-start gap-2">
                    <span className="text-[#3DDC84] font-mono shrink-0">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScoringExplainability({
  detail,
  workflow,
}: {
  detail: ApplicationDetail | null;
  workflow?: WorkflowResponse | null;
}) {
  if (!detail) {
    return (
      <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-8 text-center font-mono text-xs text-[#8B99A6]">
        NO CASE SELECTED. SELECT AN APPLICATION FROM THE{" "}
        <span className="text-[#3DDC84]">DASHBOARD</span> TO INSPECT MODEL SCORING EXPLANATIONS.
      </div>
    );
  }

  const predictions = detail.predictions ?? [];
  const prediction = predictions.length > 0 ? predictions[predictions.length - 1] : undefined;
  const isUnavailable = !prediction || prediction.prediction_class === "UNAVAILABLE";

  const modelStatus = prediction?.model_status;
  const isMLReady = modelStatus === "ML_READY" || prediction?.provider === "xgboost";

  // Real scores only — never show fake defaults
  const qualityScore = prediction?.quality_score ?? null;
  const riskScore = prediction?.risk_score ?? null;
  const confidenceScore = prediction?.confidence != null && prediction.confidence > 0
    ? prediction.confidence * 100
    : null;

  const modelName =
    !prediction?.model_name || prediction.model_name === "unavailable"
      ? "Baseline Deterministic Engine"
      : prediction.model_name;

  // Extract LLM reasoning from workflow.state (primary source)
  // Falls back to evidence metadata if workflow not available
  const llmReasoning: Record<string, unknown> | null = (() => {
    // Primary: read from workflow state (set by backend after pipeline completes)
    const wfState = workflow?.state as Record<string, unknown> | undefined;
    if (wfState?.llm_reasoning) {
      return wfState.llm_reasoning as Record<string, unknown>;
    }
    // Fallback: read from evidence metadata (MODEL_EXPLANATION finding)
    const explanationEvidence = detail?.evidence?.find(
      (e) => e.finding_type === "MODEL_EXPLANATION"
    );
    if (explanationEvidence?.metadata_json) {
      const meta = explanationEvidence.metadata_json as Record<string, unknown>;
      return (meta.llm_reasoning as Record<string, unknown>) ?? null;
    }
    return null;
  })();

  return (
    <div className="relative flex flex-col gap-3 font-sans text-[#E8EDF1] max-w-[1400px] mx-auto pb-4">
      {/* Topographic Contour Background */}
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

      {/* Header */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84] shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase truncate">
                AI PREDICTION & MODEL EXPLAINABILITY ENGINE
              </h1>
              <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px] shrink-0">
                FEATURE ATTRIBUTIONS
              </span>
            </div>
            <p className="text-xs text-[#8B99A6] mt-0.5 truncate">
              Confidence scoring, quality vs risk indices for:{" "}
              <strong className="text-[#E8EDF1]">
                {detail.project_title ?? "Selected Case"}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 rounded-[6px] shrink-0">
          <Sparkles size={14} className={isMLReady ? "text-[#3DDC84]" : "text-[#8B99A6]"} />
          <span className={`font-bold ${isMLReady ? "text-[#3DDC84]" : "text-[#8B99A6]"}`}>
            {isUnavailable
              ? "MODEL UNAVAILABLE"
              : isMLReady
              ? `XGBOOST v${prediction?.model_version ?? "1.0"}`
              : `MODEL VERSION ${prediction?.model_version || "UNKNOWN"}`}
          </span>
        </div>
      </div>

      {/* ML Status Banner */}
      <div className="relative z-10 shrink-0">
        <ModelStatusBanner
          modelStatus={prediction?.model_status}
          predictionClass={prediction?.prediction_class}
          provider={prediction?.provider}
          status={prediction?.status}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 space-y-3">
        {/* Score gauges + metadata */}
        <div className="grid gap-3 lg:grid-cols-12 shrink-0">
          {/* Left: Score bars */}
          <div className="lg:col-span-7 rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-[#22303A] pb-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
              <span>MODEL CONFIDENCE & RISK INDEX GAUGES</span>
              <span className={isMLReady ? "text-[#3DDC84]" : "text-[#8B99A6]"}>
                {isMLReady ? "LIVE XGBOOST TELEMETRY" : isUnavailable ? "UNAVAILABLE" : "BASELINE TELEMETRY"}
              </span>
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {qualityScore !== null ? (
                <ScoreBar label="Quality Score Index" value={qualityScore} tone="bg-[#3DDC84]" />
              ) : (
                <div className="flex items-center justify-between text-xs font-mono text-[#8B99A6]">
                  <span>Quality Score Index</span>
                  <span className="text-[#D9534F]">N/A — Model unavailable</span>
                </div>
              )}
              {riskScore !== null ? (
                <ScoreBar label="Risk Assessment Score" value={riskScore} tone="bg-[#D9534F]" />
              ) : (
                <div className="flex items-center justify-between text-xs font-mono text-[#8B99A6]">
                  <span>Risk Assessment Score</span>
                  <span className="text-[#D9534F]">N/A — Model unavailable</span>
                </div>
              )}
              {confidenceScore !== null ? (
                <ScoreBar label="Model Evaluation Confidence" value={confidenceScore} tone="bg-[#3DDC84]" />
              ) : (
                <div className="flex items-center justify-between text-xs font-mono text-[#8B99A6]">
                  <span>Model Evaluation Confidence</span>
                  <span className="text-[#D9534F]">N/A — Model unavailable</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Prediction class metadata */}
          <div className="lg:col-span-5 rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-[#22303A] pb-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
              <span>MODEL METADATA & PREDICTION CLASS</span>
              <span className="text-[#8B99A6]">SPECS</span>
            </div>

            <div className="space-y-2.5 font-mono text-xs flex-1 flex flex-col justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84]">
                  <BrainCircuit size={20} />
                </div>
                <div>
                  <div className="font-bold text-[#E8EDF1]">{modelName}</div>
                  <div className="text-[10px] text-[#8B99A6]">
                    VER: {prediction?.model_version || "—"}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#22303A] space-y-1">
                <span className="text-[10px] text-[#8B99A6] uppercase font-bold">
                  PREDICTION CLASS:
                </span>
                <div>
                  <span
                    className={`inline-block font-bold px-2.5 py-1 rounded border uppercase text-xs ${
                      isUnavailable
                        ? "border-[#8B99A6]/30 bg-[#8B99A6]/10 text-[#8B99A6]"
                        : prediction?.prediction_class === "HIGH_RISK"
                        ? "border-[#D9534F]/40 bg-[#D9534F]/10 text-[#D9534F]"
                        : prediction?.prediction_class === "MEDIUM_RISK"
                        ? "border-[#E0A93D]/40 bg-[#E0A93D]/10 text-[#E0A93D]"
                        : "border-[#3DDC84]/30 bg-[#3DDC84]/10 text-[#3DDC84]"
                    }`}
                  >
                    {prediction?.prediction_class ?? "NOT SCORED"}
                  </span>
                </div>
              </div>

              {/* Class Probability Bars */}
              {prediction?.class_probabilities && (
                <div className="pt-2 border-t border-[#22303A]">
                  <ClassProbabilityBars
                    probabilities={prediction.class_probabilities}
                    predictionClass={prediction.prediction_class}
                  />
                </div>
              )}

              <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-2 text-[10px] text-[#8B99A6]">
                <div>
                  PROVIDER:{" "}
                  <span className="text-[#E8EDF1] font-bold">
                    {prediction?.provider ?? "—"}
                  </span>
                </div>
                <div className="mt-0.5">
                  STATUS:{" "}
                  <span className="text-[#E8EDF1] font-bold">
                    {prediction?.model_status ?? prediction?.status ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Table — 13 ML features with evidence sources */}
        {detail.latest_features && (
          <FeatureTable features={detail.latest_features} />
        )}

        {/* Feature Contributions — only when ML is real */}
        {isMLReady && !isUnavailable && (
          <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 shrink-0">
            <ScoreContributionChart contributions={prediction?.feature_contributions} />
          </div>
        )}

        {/* AI Reasoning Panel */}
        {llmReasoning && (
          <AIReasoningPanel reasoning={llmReasoning} />
        )}

        {/* Supporting Evidence Traces */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-3.5 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#22303A] pb-2 mb-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase shrink-0">
            <span>SUPPORTING EVIDENCE TRACES ({detail.evidence.length})</span>
            <span className="text-[#3DDC84]">LEDGER LOG</span>
          </div>

          <div
            className="overflow-y-auto max-h-[350px] p-1"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(61,220,132,0.4) #22303A" }}
          >
            <EvidenceList evidence={detail.evidence ?? []} />
          </div>
        </div>
      </div>
    </div>
  );
}
