import { AlertTriangle, CheckCircle2, Clock3, FileText } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile icon={FileText} label="Applications" value={analytics?.total_applications ?? applications.length} />
        <MetricTile icon={Clock3} label="Awaiting Review" value={awaiting} accent="text-cobalt" />
        <MetricTile icon={AlertTriangle} label="Suspicious Count" value={analytics?.suspicious_application_count ?? 0} accent="text-brick" />
        <MetricTile icon={CheckCircle2} label="Decisions" value={decided} accent="text-emerald-700" />
      </div>

      <SectionPanel title="Recent Applications">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="py-2 pr-3">Applicant</th>
                <th className="py-2 pr-3">Project</th>
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">AI Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {applications.map((item) => (
                <tr key={item.id} className="cursor-pointer hover:bg-field" onClick={() => onSelect(item.id)}>
                  <td className="py-3 pr-3 font-medium text-ink">{item.applicant_name ?? "Pending"}</td>
                  <td className="py-3 pr-3">{item.project_title ?? "Untitled"}</td>
                  <td className="py-3 pr-3">{item.project_category ?? "Unassigned"}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge value={item.status} />
                  </td>
                  <td className="py-3 pr-3">{item.ai_recommendation?.replaceAll("_", " ") ?? "Pending"}</td>
                </tr>
              ))}
              {!applications.length && (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={5}>
                    No applications have been created yet.
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

