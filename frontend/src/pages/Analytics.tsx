// Analytics.tsx — Business analytics only. No System Diagnostics.
import { BarChart3, CheckCircle2, ClipboardList, Clock, TrendingUp } from "lucide-react";
import { MetricCard, PageHeader } from "../components/ui";
import type { AnalyticsOverview } from "../types/api";

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-600 w-44 shrink-0 truncate">{label.replaceAll("_", " ")}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-700 w-8 text-right">{value}</span>
    </div>
  );
}

function ChartCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data ?? {}).filter(([, v]) => v > 0).slice(0, 10);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  if (entries.length === 0) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      </div>
      <div className="px-5 py-3">
        {entries.map(([k, v]) => <BarRow key={k} label={k} value={v} max={max} />)}
      </div>
    </div>
  );
}

type Tab = "status" | "documents" | "reviewers";

export function Analytics({ analytics }: { analytics: AnalyticsOverview | null }) {
  const total     = analytics?.total_applications ?? 0;
  const pending   = analytics ? Object.entries(analytics.applications_by_status ?? {})
    .filter(([k]) => k.toUpperCase().includes("AWAITING") || k.toUpperCase().includes("PENDING"))
    .reduce((s, [, v]) => s + v, 0) : 0;
  const completed = analytics ? (
    (analytics.decision_distribution?.APPROVE ?? 0) +
    (analytics.decision_distribution?.REJECT  ?? 0) +
    (analytics.decision_distribution?.APPROVED ?? 0) +
    (analytics.decision_distribution?.REJECTED ?? 0)
  ) : 0;

  return (
    <div className="max-w-[1100px] mx-auto space-y-6 animate-slide-up">
      <PageHeader
        title="Analytics"
        subtitle="Application review performance and outcomes."
        breadcrumb="System"
      />

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Applications"  value={total}     icon={<ClipboardList size={20} />} accent="blue" />
        <MetricCard label="Pending Review"      value={pending}   icon={<Clock size={20} />}         accent="amber" />
        <MetricCard
          label="Avg Processing Time"
          value={analytics?.average_processing_time_hours != null
            ? `${analytics.average_processing_time_hours.toFixed(1)}h`
            : "N/A"}
          icon={<TrendingUp size={20} />}
          accent="default"
        />
        <MetricCard label="Completed Decisions" value={completed} icon={<CheckCircle2 size={20} />}  accent="green" />
      </div>

      {/* Charts grid */}
      {analytics ? (
        <div className="grid gap-5 md:grid-cols-2">
          <ChartCard title="Application Status"   data={analytics.applications_by_status} />
          <ChartCard title="Review Outcomes"      data={analytics.decision_distribution} />
          <ChartCard title="Risk Distribution"    data={analytics.risk_distribution} />
          <ChartCard title="Validation Issues"    data={analytics.validation_failure_frequency} />
          <ChartCard title="Processing by Scheme" data={analytics.scheme_statistics} />
          <ChartCard title="Reviewer Workload"    data={analytics.reviewer_workload} />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-400 text-sm">
          Analytics data is loading…
        </div>
      )}
    </div>
  );
}
