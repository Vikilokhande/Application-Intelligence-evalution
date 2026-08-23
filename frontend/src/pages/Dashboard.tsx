// Structural Idea: A dense forensic command dashboard presenting key operational KPIs, a high-density risk priority queue with internal panel scrolling (max 440px height), and live telemetry breakdowns within a single viewport, styled in the official Light Government Theme.

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

  // Priority evaluator based strictly on Light Government Theme tokens: #DC2626 (critical), #D97706 (warning), #16A34A (verified)
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
        badgeStyle: "border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626]",
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
        badgeStyle: "border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]",
      };
    }
    return {
      label: "VERIFIED",
      badgeStyle: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]",
    };
  }

  return (
    <div className="relative space-y-4 font-sans text-[#0F172A] max-w-[1400px] mx-auto">
      {/* Topographic Contour Background Layer Signature Motif */}
      <div
        className="pointer-events-none absolute -inset-4 z-0 overflow-hidden opacity-[0.04]"
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
            stroke="#0A2540"
            strokeWidth="1.5"
          />
          <path
            d="M 0,50 Q 350,120 700,60 T 1000,140 M 0,160 Q 150,220 450,170 T 1000,240 M 0,270 Q 450,310 800,260 T 1000,330 M 0,380 Q 250,430 550,370 T 1000,440"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Main Content Layout Container */}
      <div className="relative z-10 space-y-4">
        {/* Command Telemetry Header Strip */}
        <div className="rounded-[10px] border border-[#0A2540]/20 bg-[#0A2540] p-4 flex flex-wrap items-center justify-between gap-3 text-[#FFFFFF] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#C59B27]/40 bg-[#C59B27]/20 text-[#C59B27]">
              <Terminal size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans text-sm font-bold tracking-wide text-[#FFFFFF] uppercase">
                  APPLICATION REVIEW COMMAND CENTER
                </h1>
                <span className="font-mono text-[10px] font-semibold text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2 py-0.5 rounded-[4px]">
                  LIVE TELEMETRY
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Environmental Application Review & Decision Support • Case Intake, Forensic Validation & Review Queue
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[#CBD5E1] bg-[#0F2942] border border-[#1E3A8A] px-3 py-1.5 rounded-[6px]">
            <Activity size={13} className="text-[#C59B27]" />
            <span>QUEUE STATUS: ACTIVE</span>
          </div>
        </div>

        {/* Operational KPI Metric Strip (4 Stat Cards) */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Applications */}
          <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Total Applications
              </div>
              <div className="font-mono text-2xl font-bold text-[#0F172A] mt-1">
                {String(
                  analytics?.total_applications ?? applications.length
                ).padStart(2, "0")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] text-[#0A2540]">
              <FileText size={18} />
            </div>
          </div>

          {/* Card 2: Awaiting Review */}
          <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Pending Officer Review
              </div>
              <div className="font-mono text-2xl font-bold text-[#D97706] mt-1">
                {String(awaiting).padStart(2, "0")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#FDE68A] bg-[#FFFBEB] text-[#D97706]">
              <Clock size={18} />
            </div>
          </div>

          {/* Card 3: Suspicious / Risk Flagged */}
          <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Risk Flags & Discrepancies
              </div>
              <div className="font-mono text-2xl font-bold text-[#DC2626] mt-1">
                {String(suspiciousCount).padStart(2, "0")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#FCA5A5] bg-[#FEF2F2] text-[#DC2626]">
              <AlertTriangle size={18} />
            </div>
          </div>

          {/* Card 4: Finalized Decisions */}
          <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 flex items-center justify-between shadow-2xs">
            <div>
              <div className="text-xs font-semibold text-[#475569] uppercase tracking-wider">
                Completed Officer Decisions
              </div>
              <div className="font-mono text-2xl font-bold text-[#16A34A] mt-1">
                {String(decided).padStart(2, "0")}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[#86EFAC] bg-[#DCFCE7] text-[#16A34A]">
              <CheckCircle2 size={18} />
            </div>
          </div>
        </div>

        {/* Analytical Split Grid (2-Column Desktop View) */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Left Column (2 Cols): Intelligent Review Priority Queue */}
          <div className="lg:col-span-2 rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] overflow-hidden flex flex-col shadow-2xs">
            {/* Table Header Strip */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3 bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
                <h2 className="font-sans text-xs font-bold tracking-wider text-[#0A2540] uppercase">
                  Case Priority & Review Queue
                </h2>
              </div>
              <span className="font-mono text-[11px] text-[#475569]">
                CASES: {applications.length}
              </span>
            </div>

            {/* Table Panel Container with Internal Scroll (Fixed max-h-[440px]) */}
            <div className="max-h-[440px] overflow-y-auto">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-[#F8FAFC] font-sans text-[10px] font-bold text-[#475569] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Priority</th>
                    <th className="py-2.5 px-3">Applicant</th>
                    <th className="py-2.5 px-3">Project Title</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">AI Rec</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {applications.map((item) => {
                    const priority = getPriority(item);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className="group cursor-pointer transition-colors hover:bg-[#F8FAFC]"
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
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                          {item.applicant_name ?? "Pending Applicant"}
                        </td>

                        {/* Project Title */}
                        <td className="py-2.5 px-3 text-[#475569] max-w-[200px] truncate">
                          {item.project_title ?? "Untitled Project"}
                        </td>

                        {/* Status Code */}
                        <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-[#0F172A]">
                          <span className="rounded-[4px] border border-[#CBD5E1] bg-[#F1F5F9] px-2 py-0.5 uppercase">
                            {item.status.replaceAll("_", " ")}
                          </span>
                        </td>

                        {/* AI Recommendation */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#475569]">
                          {item.ai_recommendation?.replaceAll("_", " ") ?? "PENDING"}
                        </td>

                        {/* Action Inspect Button */}
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect(item.id);
                            }}
                            className="inline-flex items-center gap-1.5 font-sans text-[11px] font-bold text-[#0A2540] border border-[#CBD5E1] bg-[#FFFFFF] px-2.5 py-1 rounded-[4px] hover:bg-[#0A2540] hover:text-[#FFFFFF] hover:border-[#0A2540] focus:outline-none focus:ring-1 focus:ring-[#0A2540] transition-colors"
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
                        className="py-10 text-center font-mono text-xs text-[#64748B]"
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
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={14} className="text-[#DC2626]" />
                  <h3 className="font-sans text-xs font-bold text-[#0A2540] uppercase tracking-wider">
                    RISK AUDIT SUMMARY
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-[#DC2626] font-bold bg-[#FEF2F2] border border-[#FCA5A5] px-2 py-0.5 rounded">
                  {suspiciousCount} FLAGS
                </span>
              </div>

              <div className="space-y-2 font-sans text-xs">
                <div className="flex items-center justify-between rounded-[6px] border border-[#FCA5A5] bg-[#FEF2F2] p-2.5">
                  <span className="text-[#DC2626] font-bold">SUSPICIOUS APPLICATIONS</span>
                  <span className="font-mono font-bold text-[#DC2626]">{suspiciousCount}</span>
                </div>

                {analytics?.risk_distribution ? (
                  Object.entries(analytics.risk_distribution).map(([rk, count]) => (
                    <div
                      key={rk}
                      className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5 text-[11px]"
                    >
                      <span className="text-[#475569] uppercase font-medium">{rk.replaceAll("_", " ")}</span>
                      <span className="font-mono font-bold text-[#0F172A]">{count}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-[#64748B] italic py-1">
                    System scanning live telemetry...
                  </div>
                )}
              </div>
            </div>

            {/* Platform Processing Health Distribution */}
            <div className="rounded-[10px] border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 mb-3">
                <h3 className="font-sans text-xs font-bold text-[#0A2540] uppercase tracking-wider">
                  STATUS DISTRIBUTION
                </h3>
                <span className="font-mono text-[10px] text-[#15803D] bg-[#DCFCE7] border border-[#86EFAC] px-2 py-0.5 rounded font-bold">LIVE</span>
              </div>

              <div className="space-y-2 font-sans text-xs">
                {analytics?.applications_by_status ? (
                  Object.entries(analytics.applications_by_status).map(([st, count]) => (
                    <div
                      key={st}
                      className="flex items-center justify-between border-b border-[#E2E8F0] pb-1.5 text-[11px]"
                    >
                      <span className="text-[#475569] uppercase font-medium">{st.replaceAll("_", " ")}</span>
                      <span className="font-mono font-bold text-[#16A34A]">{count}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-[11px] text-[#64748B] italic py-1">
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
