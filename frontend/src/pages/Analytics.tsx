// Analytics.tsx — Clearance Review Analytics.
// Palette: Deep Navy Blue (#0A243F), Dark Navy (#071A2B), Mustard Gold (#D5A51A), Warm Off-White (#F8F9FA), White (#FFFFFF), Slate Gray (#66717C), Soft Gray (#E5E7EB).
import { BarChart3, CheckCircle2, ClipboardList, Clock, TrendingUp, ShieldCheck, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../components/ui";
import type { AnalyticsOverview } from "../types/api";

function BarRow({ label, value, max, isTop }: { label: string; value: number; max: number; isTop?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#E5E7EB] last:border-0">
      <span className="text-xs font-semibold text-[#071A2B] w-48 shrink-0 truncate">
        {label.replaceAll("_", " ")}
      </span>
      <div className="flex-1 h-2 rounded-full bg-[#F8F9FA] border border-[#E5E7EB] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isTop ? "bg-[#D5A51A]" : "bg-[#0A243F]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono font-bold text-[#0A243F] w-8 text-right shrink-0">
        {value}
      </span>
    </div>
  );
}

function ChartCard({ title, data, icon }: { title: string; data?: Record<string, number>; icon?: React.ReactNode }) {
  const { t } = useTranslation();
  const entries = Object.entries(data ?? {}).filter(([, v]) => v > 0).slice(0, 8);
  const max = Math.max(...entries.map(([, v]) => v), 1);
  if (entries.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden font-sans">
      <div className="px-5 py-3.5 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-xs font-bold text-[#0A243F] uppercase tracking-wider">{title}</h3>
        </div>
        <span className="text-[10px] font-bold text-[#66717C] uppercase">{entries.length} {t("scoring.card_evidence", "Metrics")}</span>
      </div>
      <div className="p-5 space-y-0.5">
        {entries.map(([k, v], idx) => (
          <BarRow key={k} label={k} value={v} max={max} isTop={idx === 0} />
        ))}
      </div>
    </div>
  );
}

export function Analytics({ analytics }: { analytics: AnalyticsOverview | null }) {
  const { t } = useTranslation();
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

  const avgHours = analytics?.average_processing_time_hours != null
    ? `${analytics.average_processing_time_hours.toFixed(1)}h`
    : "—";

  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-slide-up font-sans">
      <PageHeader
        title={t("analytics.title", "Analytics & Insights")}
        subtitle={t("analytics.subtitle", "System performance, risk distribution, and throughput metrics")}
        breadcrumb={t("nav.group_overview", "System")}
      />

      {/* ── Medium-Sized Proportional Horizontal KPI Row ───────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A243F]/10 text-[#0A243F] shrink-0">
            <ClipboardList size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#66717C]">{t("analytics.total_applications", "Total Applications")}</p>
            <p className="text-2xl font-black text-[#0A243F] leading-tight mt-0.5">{total}</p>
            <p className="text-[10px] text-[#66717C] truncate">{t("dashboard.stat_total_desc", "Cumulative submissions")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D5A51A]/20 text-[#B45309] shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">{t("analytics.avg_risk_score", "Pending Review")}</p>
            <p className="text-2xl font-black text-[#92400E] leading-tight mt-0.5">{pending}</p>
            <p className="text-[10px] text-[#B45309] truncate">{t("dashboard.stat_pending_desc", "Awaiting officer decision")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A243F]/10 text-[#0A243F] shrink-0">
            <TrendingUp size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#66717C]">{t("analytics.avg_processing_time", "Avg Processing Time")}</p>
            <p className="text-2xl font-black text-[#0A243F] leading-tight mt-0.5">{avgHours}</p>
            <p className="text-[10px] text-[#66717C] truncate">{t("scoring.subtitle", "Submission to clearance")}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A243F]/10 text-[#0A243F] shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#66717C]">{t("analytics.approval_rate", "Completed Clearances")}</p>
            <p className="text-2xl font-black text-[#0A243F] leading-tight mt-0.5">{completed}</p>
            <p className="text-[10px] text-[#66717C] truncate">{t("dashboard.stat_processed_desc", "Clearance decisions logged")}</p>
          </div>
        </div>
      </div>

      {/* ── Charts Grid (Navy & Mustard Gold Visual Identity) ─────────────────────────── */}
      {analytics ? (
        <div className="grid gap-4 md:grid-cols-2">
          <ChartCard
            title={t("analytics.status_distribution", "Application Status Distribution")}
            data={analytics.applications_by_status}
            icon={<Activity size={15} className="text-[#0A243F]" />}
          />
          <ChartCard
            title={t("analytics.decision_outcomes", "Review Decisions Breakdown")}
            data={analytics.decision_distribution}
            icon={<ShieldCheck size={15} className="text-[#0A243F]" />}
          />
          <ChartCard
            title={t("analytics.risk_distribution", "Risk Classification Index")}
            data={analytics.risk_distribution}
            icon={<TrendingUp size={15} className="text-[#0A243F]" />}
          />
          <ChartCard
            title={t("analytics.common_violations", "Validation Checklist Observations")}
            data={analytics.validation_failure_frequency}
            icon={<CheckCircle2 size={15} className="text-[#0A243F]" />}
          />
          <ChartCard
            title={t("analytics.scheme_performance", "Processing Volume by Scheme")}
            data={analytics.scheme_statistics}
            icon={<BarChart3 size={15} className="text-[#0A243F]" />}
          />
          <ChartCard
            title={t("details.officer", "Reviewer Caseload Workload")}
            data={analytics.reviewer_workload}
            icon={<ClipboardList size={15} className="text-[#0A243F]" />}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center text-[#66717C] text-sm">
          {t("common.loading", "Analytics data is loading…")}
        </div>
      )}
    </div>
  );
}

