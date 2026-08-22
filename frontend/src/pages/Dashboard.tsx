// Structural Idea: A dense forensic command dashboard presenting key operational KPIs, a high-density risk priority queue with internal panel scrolling (max 440px height), and live telemetry breakdowns within a single 1440x900 viewport framed by environmental topographic contours.

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert,
  Terminal,
} from "lucide-react";
import type { AnalyticsOverview, ApplicationSummary } from "../types/api";

export function Dashboard({
  applications,
  analytics,
  onSelect,
}: {
  applications: ApplicationSummary[];
  analytics: AnalyticsOverview | null;
  onSelect: (id: string) => void;
}) {
  const awaiting = applications.filter(
    (item) => item.status === "AWAITING_HUMAN_REVIEW"
  ).length;
  const decided = applications.filter(
    (item) => item.status === "HUMAN_DECISION_RECORDED"
  ).length;
  const suspiciousCount =
    analytics?.suspicious_application_count ??
    applications.filter(
      (item) => item.status.includes("FAIL") || item.status.includes("WARN")
    ).length;

  // Priority evaluator based strictly on DESIGN.md tokens: #D9534F (critical), #E0A93D (risk), #3DDC84 (verified)
  function getPriority(item: ApplicationSummary) {
    const s = (item.status || "").toUpperCase();
    const rec = (item.ai_recommendation || "").toUpperCase();
    if (
      s.includes("FAIL") ||
      s.includes("REJECT") ||
      rec.includes("REJECT") ||
      rec.includes("HIGH")
    ) {
      return {
        label: "CRITICAL",
        badgeStyle: "border-[#D9534F] bg-[#D9534F]/10 text-[#D9534F]",
      };
    }
    if (
      s.includes("AWAIT") ||
      s.includes("WARN") ||
      rec.includes("CLARIF") ||
      rec.includes("MEDIUM")
    ) {
      return {
        label: "RISK WARN",
        badgeStyle: "border-[#E0A93D] bg-[#E0A93D]/10 text-[#E0A93D]",
      };
    }
    return {
      label: "VERIFIED",
      badgeStyle: "border-[#3DDC84] bg-[#3DDC84]/10 text-[#3DDC84]",
    };
  }

  return (
    <div className="relative space-y-4 font-sans text-[#E8EDF1] max-w-[1400px] mx-auto">
      {/* Topographic Contour Background Layer Signature Motif */}
      <div
        className="pointer-events-none absolute -inset-4 z-0 overflow-hidden opacity-[0.08]"
        aria-hidden="true"
      >
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,100 Q 250,50 500,120 T 1000,80 M 0,200 Q 300,150 600,220 T 1000,180 M 0,300 Q 200,280 500,340 T 1000,290 M 0,400 Q 400,350 700,420 T 1000,390 M 0,500 Q 150,470 450,530 T 1000,490"
            fill="none"
            stroke="#3DDC84"
            strokeWidth="1.5"
          />
          <path
            d="M 0,50 Q 350,120 700,60 T 1000,140 M 0,160 Q 150,220 450,170 T 1000,240 M 0,270 Q 450,310 800,260 T 1000,330 M 0,380 Q 250,430 550,370 T 1000,440"
            fill="none"
            stroke="#22303A"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Main Content Layout Container */}
      <div className="relative z-10 space-y-4">
        {/* Command Telemetry Header Strip */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84]">
              <Terminal size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase">
                  APPLICATION INTELLIGENCE COMMAND CENTER
                </h1>
                <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px]">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-[#8B99A6] mt-0.5">
                Directorate of Environment & Climate Change • Case Intake, Forensic Validation & Review Queue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[#8B99A6] bg-[#0B0F14] border border-[#22303A] px-3 py-1.5 rounded-[6px]">
            <Activity size={13} className="text-[#3DDC84]" />
            <span>QUEUE STATUS: ACTIVE</span>
          </div>
        </div>

        {/* Operational KPI Metric Strip (4 Stat Cards) */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Applications */}
          <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#8B99A6] uppercase tracking-wider">
                Total Intake
              </div>
              <div className="font-mono text-2xl font-bold text-[#E8EDF1] mt-1">
                {String(
                  analytics?.total_applications ?? applications.length
                ).padStart(2, "0")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#8B99A6]">
              <FileText size={18} />
            </div>
          </div>

          {/* Card 2: Awaiting Review */}
          <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#8B99A6] uppercase tracking-wider">
                Awaiting Review
              </div>
              <div className="font-mono text-2xl font-bold text-[#E0A93D] mt-1">
                {String(awaiting).padStart(2, "0")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#E0A93D]/30 bg-[#E0A93D]/10 text-[#E0A93D]">
              <Clock size={18} />
            </div>
          </div>

          {/* Card 3: Suspicious / Risk Flagged */}
          <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#8B99A6] uppercase tracking-wider">
                Risk Flagged
              </div>
              <div className="font-mono text-2xl font-bold text-[#D9534F] mt-1">
                {String(suspiciousCount).padStart(2, "0")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#D9534F]/30 bg-[#D9534F]/10 text-[#D9534F]">
              <AlertTriangle size={18} />
            </div>
          </div>

          {/* Card 4: Finalized Decisions */}
          <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#8B99A6] uppercase tracking-wider">
                Decisions Record
              </div>
              <div className="font-mono text-2xl font-bold text-[#3DDC84] mt-1">
                {String(decided).padStart(2, "0")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#3DDC84]/30 bg-[#3DDC84]/10 text-[#3DDC84]">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </div>

        {/* Analytical Split Grid (2-Column Desktop View) */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left Column (2 Cols): Intelligent Review Priority Queue */}
          <div className="lg:col-span-2 rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden flex flex-col">
            {/* Table Header Strip */}
            <div className="flex items-center justify-between border-b border-[#22303A] px-4 py-3 bg-[#0B0F14]/50">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#3DDC84]" />
                <h2 className="font-mono text-xs font-bold tracking-wider text-[#E8EDF1] uppercase">
                  INTELLIGENT REVIEW PRIORITY QUEUE
                </h2>
              </div>
              <span className="font-mono text-[11px] text-[#8B99A6]">
                CASES: {applications.length}
              </span>
            </div>

            {/* Table Panel Container with Internal Scroll (Fixed max-h-[440px]) */}
            <div className="max-h-[440px] overflow-y-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead className="sticky top-0 z-10 border-b border-[#22303A] bg-[#131A21] font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Applicant</th>
                    <th className="py-2.5 px-3">Project Title</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">AI Rec</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22303A]">
                  {applications.map((item) => {
                    const priority = getPriority(item);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className="group cursor-pointer transition-colors hover:bg-[#0B0F14]"
                      >
                        {/* Priority Badge */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded-[4px] border uppercase ${priority.badgeStyle}`}
                          >
                            {priority.label}
                          </span>
                        </td>

                        {/* Applicant Name */}
                        <td className="py-2.5 px-3 font-semibold text-[#E8EDF1]">
                          {item.applicant_name ?? "Pending Applicant"}
                        </td>

                        {/* Project Title */}
                        <td className="py-2.5 px-3 text-[#8B99A6] max-w-[200px] truncate">
                          {item.project_title ?? "Untitled Project"}
                        </td>

                        {/* Status Code */}
                        <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-[#E8EDF1]">
                          <span className="rounded-[4px] border border-[#22303A] bg-[#0B0F14] px-2 py-0.5 uppercase">
                            {item.status.replaceAll("_", " ")}
                          </span>
                        </td>

                        {/* AI Recommendation */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#8B99A6]">
                          {item.ai_recommendation?.replaceAll("_", " ") ?? "PENDING"}
                        </td>

                        {/* Action Inspect Button */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(item.id);
                            }}
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#3DDC84] border border-[#22303A] bg-[#0B0F14] px-2.5 py-1 rounded-[4px] hover:border-[#3DDC84] focus:outline-none focus:ring-1 focus:ring-[#3DDC84] transition-colors"
                          >
                            <span>INSPECT</span>
                            <ArrowRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {!applications.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-10 text-center font-mono text-xs text-[#8B99A6]"
                      >
                        NO APPLICATIONS IN CURRENT QUEUE
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column (1 Col): System Telemetry & Risk Overview Breakdown */}
          <div className="space-y-4">
            {/* Risk Breakdown Panel */}
            <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4">
              <div className="flex items-center justify-between border-b border-[#22303A] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-[#D9534F]" />
                  <h3 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
                    RISK AUDIT SUMMARY
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-[#D9534F] font-bold">
                  {suspiciousCount} FLAGS
                </span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between rounded-[6px] border border-[#D9534F]/30 bg-[#D9534F]/10 p-2.5">
                  <span className="text-[#E8EDF1] font-medium">SUSPICIOUS APPLICATIONS</span>
                  <span className="font-bold text-[#D9534F]">{suspiciousCount}</span>
                </div>

                {analytics?.risk_distribution ? (
                  Object.entries(analytics.risk_distribution).map(([rk, count]) => (
                    <div
                      key={rk}
                      className="flex items-center justify-between border-b border-[#22303A] pb-1.5 text-[11px]"
                    >
                      <span className="text-[#8B99A6] uppercase">{rk.replaceAll("_", " ")}</span>
                      <span className="font-bold text-[#E8EDF1]">{count}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-[#8B99A6] italic py-1">
                    System scanning live telemetry...
                  </div>
                )}
              </div>
            </div>

            {/* Platform Processing Health Distribution */}
            <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-4">
              <div className="flex items-center justify-between border-b border-[#22303A] pb-2.5 mb-3">
                <h3 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
                  STATUS DISTRIBUTION
                </h3>
                <span className="font-mono text-[10px] text-[#3DDC84]">LIVE</span>
              </div>

              <div className="space-y-2 font-mono text-xs">
                {analytics?.applications_by_status ? (
                  Object.entries(analytics.applications_by_status).map(([st, count]) => (
                    <div
                      key={st}
                      className="flex items-center justify-between border-b border-[#22303A] pb-1.5 text-[11px]"
                    >
                      <span className="text-[#8B99A6] uppercase">{st.replaceAll("_", " ")}</span>
                      <span className="font-bold text-[#3DDC84]">{count}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-[#8B99A6] italic py-1">
                    Fetching status distribution...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
