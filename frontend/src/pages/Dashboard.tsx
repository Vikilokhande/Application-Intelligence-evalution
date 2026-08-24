// Dashboard.tsx — "What needs my attention today?"
// Scheme IDs resolved to real names. No raw UUIDs. Same palette as LandingPage/LoginPage.
import { useState } from "react";
import {
  AlertCircle, CheckCircle2, ClipboardList, Clock,
  ExternalLink, FilePlus2, Search, ShieldCheck,
} from "lucide-react";
import { RecommendationBadge } from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";
import type { AnalyticsOverview, ApplicationSummary, SchemeRead } from "../types/api";

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return "—"; }
}

function derivePriority(app: ApplicationSummary): { label: string; cls: string } {
  const st  = (app.status ?? "").toUpperCase();
  const rec = (app.ai_recommendation ?? "").toUpperCase();
  if (!st.includes("AWAITING_HUMAN_REVIEW")) return { label: "—", cls: "text-slate-400" };
  if (rec.includes("REJECT"))               return { label: "High",   cls: "text-rose-600 font-bold" };
  if (rec.includes("CLARIFICATION"))        return { label: "Medium", cls: "text-amber-600 font-semibold" };
  if (rec.includes("APPROVE"))              return { label: "Normal", cls: "text-emerald-600 font-semibold" };
  return { label: "—", cls: "text-slate-400" };
}

function needsAttention(app: ApplicationSummary): boolean {
  const st = (app.status ?? "").toUpperCase();
  return st.includes("AWAITING_HUMAN_REVIEW") || st.includes("FAILED") || st.includes("ERROR");
}

/* ── Metric KPI Card ─────────────────────────────────────────────── */
function KpiCard({
  label, value, sub, icon, accent,
}: { label: string; value: string | number; sub?: string; icon: React.ReactNode; accent: "navy" | "amber" | "red" | "green" | "default" }) {
  const accentCls: Record<string, string> = {
    navy:    "bg-[#0A2540] text-white",
    amber:   "bg-amber-50 border border-amber-200",
    red:     "bg-rose-50 border border-rose-200",
    green:   "bg-emerald-50 border border-emerald-200",
    default: "bg-slate-50 border border-slate-200",
  };
  const valCls: Record<string, string> = {
    navy:    "text-white",
    amber:   "text-amber-600",
    red:     "text-rose-600",
    green:   "text-emerald-600",
    default: "text-slate-700",
  };
  const iconCls: Record<string, string> = {
    navy:    "bg-white/10 text-white",
    amber:   "bg-amber-100 text-amber-600",
    red:     "bg-rose-100 text-rose-600",
    green:   "bg-emerald-100 text-emerald-600",
    default: "bg-slate-100 text-slate-500",
  };
  return (
    <div className={`rounded-2xl p-5 shadow-sm flex flex-col gap-3 ${accentCls[accent]}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold uppercase tracking-widest ${accent === "navy" ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconCls[accent]}`}>{icon}</div>
      </div>
      <div>
        <p className={`text-3xl font-black leading-none ${valCls[accent]}`}>{value}</p>
        {sub && <p className={`text-xs mt-1 ${accent === "navy" ? "text-slate-300" : "text-slate-400"}`}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
export function Dashboard({
  applications,
  schemes,
  analytics,
  onSelect,
}: {
  applications: ApplicationSummary[];
  schemes: SchemeRead[];
  analytics: AnalyticsOverview | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");

  // Scheme ID → name lookup
  const schemeMap = new Map(schemes.map(s => [s.id, s.name]));
  function schemeName(id: string | null | undefined): string {
    if (!id) return "—";
    return schemeMap.get(id) ?? id.slice(0, 8) + "…"; // fallback to first 8 chars if not found
  }

  const total     = applications.length;
  const attention = applications.filter(a => (a.status ?? "").toUpperCase().includes("AWAITING_HUMAN_REVIEW")).length;
  const pending   = applications.filter(a => needsAttention(a)).length;
  const completed = applications.filter(a => {
    const st = (a.status ?? "").toUpperCase();
    return st.includes("APPROVED") || st.includes("REJECTED") || st.includes("CLARIFICATION_REQUESTED");
  }).length;

  const filtered = applications
    .filter(a => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = schemeName(a.scheme_id).toLowerCase();
      return (
        a.applicant_name?.toLowerCase().includes(q) ||
        a.project_title?.toLowerCase().includes(q)  ||
        name.includes(q)
      );
    })
    .sort((a, b) => (needsAttention(b) ? 1 : 0) - (needsAttention(a) ? 1 : 0));

  return (
    <div className="max-w-[1200px] mx-auto space-y-7 animate-slide-up font-sans">

      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#0A2540] tracking-tight">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Applications requiring your attention today.</p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-[#0A2540] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0d2f50] active:scale-[0.98] transition shadow-sm"
        >
          <FilePlus2 size={15} /> New Application
        </button>
      </div>

      {/* ── KPI Row ───────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Applications" value={total}     icon={<ClipboardList size={17} />} accent="navy" />
        <KpiCard label="Needs Review"       value={attention} icon={<Clock size={17} />}         accent="amber" sub="Awaiting decision" />
        <KpiCard label="Needs Attention"    value={pending}   icon={<AlertCircle size={17} />}   accent="red"   sub="Issues found" />
        <KpiCard label="Completed"          value={completed} icon={<CheckCircle2 size={17} />}  accent="green"
          sub={analytics?.average_processing_time_hours != null ? `Avg ${analytics.average_processing_time_hours.toFixed(1)}h` : undefined}
        />
      </div>

      {/* ── Applications Table ────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <ShieldCheck size={15} className="text-[#0A2540]" />
            <h2 className="text-sm font-bold text-[#0A2540]">Applications</h2>
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">{filtered.length}</span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search applicant, project or scheme…"
              className="form-input pl-8 pr-3 py-1.5 w-60 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Applicant & Project", "Scheme", "Submitted", "Status", "Recommendation", "Priority", "Action"].map(h => (
                  <th key={h} className={`text-left px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap ${
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
                    className={`cursor-pointer transition-colors hover:bg-[#0A2540]/[0.03] ${urgent ? "border-l-2 border-l-amber-400" : ""}`}
                  >
                    {/* Applicant + Project */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-[#0A2540]">{app.applicant_name ?? "—"}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[220px]">{app.project_title ?? "—"}</p>
                    </td>
                    {/* Scheme name (NOT the UUID) */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 max-w-[160px] truncate block">
                        {schemeName(app.scheme_id)}
                      </span>
                    </td>
                    {/* Submitted */}
                    <td className="px-5 py-4 text-slate-500 text-xs hidden lg:table-cell whitespace-nowrap">{fmtDate(app.created_at)}</td>
                    {/* Status */}
                    <td className="px-5 py-4"><StatusBadge value={app.status} /></td>
                    {/* Recommendation */}
                    <td className="px-5 py-4 hidden xl:table-cell">
                      <RecommendationBadge value={app.ai_recommendation} />
                    </td>
                    {/* Priority */}
                    <td className={`px-5 py-4 text-sm hidden lg:table-cell ${priority.cls}`}>{priority.label}</td>
                    {/* Action */}
                    <td className="px-5 py-4">
                      <button
                        onClick={e => { e.stopPropagation(); onSelect(app.id); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#0A2540]/20 bg-[#0A2540]/5 px-3 py-1.5 text-xs font-semibold text-[#0A2540] hover:bg-[#0A2540] hover:text-white transition"
                      >
                        <ExternalLink size={11} /> Review
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center text-sm text-slate-400">
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
