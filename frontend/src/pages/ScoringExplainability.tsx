// ScoringExplainability.tsx — AI Assessment page.
// Primary: Risk Level / Confidence / Recommendation / Why? / Evidence.
// Technical: model details, 13 features, class probabilities — all collapsed.
import { useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle, BarChart3, BrainCircuit, CheckCircle2, Info, Sparkles,
} from "lucide-react";
import {
  EvidenceCard, FindingCard, PageHeader, RiskBadge,
  RecommendationBadge, TechnicalDetails, TechRow, EmptyState,
} from "../components/ui";
import { SkeletonCard } from "../components/ui";
import type { ApplicationDetail, WorkflowResponse } from "../types/api";

/* ── 13 ML feature schema ─────────────────────────────────────────── */
const FEATURE_META: Record<string, { label: string; description: string; importance: "high" | "medium" | "low" }> = {
  document_completeness:      { label: "Document Completeness",        description: "Ratio of required documents present",                      importance: "high" },
  required_field_completeness:{ label: "Required Field Completeness",  description: "Ratio of required fields populated",                        importance: "high" },
  eligibility_pass_ratio:     { label: "Eligibility Pass Rate",        description: "Ratio of scheme eligibility rules passed",                   importance: "high" },
  budget_consistency:         { label: "Budget Consistency",           description: "No budget contradictions detected",                          importance: "high" },
  certificate_validity:       { label: "Certificate Validity",         description: "Certificate authenticity check result",                      importance: "medium" },
  contradiction_count:        { label: "Contradiction Count",          description: "Cross-document contradictions detected",                     importance: "high" },
  duplicate_similarity:       { label: "Duplicate Similarity",         description: "Potential duplicate application indicator",                  importance: "medium" },
  suspicious_indicator_count: { label: "Suspicious Indicators",        description: "Low confidence, high cost, or other flags",                  importance: "medium" },
  document_quality:           { label: "Document Quality",             description: "Overall document quality from validation",                   importance: "medium" },
  proposal_quality:           { label: "Proposal Quality",             description: "Field completeness and extraction confidence",               importance: "medium" },
  project_feasibility:        { label: "Project Feasibility",          description: "Rule pass ratio and contradiction absence",                  importance: "medium" },
  environmental_impact:       { label: "Environmental Impact",         description: "Environmental benefit evidence present",                     importance: "low" },
  extraction_confidence:      { label: "Extraction Confidence",        description: "Average extraction confidence from normalization",           importance: "high" },
};

function pct(v: number | null | undefined) { return v != null ? `${Math.round(v * 100)}%` : "N/A"; }
function score(v: number | null | undefined) { return v != null ? `${Math.round(v)}/100` : "N/A"; }

