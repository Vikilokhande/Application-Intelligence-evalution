import { AlertTriangle, CheckCircle2, Clock, FileText, Sparkles, ArrowRight, ShieldAlert, Activity } from "lucide-react";
import { MetricTile } from "../components/MetricTile";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { AnalyticsOverview, ApplicationSummary } from "../types/api";

export function Dashboard({
  applications,
  analytics,
  onSelect
}: {
  applications: ApplicationSummary[];
  analytics: AnalyticsOverview | null;
  onSelect: (id: string) => void;
}) {
  const awaiting = applications.filter((item) => item.status === "AWAITING_HUMAN_REVIEW").length;
  const decided = applications.filter((item) => item.status === "HUMAN_DECISION_RECORDED").length;
  const suspiciousCount = analytics?.suspicious_application_count ?? applications.filter((item) => item.status.includes("FAIL") || item.status.includes("WARN")).length;

  // Compute priority per application based on status & recommendation
  function getPriority(item: ApplicationSummary) {
    const s = (item.status || "").toUpperCase();
    const rec = (item.ai_recommendation || "").toUpperCase();
    if (s.includes("FAIL") || s.includes("REJECT") || rec.includes("REJECT") || rec.includes("HIGH")) {
      return { label: "HIGH PRIORITY", tone: "bg-rose-100 text-rose-800 border-rose-300" };
    }
    if (s.includes("AWAIT") || s.includes("WARN") || rec.includes("CLARIF")) {
      return { label: "MEDIUM PRIORITY", tone: "bg-amber-100 text-amber-800 border-amber-300" };
    }
    return { label: "LOW PRIORITY", tone: "bg-[#F0FDF4] text-[#0F766E] border-emerald-200" };
  }

  return (
    <div className="space-y-6">
      {/* Command Center Header */}
      <div className="panel border-l-4 border-l-[#0F766E] bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                Application Intelligence Command Center
              </h1>
              <span className="ai-boundary-badge">✦ Active Operational Queue</span>
            </div>
            <p className="mt-1 text-xs text-[#475569]">
              Directorate Review Platform • Real-time case intake, automated validation & human reviewer queue.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3.5 py-2 shadow-sm">
            <Sparkles size={16} className="text-[#0F766E]" />
            <div className="text-xs font-bold text-[#0F766E]">AI ASSISTS • HUMAN DECIDES</div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile icon={FileText} label="Total Applications" value={analytics?.total_applications ?? applications.length} />
        <MetricTile icon={Clock} label="Awaiting Review" value={awaiting} accent="text-amber-600" />
        <MetricTile icon={AlertTriangle} label="Suspicious / Risk Flagged" value={suspiciousCount} accent="text-rose-600" />
        <MetricTile icon={CheckCircle2} label="Decisions Finalized" value={decided} accent="text-[#0F766E]" />
      </div>

      {/* Intelligent Review Priority Queue Table */}
      <SectionPanel
        title="Intelligent Review Priority Queue"
        action={
          <span className="text-xs text-[#64748B] font-semibold">
            Prioritized by Risk & Actionability ({applications.length} total)
          </span>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
              <tr>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Project Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">AI Recommendation</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] bg-white">
              {applications.map((item) => {
                const priority = getPriority(item);
                return (
                  <tr
                    key={item.id}
                    className="cursor-pointer transition hover:bg-[#F8FAFC]"
                    onClick={() => onSelect(item.id)}
                  >
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${priority.tone}`}>
                        {priority.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#0F172A]">{item.applicant_name ?? "Pending Applicant"}</td>
                    <td className="py-3.5 px-4 font-medium text-[#1E293B] max-w-xs truncate">{item.project_title ?? "Untitled Project"}</td>
                    <td className="py-3.5 px-4 text-[#475569]">{item.project_category ?? "Unassigned"}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge value={item.status} />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                      {item.ai_recommendation?.replaceAll("_", " ") ?? "Pending Evaluation"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button className="secondary-button text-xs py-1 px-3">
                        Inspect <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!applications.length && (
                <tr>
                  <td className="py-8 text-center text-[#64748B]" colSpan={7}>
                    No applications created yet. Use <span className="font-bold text-[#0F766E]">New Application</span> intake to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionPanel>

      {/* Analytics & Platform Health Breakdown Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Status Distribution */}
        <SectionPanel title="Platform Processing Health">
          <div className="space-y-3">
            {analytics?.applications_by_status ? (
              Object.entries(analytics.applications_by_status).map(([st, count]) => (
                <div key={st} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <span className="font-semibold text-slate-700 uppercase">{st.replaceAll("_", " ")}</span>
                  <span className="font-mono font-bold text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#64748B] italic">Loading status distribution...</div>
            )}
          </div>
        </SectionPanel>

        {/* Risk Breakdown */}
        <SectionPanel title="Risk Overview & Suspicious Indicators">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <ShieldAlert size={16} /> Flagged Suspicious Applications
              </div>
              <span className="font-mono font-extrabold text-rose-900 text-sm">{suspiciousCount}</span>
            </div>
            {analytics?.risk_distribution ? (
              Object.entries(analytics.risk_distribution).map(([rk, count]) => (
                <div key={rk} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs">
                  <span className="font-semibold text-slate-700 uppercase">{rk.replaceAll("_", " ")}</span>
                  <span className="font-mono font-bold text-[#0F172A] bg-slate-100 px-2 py-0.5 rounded">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#64748B] italic">Loading risk metrics...</div>
            )}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
