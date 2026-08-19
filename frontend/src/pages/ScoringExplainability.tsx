import { BrainCircuit } from "lucide-react";
import { EvidenceList } from "../components/EvidenceList";
import { ScoreBar } from "../components/ScoreBar";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail } from "../types/api";

export function ScoringExplainability({ detail }: { detail: ApplicationDetail | null }) {
  if (!detail) {
    return <SectionPanel title="AI Scoring & Explainability">Select or create an application.</SectionPanel>;
  }
  const prediction = detail.predictions.at(-1);
  const contributions = Object.entries(prediction?.feature_contributions ?? {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  return (
    <div className="space-y-4">
      <SectionPanel title="AI Score">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <ScoreBar label="Quality Score" value={prediction?.quality_score ?? null} />
            <ScoreBar label="Risk Score" value={prediction?.risk_score ?? null} tone="bg-brick" />
            <ScoreBar label="Confidence" value={prediction ? prediction.confidence * 100 : null} tone="bg-cobalt" />
          </div>
          <div className="rounded-md border border-line bg-field p-4">
            <BrainCircuit className="text-cobalt" size={24} aria-hidden="true" />
            <div className="mt-3 text-sm font-semibold text-ink">{prediction?.model_name ?? "No model output"}</div>
            <div className="mt-2">
              <StatusBadge value={prediction?.prediction_class} />
            </div>
            <p className="mt-3 text-sm text-slate-600">{prediction?.status ?? "Scoring has not run."}</p>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Feature Contributions">
        <div className="space-y-3">
          {contributions.map(([feature, value]) => (
            <div key={feature} className="grid items-center gap-3 md:grid-cols-[240px_1fr_80px]">
              <span className="text-sm font-medium text-slate-700">{feature.replaceAll("_", " ")}</span>
              <div className="h-2 rounded-md bg-slate-100">
                <div className={`h-2 rounded-md ${value >= 0 ? "bg-brick" : "bg-pine"}`} style={{ width: `${Math.min(100, Math.abs(value) * 4)}%` }} />
              </div>
              <span className="text-right text-sm font-semibold text-ink">{value.toFixed(2)}</span>
            </div>
          ))}
          {!contributions.length && <div className="text-sm text-slate-500">No feature contributions recorded.</div>}
        </div>
      </SectionPanel>

      <SectionPanel title="Evidence Trace">
        <EvidenceList evidence={detail.evidence} />
      </SectionPanel>
    </div>
  );
}