/* ── Feature bar ─────────────────────────────────────────────────── */
function FeatureBar({ name, featureVal, contribution }: { name: string; featureVal: number | undefined; contribution: number | undefined }) {
  const meta = FEATURE_META[name];
  const hasContrib = contribution != null;
  const pctWidth = featureVal != null ? Math.min(Math.max(featureVal * 100, 0), 100) : null;
  return (
    <div className="py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-slate-700">{meta?.label ?? name.replaceAll("_", " ")}</span>
        <span className="text-[11px] text-slate-400 shrink-0">
          {featureVal != null ? featureVal.toFixed(3) : "N/A"}
        </span>
      </div>
      {pctWidth != null && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full rounded-full ${pctWidth > 70 ? "bg-emerald-400" : pctWidth > 40 ? "bg-amber-400" : "bg-rose-400"}`}
            style={{ width: `${pctWidth}%` }} />
        </div>
      )}
      {meta && <p className="text-[10px] text-slate-400 mt-0.5">{meta.description}</p>}
      <p className="text-[10px] text-slate-400">
        Contribution: {hasContrib ? contribution!.toFixed(4) : <span className="italic">Unavailable</span>}
      </p>
    </div>
  );
}

function ScoreCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[132px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="flex min-h-[44px] w-full flex-col items-center justify-center gap-2">
        {children}
      </div>
    </div>
  );
}

function ExplanationBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm leading-relaxed text-slate-700">{text}</p>
    </div>
  );
}

/* ── Main ────────────────────────────────────────────────────────── */
export function ScoringExplainability({
  detail,
  workflow,
}: {
  detail: ApplicationDetail | null;
  workflow: WorkflowResponse | null;
}) {
  const [showModelDetails, setShowModelDetails] = useState(false);

  if (!detail) {
    return (
      <EmptyState
        icon={<BarChart3 size={24} />}
        title="No application selected"
        description="Select an application from the Dashboard to view the AI assessment."
      />
    );
  }

  const pred = detail.predictions?.[detail.predictions.length - 1];

  if (!pred) {
    return (
      <div className="max-w-[800px] mx-auto space-y-6 animate-slide-up">
        <PageHeader title="AI Assessment" subtitle="Risk and recommendation" breadcrumb="Case Review" />
        <SkeletonCard />
        <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-slate-400 text-sm">
          Risk assessment has not been completed yet.
          <br />Process the application first.
        </div>
      </div>
    );
  }

  const confidence   = pred.confidence > 0 ? pred.confidence : null;
  const riskScore    = pred.risk_score    ?? null;
  const qualityScore = pred.quality_score ?? null;
  const features     = detail.latest_features ?? {};
  const contributions= pred.feature_contributions ?? {};
  const classProbabilities = pred.class_probabilities ?? {};
  const isBaseline   = pred.model_status === "BASELINE_FALLBACK";

  // Workflow reasoning
  const wfState     = (workflow?.state ?? {}) as Record<string, unknown>;
  const llm         = (wfState.llm_reasoning ?? null) as Record<string, unknown> | null;
  const aiSummary   = llm?.summary    as string | undefined;
  const riskExplanation = llm?.risk_explanation as string | undefined;
  const scoreExplanation = llm?.score_explanation as string | undefined;
  const validationExplanation = llm?.validation_explanation as string | undefined;
  const llmStatus = llm?.status as string | undefined;
  const keyFindings = (llm?.key_findings as string[] | undefined) ?? [];
  const clarQs      = (llm?.clarification_questions as string[] | undefined) ?? [];

  // Evidence with actual content
  const meaningfulEvidence = detail.evidence.filter(e => {
    const m = e.metadata_json as Record<string, unknown> | undefined;
    return m?.evidence_text || m?.knowledge_base_document;
  });

  // Key factors from contributions
  const keyFactors = Object.entries(contributions)
    .filter(([, v]) => v !== 0)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
    .slice(0, 4)
    .map(([k]) => FEATURE_META[k]?.label ?? k.replaceAll("_", " "));

  return (
    <div className="max-w-[900px] mx-auto space-y-5 animate-slide-up">
      <PageHeader
        title="AI Assessment"
        subtitle={detail.project_title ?? "Risk & Recommendation"}
        breadcrumb="Case Review"
      />

      {isBaseline && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Deterministic scoring active — ML model not fully trained. Validation and evidence are still fully available.
        </div>
      )}

      {/* ── L1: Risk / Confidence / Recommendation ────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ScoreCard label="Risk Level">
          <RiskBadge value={pred.prediction_class} large />
        </ScoreCard>
        <ScoreCard label="Risk Score">
          <p className={`text-3xl font-black ${riskScore != null ? "text-rose-600" : "text-slate-300"}`}>{score(riskScore)}</p>
        </ScoreCard>
        <ScoreCard label="Quality Score">
          <p className={`text-3xl font-black ${qualityScore != null ? "text-teal-600" : "text-slate-300"}`}>{score(qualityScore)}</p>
        </ScoreCard>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ScoreCard label="Confidence">
          <p className={`text-3xl font-black ${confidence != null ? "text-teal-600" : "text-slate-300"}`}>{pct(confidence)}</p>
          {confidence != null && (
            <div className="mt-2 h-1.5 w-full max-w-[180px] rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full bg-teal-400" style={{ width: `${confidence * 100}%` }} />
            </div>
          )}
        </ScoreCard>
        <ScoreCard label="Recommendation">
          <RecommendationBadge value={detail.ai_recommendation} large />
        </ScoreCard>
      </div>

      {/* ── L1: Why? ──────────────────────────────────────────────── */}
      {(keyFindings.length > 0 || aiSummary || riskExplanation || scoreExplanation || validationExplanation || llmStatus === "UNAVAILABLE") && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Sparkles size={15} className="text-violet-500" />
            <h2 className="text-sm font-bold text-slate-800">Why?</h2>
            <span className="text-[10px] text-violet-500 font-semibold bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">AI-generated</span>
          </div>
          <div className="p-5 space-y-4">
            {aiSummary && (
              <blockquote className="border-l-4 border-violet-300 pl-4 text-sm text-slate-700 italic leading-relaxed bg-violet-50/30 py-2 rounded-r-lg">
                "{aiSummary}"
              </blockquote>
            )}
            {keyFindings.length > 0 && (
              <ul className="space-y-2">
                {keyFindings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <CheckCircle2 size={14} className="text-teal-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
            )}
            {llmStatus === "UNAVAILABLE" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                AI reasoning unavailable. The XGBoost prediction, validation results, and retrieved evidence remain available for human review.
              </div>
            )}
            {(riskExplanation || scoreExplanation || validationExplanation) && (
              <div className="grid gap-3">
                {riskExplanation && <ExplanationBlock label="Risk Reasoning" text={riskExplanation} />}
                {scoreExplanation && <ExplanationBlock label="Score Reasoning" text={scoreExplanation} />}
                {validationExplanation && <ExplanationBlock label="Validation Reasoning" text={validationExplanation} />}
              </div>
            )}
            {clarQs.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Clarification Points</p>
                <ul className="space-y-1.5">
                  {clarQs.map((q, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] text-slate-400">Advisory only. The human reviewer makes the final decision.</p>
          </div>
        </div>
      )}

      {/* ── L2: Key Factors ───────────────────────────────────────── */}
      {keyFactors.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2.5">Key Factors</p>
          <div className="flex flex-wrap gap-2">
            {keyFactors.map(f => (
              <span key={f} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                <Info size={10} className="text-slate-400" /> {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── L2: Supporting Evidence ────────────────────────────────── */}
      {meaningfulEvidence.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <BrainCircuit size={15} className="text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800">Supporting Evidence</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">{meaningfulEvidence.length}</span>
          </div>
          <div className="p-5 grid gap-3 sm:grid-cols-2">
            {meaningfulEvidence.slice(0, 4).map(ev => <EvidenceCard key={ev.id} item={ev} />)}
          </div>
        </div>
      )}

      {/* ── L3: Risk Scores ───────────────────────────────────────── */}
      {/* ── L3 toggle: model details ──────────────────────────────── */}
      <button
        type="button"
        onClick={() => setShowModelDetails(v => !v)}
        className="flex items-center gap-2 text-xs font-semibold text-teal-600 hover:text-teal-700 transition"
      >
        <BarChart3 size={13} />
        {showModelDetails ? "Hide technical details" : "View technical details"}
      </button>

      {showModelDetails && (
        <div className="space-y-4 animate-slide-up">
          {/* Class probabilities */}
          {Object.keys(classProbabilities).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Class Probabilities</p>
              {Object.entries(classProbabilities).map(([cls, prob]) => (
                <div key={cls} className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-slate-600 w-28 shrink-0">{cls.replaceAll("_", " ")}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${cls === "HIGH_RISK" ? "bg-rose-400" : cls === "MEDIUM_RISK" ? "bg-amber-400" : "bg-teal-400"}`}
                      style={{ width: `${(prob as number) * 100}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-500 w-10 text-right">{((prob as number) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}

          {/* 13 ML Features */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">13 ML Features</p>
            <div className="space-y-0">
              {Object.keys(FEATURE_META).map(name => (
                <FeatureBar
                  key={name}
                  name={name}
                  featureVal={features[name]}
                  contribution={contributions[name]}
                />
              ))}
            </div>
          </div>

          <TechnicalDetails label="Model metadata">
            <TechRow label="Model name"    value={pred.model_name} />
            <TechRow label="Version"       value={pred.model_version} />
            <TechRow label="Provider"      value={pred.provider} />
            <TechRow label="Model status"  value={pred.model_status ?? "—"} />
            <TechRow label="Feature ver."  value={pred.feature_version} />
            <TechRow label="Policy ver."   value={pred.policy_version} />
          </TechnicalDetails>
        </div>
      )}
    </div>
  );
}
