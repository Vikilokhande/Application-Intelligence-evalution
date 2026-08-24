// ScoringExplainability.tsx — AI Assessment page.
// Palette: Deep Navy Blue (#0A243F), Dark Navy (#071A2B), Mustard Gold (#D5A51A), Warm Off-White (#F8F9FA), White (#FFFFFF), Slate Gray (#66717C).
// Medium horizontal KPI cards. Plain-language, readable AI assistant. Toggle renamed to "Model Prediction".
import { useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle, BarChart3, BrainCircuit, CheckCircle2, Info, Sparkles,
  ShieldCheck, TrendingUp, Award, ChevronDown, ChevronRight,
} from "lucide-react";
import {
  EvidenceCard, PageHeader, RiskBadge,
  RecommendationBadge, TechnicalDetails, TechRow, EmptyState,
} from "../components/ui";
import { SkeletonCard } from "../components/ui";
import type { ApplicationDetail, WorkflowResponse } from "../types/api";

/* ── 13 ML feature schema ─────────────────────────────────────────── */
const FEATURE_META: Record<string, { label: string; description: string }> = {
  document_completeness:      { label: "Document Completeness",        description: "All mandatory clearance documents attached" },
  required_field_completeness:{ label: "Required Field Completeness",  description: "All mandatory application fields populated" },
  eligibility_pass_ratio:     { label: "Eligibility Pass Rate",        description: "Scheme eligibility criteria met" },
  budget_consistency:         { label: "Budget Consistency",           description: "Project budget figures consistent across files" },
  certificate_validity:       { label: "Certificate Validity",         description: "Organisation certificates verified" },
  contradiction_count:        { label: "Document Consistency",         description: "No conflicting data detected across attachments" },
  duplicate_similarity:       { label: "Uniqueness Verification",      description: "No duplicate submissions detected" },
  suspicious_indicator_count: { label: "Compliance Quality",           description: "Application verified against compliance standards" },
  document_quality:           { label: "Document Legibility",          description: "Readability and resolution of attachments" },
  proposal_quality:           { label: "Proposal Completeness",        description: "Technical proposal detail and completeness" },
  project_feasibility:        { label: "Project Feasibility",          description: "Scope matches scheme parameters" },
  environmental_impact:       { label: "Environmental Scope",          description: "Environmental benefits and mitigation plan documented" },
  extraction_confidence:      { label: "Extraction Confidence",        description: "High confidence in parsed application data" },
};

function pct(v: number | null | undefined) { return v != null ? `${Math.round(v * 100)}%` : "—"; }
function score(v: number | null | undefined) { return v != null ? `${Math.round(v)}/100` : "—"; }

/* ── Feature bar ─────────────────────────────────────────────────── */
function FeatureBar({ name, featureVal, contribution }: { name: string; featureVal: number | undefined; contribution: number | undefined }) {
  const meta = FEATURE_META[name];
  const hasContrib = contribution != null;
  const pctWidth = featureVal != null ? Math.min(Math.max(featureVal * 100, 0), 100) : null;
  return (
    <div className="py-2.5 border-b border-[#E5E7EB] last:border-0">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <span className="text-xs font-semibold text-[#0A243F]">{meta?.label ?? name.replaceAll("_", " ")}</span>
        <span className="text-xs font-mono text-[#66717C] shrink-0">
          {featureVal != null ? featureVal.toFixed(3) : "—"}
        </span>
      </div>
      {pctWidth != null && (
        <div className="h-2 rounded-full bg-[#F8F9FA] border border-[#E5E7EB] overflow-hidden">
          <div
            className={`h-full rounded-full ${pctWidth > 70 ? "bg-[#0A243F]" : pctWidth > 40 ? "bg-[#D5A51A]" : "bg-rose-500"}`}
            style={{ width: `${pctWidth}%` }}
          />
        </div>
      )}
      {meta && <p className="text-[11px] text-[#66717C] mt-1">{meta.description}</p>}
      <p className="text-[10px] text-[#66717C]">
        Contribution: {hasContrib ? contribution!.toFixed(4) : <span className="italic">Unavailable</span>}
      </p>
    </div>
  );
}

