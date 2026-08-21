import { BarChart3, Clock, FileText, UserCheck, ShieldAlert, Sparkles, Activity } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { SectionPanel } from "../components/SectionPanel";
import type { AnalyticsOverview } from "../types/api";

export function Analytics({ analytics }: { analytics: AnalyticsOverview | null }) {
  const overview = analytics;

  return (
    <div className="space-y-6">
      {/* Analytics Banner */}
      <div className="panel border-l-4 border-l-[#0F766E] bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                Governance Analytics & Operational Performance
              </h1>
              <span className="ai-boundary-badge">Directorate Analytics</span>
            </div>
            <p className="mt-1 text-xs text-[#475569]">
              Directorate of Environment & Climate Change - Real-time throughput, risk distribution, rule failure frequency & reviewer performance.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3.5 py-2 shadow-sm">
            <BarChart3 size={16} className="text-[#0F766E]" />
            <div className="text-xs font-bold text-[#0F766E]">REAL-TIME TELEMETRY</div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile icon={FileText} label="Total Applications" value={overview?.total_applications ?? 0} />
        <MetricTile icon={Clock} label="Avg Processing Hours" value={overview?.average_processing_time_hours ?? 0} accent="text-sky-600" />
        <MetricTile icon={ShieldAlert} label="Suspicious Count" value={overview?.suspicious_application_count ?? 0} accent="text-rose-600" />
        <MetricTile icon={UserCheck} label="Active Reviewer Roles" value={Object.keys(overview?.reviewer_workload ?? {}).length} accent="text-amber-600" />
      </div>

      {/* Analytics Distributions Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <Distribution title="Applications by Processing Status" data={overview?.applications_by_status ?? {}} />
        <Distribution title="Risk Distribution Analysis" data={overview?.risk_distribution ?? {}} />
        <Distribution title="Rule Failure Frequency" data={overview?.rule_failure_frequency ?? {}} />
        <Distribution title="Scheme-wise Application Counts" data={overview?.scheme_statistics ?? {}} />
        <Distribution title="Decision Breakdown" data={overview?.decision_distribution ?? {}} />
        <Distribution title="Reviewer Workload Distribution" data={overview?.reviewer_workload ?? {}} />
        <Distribution title="Document Processing Statistics" data={overview?.document_processing_statistics ?? {}} />
        <Distribution title="OCR Usage" data={overview?.ocr_usage ?? {}} />
        <Distribution title="LLM Extraction Usage" data={overview?.llm_usage ?? {}} />
        <Distribution title="Routing Status Distribution" data={overview?.routing_distribution ?? {}} />
        <Distribution title="Validation Failure Frequency" data={overview?.validation_failure_frequency ?? {}} />
      </div>

      {/* Reviewer Performance Matrix Table */}
      <SectionPanel title="Reviewer Performance & Governance Auditing">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              <tr>
                <th className="py-3 px-4">Reviewer ID / Role</th>
                <th className="py-3 px-4">Decisions Rendered</th>
                <th className="py-3 px-4">Clarifications Requested</th>
                <th className="py-3 px-4">AI Recommendation Overrides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {Object.entries(overview?.reviewer_performance ?? {}).map(([reviewer, stats]) => (
                <tr key={reviewer} className="hover:bg-[#F8FAFC]">
                  <td className="py-3.5 px-4 font-bold text-[#0F172A]">{reviewer}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-[#0F766E]">{stats.decisions ?? 0}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-amber-700">{stats.request_clarification ?? 0}</td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-rose-700">{stats.overrides ?? 0}</td>
                </tr>
              ))}
              {!Object.keys(overview?.reviewer_performance ?? {}).length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-xs text-[#64748B] italic">
                    No reviewer performance telemetry recorded yet.
                  </td>
                </tr>
              )}
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
        {Object.entries(data).map(([key, value]) => {
          const widthPercent = Math.min(100, Math.max(5, (value / max) * 100));
          return (
            <div className="space-y-1" key={key}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#0F172A] uppercase">{key.replaceAll("_", " ")}</span>
                <span className="font-mono font-extrabold text-[#0F766E]">{value}</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0F766E] transition-all duration-500"
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
        {!Object.keys(data).length && <div className="text-xs text-[#64748B] italic">No telemetry data recorded.</div>}
      </div>
    </SectionPanel>
  );
}
