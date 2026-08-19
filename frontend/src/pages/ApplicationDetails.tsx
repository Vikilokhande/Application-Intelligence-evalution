import { DecisionPanel } from "../components/DecisionPanel";
import { EvidenceList } from "../components/EvidenceList";
import { ScoreBar } from "../components/ScoreBar";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail } from "../types/api";

export function ApplicationDetails({
  detail,
  onDecision,
  busy
}: {
  detail: ApplicationDetail | null;
  onDecision: (payload: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  if (!detail) {
    return <SectionPanel title="Application Details">Select or create an application.</SectionPanel>;
  }
  const prediction = detail.predictions.at(-1);

  return (
    <div className="space-y-4">
      <SectionPanel title="Application Summary">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Applicant" value={detail.applicant_name ?? "Pending"} />
          <Field label="Project" value={detail.project_title ?? "Untitled"} />
          <Field label="Category" value={detail.project_category ?? "Unassigned"} />
          <div>
            <div className="text-xs uppercase tracking-[0.08em] text-slate-500">Status</div>
            <div className="mt-1">
              <StatusBadge value={detail.status} />
            </div>
          </div>
        </div>
      </SectionPanel>

      <SectionPanel title="Documents">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {detail.documents.map((document) => (
            <div className="rounded-md border border-line bg-field p-3" key={document.id}>
              <div className="font-semibold">{document.filename}</div>
              <div className="mt-2 text-sm text-slate-600">{document.document_type}</div>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="Extracted Information">
        <pre className="max-h-72 overflow-auto rounded-md bg-[#172026] p-3 text-xs text-white">{JSON.stringify(detail.latest_profile, null, 2)}</pre>
      </SectionPanel>

      <SectionPanel title="Validation Results">
        <ResultRows rows={detail.validation_results.map((item) => ({ name: item.validation_type, status: item.status, reason: item.message }))} />
      </SectionPanel>

      <SectionPanel title="Rule Results">
        <ResultRows rows={detail.rule_results.map((item) => ({ name: item.rule_id, status: item.result, reason: item.reason }))} />
      </SectionPanel>

      <SectionPanel title="ML Scores">
        <div className="grid gap-4 md:grid-cols-2">
          <ScoreBar label="Quality Score" value={prediction?.quality_score ?? null} tone="bg-pine" />
          <ScoreBar label="Risk Score" value={prediction?.risk_score ?? null} tone="bg-brick" />
        </div>
      </SectionPanel>

      <SectionPanel title="Evidence">
        <EvidenceList evidence={detail.evidence} />
      </SectionPanel>

      <SectionPanel title="AI Recommendation">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge value={detail.ai_recommendation} />
          <span className="text-sm text-slate-600">{String(detail.reviewer_assignment?.routing_reason ?? "Routing pending")}</span>
        </div>
      </SectionPanel>

      <DecisionPanel recommendation={detail.ai_recommendation} onSubmit={onDecision} busy={busy} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.08em] text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-ink">{value}</div>
    </div>
  );
}

function ResultRows({ rows }: { rows: Array<{ name: string; status: string; reason: string }> }) {
  return (
    <div className="divide-y divide-line">
      {rows.map((row) => (
        <div className="grid gap-2 py-3 md:grid-cols-[220px_120px_1fr]" key={`${row.name}-${row.reason}`}>
          <div className="font-medium text-ink">{row.name.replaceAll("_", " ")}</div>
          <StatusBadge value={row.status} />
          <div className="text-sm text-slate-600">{row.reason}</div>
        </div>
      ))}
      {!rows.length && <div className="py-4 text-sm text-slate-500">No results recorded.</div>}
    </div>
  );
}

