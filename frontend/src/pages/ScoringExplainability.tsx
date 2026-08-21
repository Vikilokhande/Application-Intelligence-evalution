import { BrainCircuit, Sparkles, AlertTriangle, Info } from "lucide-react";
import { EvidenceList } from "../components/EvidenceList";
import { ScoreBar } from "../components/ScoreBar";
import { ScoreContributionChart } from "../components/ScoreContributionChart";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail } from "../types/api";

function ModelStatusBanner({ status, predictionClass, provider }: {
  status?: string;
  predictionClass?: string;
  provider?: string;
}) {
  if (predictionClass === "UNAVAILABLE") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
        <div>
          <div className="font-bold text-amber-900">ML MODEL UNAVAILABLE</div>
          <div className="mt-1 text-xs text-amber-800">
            No trained XGBoost model is loaded. Scores shown below are not available.
            Train a model using <code className="rounded bg-amber-100 px-1">ml/training/train.py</code> and
            set <code className="rounded bg-amber-100 px-1">ML_PROVIDER=xgboost</code> in your .env file.
          </div>
          <div className="mt-1 text-xs text-amber-700 font-mono">{status}</div>
        </div>
      </div>
    );
  }
  if (status === "GENERATED_DEVELOPMENT_MODEL" || provider === "baseline") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-sky-300 bg-sky-50 p-4 text-sm">
        <Info size={20} className="mt-0.5 shrink-0 text-sky-600" />
        <div>
          <div className="font-bold text-sky-900">DEVELOPMENT MODEL - NOT FOR PRODUCTION DECISIONS</div>
          <div className="mt-1 text-xs text-sky-800">
            Scores are produced by a deterministic baseline formula, not a trained XGBoost model.
            Results are labeled <strong>GENERATED_DEVELOPMENT_MODEL</strong> to prevent confusion with real ML predictions.
          </div>
        </div>
      </div>
    );
  }
  return null;
}

export function ScoringExplainability({ detail }: { detail: ApplicationDetail | null }) {
  if (!detail) {
    return (
      <SectionPanel title="AI Scoring & Explainability Engine">
        <div className="p-8 text-center text-sm text-[#64748B]">
          No application selected. Select an application from the <span className="font-bold text-[#0F766E]">Dashboard</span> to inspect model scoring explanations.
        </div>
      </SectionPanel>
    );
  }

  const predictions = detail.predictions ?? [];
  const prediction = predictions.length > 0 ? predictions[predictions.length - 1] : undefined;
  const isUnavailable = prediction?.prediction_class === "UNAVAILABLE";

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel border-l-4 border-l-[#0F766E] bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                AI Prediction & Model Explainability Engine
              </h1>
              <span className="ai-boundary-badge">Feature Attributions</span>
            </div>
            <p className="mt-1 text-xs text-[#475569]">
              Model confidence scoring, quality vs risk indices, and feature contribution breakdowns for <strong className="text-[#0F172A]">{detail.project_title ?? "Selected Case"}</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2">
            <Sparkles size={16} className="text-sky-700" />
            <div className="text-xs font-bold text-sky-900">
              {isUnavailable ? "MODEL UNAVAILABLE" : `MODEL VERSION ${prediction?.model_version || "not set"}`}
            </div>
          </div>
        </div>
      </div>

      {/* ML Status Banner */}
      <ModelStatusBanner
        status={prediction?.status}
        predictionClass={prediction?.prediction_class}
        provider={prediction?.provider}
      />

      {/* Model Overview & Score Grid */}
      <div className="grid gap-6 md:grid-cols-12">
        <div className="space-y-5 md:col-span-7">
          <SectionPanel title="Model Confidence & Risk Metrics">
            <div className="space-y-4">
              {isUnavailable ? (
                <div className="text-sm text-amber-700 italic py-2">
                  Scores are unavailable - no trained model is loaded.
                </div>
              ) : (
                <>
                  <ScoreBar label="Quality Score Index" value={prediction?.quality_score ?? null} tone="bg-[#0F766E]" />
                  <ScoreBar label="Risk Assessment Score" value={prediction?.risk_score ?? null} tone="bg-rose-600" />
                  <ScoreBar label="Model Evaluation Confidence" value={prediction?.confidence != null ? prediction.confidence * 100 : null} tone="bg-sky-600" />
                </>
              )}
            </div>
          </SectionPanel>
        </div>

        <div className="space-y-5 md:col-span-5">
          <SectionPanel title="Prediction Class & Status">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
                  <BrainCircuit size={24} />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0F172A]">{prediction?.model_name ?? "No model loaded"}</div>
                  <div className="text-xs text-[#64748B]">Version {prediction?.model_version || "not set"}</div>
                </div>
              </div>
              <div>
                <span className="field-label">Prediction Class</span>
                <div className="mt-1">
                  <StatusBadge value={prediction?.prediction_class || detail.ai_recommendation} />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-[#F8FAFC] p-3 text-xs text-[#475569]">
                Status: <span className="font-bold text-[#0F172A]">{prediction?.status ?? "No scoring result"}</span>
              </div>
            </div>
          </SectionPanel>
        </div>
      </div>

      {/* Feature Contributions Waterfall */}
      {!isUnavailable && (
        <SectionPanel title="Feature Contributions (Model Attribution)">
          <ScoreContributionChart contributions={prediction?.feature_contributions} />
        </SectionPanel>
      )}

      {/* Supporting Evidence Traces */}
      <SectionPanel title="Supporting Evidence Traces">
        <EvidenceList evidence={detail.evidence ?? []} />
      </SectionPanel>
    </div>
  );
}