/* ── Medium KPI Card ──────────────────────────────────────────────── */
function MediumKpi({ label, children, subtitle }: { label: string; children: ReactNode; subtitle?: string }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-2">{label}</p>
      <div className="flex items-center min-h-[36px]">
        {children}
      </div>
      {subtitle && <p className="text-[10px] text-[#66717C] mt-1.5">{subtitle}</p>}
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
      <div className="max-w-[1000px] mx-auto space-y-6 animate-slide-up font-sans">
        <PageHeader title="AI Assessment" subtitle="Compliance assessment & clearance recommendation" breadcrumb="Case Review" />
        <SkeletonCard />
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center text-[#66717C] text-sm">
          Assessment has not been completed yet. Please run the processing pipeline first.
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
    <div className="max-w-[1200px] mx-auto space-y-6 animate-slide-up font-sans">
      <PageHeader
        title="AI Assessment"
        subtitle={detail.project_title ?? "Clearance Risk Assessment & Advisory"}
        breadcrumb="Case Review"
      />

      {isBaseline && (
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
          Rule-based validation active. Validation checks and retrieved evidence are fully verified.
        </div>
      )}

      {/* ── Medium Proportional Horizontal KPI Row (5 Horizontal Boxes) ────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <MediumKpi label="Assessed Risk Level">
          <RiskBadge value={pred.prediction_class} />
        </MediumKpi>

        <MediumKpi label="Assessment Confidence" subtitle={confidence != null ? `${Math.round(confidence * 100)}% verified` : undefined}>
          <div className="w-full">
            <p className="text-2xl font-black text-[#0A243F] leading-tight">{pct(confidence)}</p>
            {confidence != null && (
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-[#E5E7EB] overflow-hidden">
                <div className="h-full rounded-full bg-[#0A243F]" style={{ width: `${confidence * 100}%` }} />
              </div>
            )}
          </div>
        </MediumKpi>

        <MediumKpi label="Clearance Recommendation">
          <RecommendationBadge value={detail.ai_recommendation} />
        </MediumKpi>

        <MediumKpi label="Risk Score Index">
          <p className="text-2xl font-black text-[#0A243F] leading-tight">{score(riskScore)}</p>
        </MediumKpi>

        <MediumKpi label="Quality Score Index">
          <p className="text-2xl font-black text-[#0A243F] leading-tight">{score(qualityScore)}</p>
        </MediumKpi>
      </div>

      {/* ── Key Assessment Findings ("Why?") ──────────────────────────────── */}
      {(keyFindings.length > 0 || aiSummary || riskExplanation || scoreExplanation || validationExplanation || llmStatus === "UNAVAILABLE") && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#D5A51A]" />
              <h2 className="text-sm font-bold text-[#0A243F]">Key Findings &amp; Assessment Rationale</h2>
            </div>
            <span className="text-xs font-bold text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-full px-3 py-0.5">
              Advisory Summary
            </span>
          </div>

          <div className="p-6 space-y-5">
            {aiSummary && (
              <blockquote className="border-l-4 border-[#0A243F] pl-4 text-sm text-[#071A2B] font-medium leading-relaxed bg-[#F8F9FA] py-3 rounded-r-xl">
                "{aiSummary}"
              </blockquote>
            )}

            {keyFindings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#66717C]">Primary Observations</p>
                <ul className="space-y-2">
                  {keyFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[#071A2B]">
                      <CheckCircle2 size={15} className="text-[#0A243F] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {llmStatus === "UNAVAILABLE" && (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 text-sm text-[#92400E]">
                Assessment narrative unavailable. Validation checks, guidelines, and retrieved evidence remain accessible for review.
              </div>
            )}

            {(riskExplanation || scoreExplanation || validationExplanation) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {riskExplanation && (
                  <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1">Risk Rationale</p>
                    <p className="text-xs text-[#071A2B] leading-relaxed">{riskExplanation}</p>
                  </div>
                )}
                {scoreExplanation && (
                  <div className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#66717C] mb-1">Score Breakdown</p>
                    <p className="text-xs text-[#071A2B] leading-relaxed">{scoreExplanation}</p>
                  </div>
                )}
              </div>
            )}

            {clarQs.length > 0 && (
              <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4 space-y-2">
                <p className="text-xs font-bold text-[#B45309] uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Recommended Verification Points
                </p>
                <ul className="space-y-1.5">
                  {clarQs.map((q, i) => (
                    <li key={i} className="text-xs text-[#78350F] flex items-start gap-2">
                      <span className="font-bold">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-[#66717C] pt-2 border-t border-[#E5E7EB]">
              Advisory only. The authorized human reviewer maintains final authority on clearance decisions.
            </p>
          </div>
        </div>
      )}

      {/* ── Key Factors ───────────────────────────────────────── */}
      {keyFactors.length > 0 && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
          <p className="text-xs font-bold uppercase tracking-wider text-[#66717C] mb-3">Key Influencing Factors</p>
          <div className="flex flex-wrap gap-2">
            {keyFactors.map(f => (
              <span key={f} className="inline-flex items-center gap-1.5 rounded-xl border border-[#0A243F]/20 bg-[#0A243F]/5 px-3 py-1.5 text-xs font-semibold text-[#0A243F]">
                <Info size={12} className="text-[#0A243F]" /> {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Supporting Evidence ────────────────────────────────── */}
      {meaningfulEvidence.length > 0 && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrainCircuit size={16} className="text-[#0A243F]" />
              <h2 className="text-sm font-bold text-[#0A243F]">Supporting Policy Evidence ({meaningfulEvidence.length})</h2>
            </div>
            <span className="text-xs text-[#66717C]">Retrieved from environmental guidelines</span>
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2">
            {meaningfulEvidence.slice(0, 4).map(ev => <EvidenceCard key={ev.id} item={ev} />)}
          </div>
        </div>
      )}

      {/* ── AI Assistant (Reviewer Actionable Summary) ──────────────────────── */}
      <AIAssistant
        detail={detail}
        pred={pred}
        fails={detail.validation_results.filter(v => v.status === "FAIL")}
        warns={detail.validation_results.filter(v => v.status === "WARN" || v.status === "NOT_VERIFIABLE")}
        clarQs={clarQs}
        keyFindings={keyFindings}
        aiSummary={aiSummary}
        riskExplanation={riskExplanation}
      />

      {/* ── Model Prediction Toggle (Renamed from "view model details") ────────────────────────────────────── */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowModelDetails(v => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-semibold text-[#0A243F] hover:bg-[#F8F9FA] hover:border-[#0A243F] transition shadow-2xs"
        >
          <BarChart3 size={14} className="text-[#D5A51A]" />
          <span>{showModelDetails ? "Hide Model Prediction" : "Model Prediction"}</span>
          {showModelDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {showModelDetails && (
          <div className="mt-4 space-y-4 animate-slide-up">
            {/* Class probabilities */}
            {Object.keys(classProbabilities).length > 0 && (
              <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
                <p className="text-xs font-bold text-[#66717C] uppercase tracking-wider mb-3">Model Confidence Probabilities</p>
                <div className="space-y-2.5">
                  {Object.entries(classProbabilities).map(([cls, prob]) => (
                    <div key={cls} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#071A2B] w-32 shrink-0">{cls.replaceAll("_", " ")}</span>
                      <div className="flex-1 h-2 rounded-full bg-[#F8F9FA] border border-[#E5E7EB] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${cls === "HIGH_RISK" ? "bg-rose-500" : cls === "MEDIUM_RISK" ? "bg-[#D5A51A]" : "bg-[#0A243F]"}`}
                          style={{ width: `${(prob as number) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-bold text-[#0A243F] w-12 text-right">{((prob as number) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 13 ML Features */}
            <div className="rounded-2xl border border-[#E5E7EB] bg-white p-5 shadow-xs">
              <p className="text-xs font-bold text-[#66717C] uppercase tracking-wider mb-3">13 Verification Feature Parameters</p>
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

            <TechnicalDetails label="Model Version &amp; Metadata">
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
    </div>
  );
}

/* ── AIAssistant (Human-Readable Review Advisory) ─────────────────────────────────────────────────── */
function AIAssistant({
  detail, pred, fails, warns, clarQs, keyFindings, aiSummary, riskExplanation,
}: {
  detail: import("../types/api").ApplicationDetail;
  pred: import("../types/api").PredictionRead;
  fails: import("../types/api").ValidationResult[];
  warns: import("../types/api").ValidationResult[];
  clarQs: string[];
  keyFindings: string[];
  aiSummary: string | undefined;
  riskExplanation: string | undefined;
}) {
  const riskLabel   = (pred.prediction_class ?? "").replaceAll("_", " ").toUpperCase() || "UNKNOWN";
  const riskScore   = pred.risk_score   != null ? `${Math.round(pred.risk_score)}/100`  : null;
  const qualScore   = pred.quality_score != null ? `${Math.round(pred.quality_score)}/100` : null;
  const confidence  = pred.confidence    > 0     ? `${Math.round(pred.confidence * 100)}%` : null;

  const docCount     = detail.documents.length;
  const docsReady    = detail.documents.filter(d => (d.processing_status ?? "").toUpperCase() === "PROCESSED" || d.extraction_status?.toUpperCase() === "EXTRACTED").length;
  const rulesFailed  = detail.rule_results.filter(r => r.result?.toUpperCase() !== "PASS").length;
  const rulesTotal   = detail.rule_results.length;
  const evidenceCount= detail.evidence.length;

  const actionItems: string[] = [];
  fails.slice(0, 3).forEach(f =>
    actionItems.push(`Resolve check: ${f.validation_type.replaceAll("_", " ")} — ${f.message}`)
  );
  warns.slice(0, 2).forEach(w =>
    actionItems.push(`Verify: ${w.validation_type.replaceAll("_", " ")} — ${w.message}`)
  );
  clarQs.slice(0, 3).forEach(q => actionItems.push(q));
  if (detail.documents.filter(d => (d.processing_status ?? "").toUpperCase() === "FAILED").length > 0)
    actionItems.push("Check document clarity for unparsed files.");
  if (actionItems.length === 0)
    actionItems.push("Review all verification checks and evidence before submitting decision.");

  const noData = !aiSummary && !riskExplanation && keyFindings.length === 0;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden font-sans">
      <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#0A243F] text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#D5A51A]" />
          <h2 className="text-sm font-bold text-white">AI Decision Advisory Summary</h2>
        </div>
        <span className="text-xs font-bold text-[#D5A51A] bg-white/10 px-3 py-1 rounded-full">
          Advisory Only
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Assessment Narrative */}
        <div>
          <p className="text-xs font-bold text-[#66717C] uppercase tracking-wider mb-2">Summary Narrative</p>
          {noData ? (
            <p className="text-sm text-[#66717C] italic">
              AI summary narrative is not available. Please inspect the validation results and evidence directly.
            </p>
          ) : (
            <div className="space-y-2">
              {aiSummary && (
                <p className="text-sm text-[#071A2B] leading-relaxed font-medium bg-[#F8F9FA] p-3.5 rounded-xl border border-[#E5E7EB]">
                  {aiSummary}
                </p>
              )}
              {!aiSummary && (
                <p className="text-sm text-[#071A2B] leading-relaxed">
                  Application classified as <span className="font-bold text-[#0A243F]">{riskLabel}</span>
                  {riskScore ? ` (Risk Score: ${riskScore})` : ""}{qualScore ? ` with a Quality Score of ${qualScore}` : ""}.
                  {confidence ? ` Model confidence level: ${confidence}.` : ""}
                  {" "}{fails.length > 0 && `${fails.length} item(s) require verification attention. `}
                  {rulesFailed > 0 && `${rulesFailed} of ${rulesTotal} scheme guidelines not satisfied. `}
                  {`${docsReady} of ${docCount} documents verified`}
                  {evidenceCount > 0 ? ` and ${evidenceCount} statutory evidence references checked.` : "."}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 4 Pillars in clean boxes */}
        <div>
          <p className="text-xs font-bold text-[#66717C] uppercase tracking-wider mb-2.5">Verification Pillars</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Checklist Validation", value: fails.length === 0 ? "All Passed" : `${fails.length} Pending`, ok: fails.length === 0 },
              { label: "Scheme Guidelines",    value: rulesFailed === 0 ? "All Satisfied" : `${rulesFailed} Flagged`, ok: rulesFailed === 0 },
              { label: "Risk Index",           value: riskScore ?? "—", ok: riskScore != null },
              { label: "Statutory Evidence",   value: evidenceCount > 0 ? `${evidenceCount} Items` : "—", ok: evidenceCount > 0 },
            ].map(({ label, value, ok }) => (
              <div key={label} className="rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] p-3">
                <p className="text-[10px] font-bold text-[#66717C] uppercase tracking-wider">{label}</p>
                <p className="text-sm font-bold text-[#0A243F] mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        <div>
          <p className="text-xs font-bold text-[#66717C] uppercase tracking-wider mb-2.5">Recommended Reviewer Actions</p>
          <ul className="space-y-2">
            {actionItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs font-semibold text-[#071A2B] bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E5E7EB]">
                <ShieldCheck size={14} className="text-[#0A243F] shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
