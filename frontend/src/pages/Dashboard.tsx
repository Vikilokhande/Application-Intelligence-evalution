// Dashboard.tsx — "What needs my attention today?"
// No internal IDs. Human-readable status. Priority derived from real data only.
import { useState } from "react";
import {
  AlertCircle, CheckCircle2, ClipboardList, Clock,
  ExternalLink, FilePlus2, Search,
} from "lucide-react";
import { MetricCard, PageHeader, RecommendationBadge } from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";
import type { AnalyticsOverview, ApplicationSummary } from "../types/api";

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return "—"; }
}

function humanStatus(status: string | null | undefined): string {
  const map: Record<string, string> = {
    PENDING:                 "Pending",
    PROCESSING:              "Processing",
    AWAITING_HUMAN_REVIEW:   "Needs Review",
    APPROVED:                "Approved",
    REJECTED:                "Rejected",
    CLARIFICATION_REQUESTED: "Clarification Requested",
    FAILED:                  "Failed",
    ERROR:                   "Error",
  };
  if (!status) return "—";
  return map[status.toUpperCase()] ?? status.replaceAll("_", " ");
}

function derivePriority(app: ApplicationSummary): { label: string; color: string } {
  const st  = (app.status ?? "").toUpperCase();
  const rec = (app.ai_recommendation ?? "").toUpperCase();
  if (!st.includes("AWAITING_HUMAN_REVIEW")) return { label: "—", color: "text-slate-400" };
  if (rec.includes("REJECT"))               return { label: "High",   color: "text-rose-600 font-bold" };
  if (rec.includes("CLARIFICATION"))        return { label: "Medium", color: "text-amber-600 font-semibold" };
  if (rec.includes("APPROVE"))              return { label: "Normal", color: "text-emerald-600" };
  return { label: "—", color: "text-slate-400" };
}

function needsAttention(app: ApplicationSummary): boolean {
  const st = (app.status ?? "").toUpperCase();
  return st.includes("AWAITING_HUMAN_REVIEW") || st.includes("FAILED") || st.includes("ERROR");
}

/* ── Main ─────────────────────────────────────────────────────────── */
export function Dashboard({
  applications,
  analytics,
  onSelect,
}: {
  applications: ApplicationSummary[];
  analytics: AnalyticsOverview | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  const total     = applications.length;
  const pending   = applications.filter(a => needsAttention(a)).length;
  const attention = applications.filter(a =>
    (a.status ?? "").toUpperCase().includes("AWAITING_HUMAN_REVIEW")
  ).length;
  const completed = applications.filter(a => {
    const st = (a.status ?? "").toUpperCase();
    return st.includes("APPROVED") || st.includes("REJECTED") || st.includes("CLARIFICATION_REQUESTED");
  }).length;

  const filtered = applications
    .filter(a => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.applicant_name?.toLowerCase().includes(q) ||
        a.project_title?.toLowerCase().includes(q)  ||
        a.scheme_id?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (needsAttention(b) ? 1 : 0) - (needsAttention(a) ? 1 : 0));

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-slide-up">
      <PageHeader
        title="Dashboard"
        subtitle="Applications requiring your attention today."
        actions={
          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition"
          >
            <FilePlus2 size={15} /> New Application
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Applications" value={total}     icon={<ClipboardList size={20} />} accent="blue" />
        <MetricCard label="Needs Review"       value={attention} icon={<Clock size={20} />}         accent="amber" sub="Awaiting decision" />
        <MetricCard label="Needs Attention"    value={pending}   icon={<AlertCircle size={20} />}   accent="red"   sub="Issues found" />
        <MetricCard label="Completed"          value={completed} icon={<CheckCircle2 size={20} />}  accent="green"
          sub={analytics?.average_processing_time_hours != null ? `Avg ${analytics.average_processing_time_hours.toFixed(1)}h` : undefined}
        />
      </div>

      {/* Applications table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800">Applications</h2>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search applicant or project…"
              className="form-input pl-8 pr-3 py-1.5 w-52 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {["Applicant", "Scheme", "Submitted", "Status", "Recommendation", "Priority", "Action"].map(h => (
                  <th key={h} className={`text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide ${
                    h === "Submitted"      ? "hidden lg:table-cell" :
                    h === "Recommendation" ? "hidden xl:table-cell" :
                    h === "Priority"       ? "hidden lg:table-cell" : ""
                  }`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(app => {
                const priority = derivePriority(app);
                const urgent   = needsAttention(app);
                return (
                  <tr
                    key={app.id}
                    onClick={() => onSelect(app.id)}
                    className={`cursor-pointer transition-colors hover:bg-teal-50/50 ${urgent ? "bg-amber-50/30" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{app.applicant_name ?? "—"}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{app.project_title ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 text-sm">{app.scheme_id ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs hidden lg:table-cell">{fmtDate(app.created_at)}</td>
                    <td className="px-5 py-3.5"><StatusBadge value={app.status} /></td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <RecommendationBadge value={app.ai_recommendation} />
                    </td>
                    <td className={`px-5 py-3.5 text-sm hidden lg:table-cell ${priority.color}`}>{priority.label}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={e => { e.stopPropagation(); onSelect(app.id); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition"
                      >
                        <ExternalLink size={11} /> Review
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-slate-400">
                    {search ? "No applications match your search." : "No applications yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
