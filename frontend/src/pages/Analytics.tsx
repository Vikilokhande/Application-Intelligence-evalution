import { BarChart3, Clock3, FileText, UserCheck } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { SectionPanel } from "../components/SectionPanel";
import type { AnalyticsOverview } from "../types/api";

export function Analytics({ analytics }: { analytics: AnalyticsOverview | null }) {
  const overview = analytics;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile icon={FileText} label="Total Applications" value={overview?.total_applications ?? 0} />
        <MetricTile icon={Clock3} label="Avg Processing Hours" value={overview?.average_processing_time_hours ?? 0} accent="text-cobalt" />
        <MetricTile icon={BarChart3} label="Suspicious Count" value={overview?.suspicious_application_count ?? 0} accent="text-brick" />
        <MetricTile icon={UserCheck} label="Reviewer Roles" value={Object.keys(overview?.reviewer_workload ?? {}).length} accent="text-saffron" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Distribution title="Applications by Status" data={overview?.applications_by_status ?? {}} />
        <Distribution title="Risk Distribution" data={overview?.risk_distribution ?? {}} />
        <Distribution title="Rule Failure Frequency" data={overview?.rule_failure_frequency ?? {}} />
        <Distribution title="Scheme Statistics" data={overview?.scheme_statistics ?? {}} />
        <Distribution title="Decision Distribution" data={overview?.decision_distribution ?? {}} />
        <Distribution title="Reviewer Workload" data={overview?.reviewer_workload ?? {}} />
      </div>

      <SectionPanel title="Reviewer Performance">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="py-2 pr-3">Reviewer</th>
                <th className="py-2 pr-3">Decisions</th>
                <th className="py-2 pr-3">Clarifications</th>
                <th className="py-2 pr-3">Overrides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {Object.entries(overview?.reviewer_performance ?? {}).map(([reviewer, stats]) => (
                <tr key={reviewer}>
                  <td className="py-3 pr-3 font-medium">{reviewer}</td>
                  <td className="py-3 pr-3">{stats.decisions ?? 0}</td>
                  <td className="py-3 pr-3">{stats.request_clarification ?? 0}</td>
                  <td className="py-3 pr-3">{stats.overrides ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionPanel>
    </div>
  );
}

function Distribution({ title, data }: { title: string; data: Record<string, number> }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <SectionPanel title={title}>
      <div className="space-y-3">
        {Object.entries(data).map(([key, value]) => (
          <div className="grid items-center gap-3 md:grid-cols-[200px_1fr_40px]" key={key}>
            <span className="truncate text-sm font-medium text-slate-700">{key.replaceAll("_", " ")}</span>
            <div className="h-2 rounded-md bg-slate-100">
              <div className="h-2 rounded-md bg-pine" style={{ width: `${(value / max) * 100}%` }} />
            </div>
            <span className="text-right text-sm font-semibold">{value}</span>
          </div>
        ))}
        {!Object.keys(data).length && <div className="text-sm text-slate-500">No analytics recorded.</div>}
      </div>
    </SectionPanel>
  );
}
