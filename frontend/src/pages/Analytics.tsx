// Structural Idea: A zero-scroll governance analytics cockpit using telemetry category tabs (Operational Throughput, System & AI Engine, Reviewer Governance) to eliminate unnecessary scrolling.

import { useState } from "react";
import {
  Activity,
  BarChart3,
  BrainCircuit,
  Clock,
  FileText,
  ShieldAlert,
  Terminal,
  UserCheck,
} from "lucide-react";
import type { AnalyticsOverview } from "../types/api";

type TelemetryTab = "operational" | "engine" | "reviewer";

export function Analytics({
  analytics,
}: {
  analytics: AnalyticsOverview | null;
}) {
  const [activeTab, setActiveTab] = useState<TelemetryTab>("operational");
  const overview = analytics;

  return (
    <div className="relative flex flex-col gap-3 font-sans text-[#E8EDF1] max-w-[1400px] mx-auto pb-4">
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
            d="M 0,80 Q 250,40 500,110 T 1000,70 M 0,190 Q 300,150 600,220 T 1000,180 M 0,300 Q 200,270 500,330 T 1000,290"
            fill="none"
            stroke="#3DDC84"
            strokeWidth="1.5"
          />
          <path
            d="M 0,130 Q 350,170 700,110 T 1000,190 M 0,240 Q 200,280 500,230 T 1000,280 M 0,370 Q 450,400 800,350 T 1000,420"
            fill="none"
            stroke="#22303A"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Analytics Telemetry Header Strip */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84] shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase truncate">
                GOVERNANCE ANALYTICS & OPERATIONAL PERFORMANCE
              </h1>
              <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px] shrink-0">
                GOVERNANCE COCKPIT
              </span>
            </div>
            <p className="text-xs text-[#8B99A6] mt-0.5 truncate">
              Directorate of Env. & Climate Change • Throughput, risk distribution, rule failure & reviewer metrics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 rounded-[6px] text-[#3DDC84] shrink-0">
          <BarChart3 size={14} className="text-[#3DDC84]" />
          <span>REAL-TIME TELEMETRY ACTIVE</span>
        </div>
      </div>

      {/* Operational KPI Metric Strip (4 Stat Cards) */}
      <div className="relative z-10 shrink-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 font-mono">
        {/* Card 1: Total Applications */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
              TOTAL APPLICATIONS
            </div>
            <div className="text-lg font-bold text-[#E8EDF1] mt-0.5">
              {String(overview?.total_applications ?? 0).padStart(2, "0")}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#8B99A6]">
            <FileText size={15} />
          </div>
        </div>

        {/* Card 2: Avg Processing Hours */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
              AVG PROCESSING TIME
            </div>
            <div className="text-lg font-bold text-[#3DDC84] mt-0.5">
              {(overview?.average_processing_time_hours ?? 0).toFixed(1)}h
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#3DDC84]/30 bg-[#3DDC84]/10 text-[#3DDC84]">
            <Clock size={15} />
          </div>
        </div>

        {/* Card 3: Suspicious Count */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
              SUSPICIOUS FLAGGED
            </div>
            <div className="text-lg font-bold text-[#D9534F] mt-0.5">
              {String(overview?.suspicious_application_count ?? 0).padStart(2, "0")}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#D9534F]/30 bg-[#D9534F]/10 text-[#D9534F]">
            <ShieldAlert size={15} />
          </div>
        </div>

        {/* Card 4: Active Reviewer Roles */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-3 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
              ACTIVE REVIEWERS
            </div>
            <div className="text-lg font-bold text-[#E8EDF1] mt-0.5">
              {String(
                Object.keys(overview?.reviewer_workload ?? {}).length
              ).padStart(2, "0")}
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#8B99A6]">
            <UserCheck size={15} />
          </div>
        </div>
      </div>

      {/* Telemetry Category Navigation Tabs */}
      <div className="relative z-10 shrink-0 flex items-center gap-2 border-b border-[#22303A] pb-1 font-mono text-xs flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("operational")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border transition-colors uppercase font-bold ${
            activeTab === "operational"
              ? "border-[#3DDC84] bg-[#3DDC84]/10 text-[#3DDC84]"
              : "border-[#22303A] bg-[#131A21] text-[#8B99A6] hover:text-[#E8EDF1]"
          }`}
        >
          <Activity size={13} />
          <span>1. OPERATIONAL THROUGHPUT</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("engine")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border transition-colors uppercase font-bold ${
            activeTab === "engine"
              ? "border-[#3DDC84] bg-[#3DDC84]/10 text-[#3DDC84]"
              : "border-[#22303A] bg-[#131A21] text-[#8B99A6] hover:text-[#E8EDF1]"
          }`}
        >
          <BrainCircuit size={13} />
          <span>2. SYSTEM & AI ENGINE</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reviewer")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border transition-colors uppercase font-bold ${
            activeTab === "reviewer"
              ? "border-[#3DDC84] bg-[#3DDC84]/10 text-[#3DDC84]"
              : "border-[#22303A] bg-[#131A21] text-[#8B99A6] hover:text-[#E8EDF1]"
          }`}
        >
          <UserCheck size={13} />
          <span>3. REVIEWER GOVERNANCE</span>
        </button>
      </div>

      {/* Tabbed Viewport Panel */}
      <div className="relative z-10 rounded-[10px] border border-[#22303A] bg-[#131A21] p-3.5">
        {/* TAB 1: OPERATIONAL THROUGHPUT */}
        {activeTab === "operational" && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Distribution
              title="APPLICATIONS BY PROCESSING STATUS"
              data={overview?.applications_by_status ?? {}}
              accentTone="bg-[#3DDC84]"
            />
            <Distribution
              title="RISK DISTRIBUTION ANALYSIS"
              data={overview?.risk_distribution ?? {}}
              accentTone="bg-[#D9534F]"
            />
            <Distribution
              title="SCHEME-WISE APPLICATION COUNTS"
              data={overview?.scheme_statistics ?? {}}
              accentTone="bg-[#3DDC84]"
            />
            <Distribution
              title="DECISION DISTRIBUTION"
              data={overview?.decision_distribution ?? {}}
              accentTone="bg-[#3DDC84]"
            />
          </div>
        )}

        {/* TAB 2: SYSTEM & AI ENGINE */}
        {activeTab === "engine" && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Distribution
              title="DOCUMENT INGESTION STATISTICS"
              data={overview?.document_processing_statistics ?? {}}
              accentTone="bg-[#3DDC84]"
            />
            <Distribution
              title="OCR ENGINE USAGE"
              data={overview?.ocr_usage ?? {}}
              accentTone="bg-[#3DDC84]"
            />
            <Distribution
              title="LLM EXTRACTION USAGE"
              data={overview?.llm_usage ?? {}}
              accentTone="bg-[#3DDC84]"
            />
            <Distribution
              title="ROUTING STATUS DISTRIBUTION"
              data={overview?.routing_distribution ?? {}}
              accentTone="bg-[#3DDC84]"
            />
            <Distribution
              title="VALIDATION FAILURE FREQUENCY"
              data={overview?.validation_failure_frequency ?? {}}
              accentTone="bg-[#D9534F]"
              colSpan
            />
          </div>
        )}

        {/* TAB 3: REVIEWER GOVERNANCE */}
        {activeTab === "reviewer" && (
          <div className="grid gap-3 lg:grid-cols-12">
            {/* Reviewer Performance Table (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col space-y-2">
              <div className="font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
                HUMAN REVIEWER GOVERNANCE PERFORMANCE MATRIX
              </div>

              <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] overflow-hidden flex-1">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead className="border-b border-[#22303A] bg-[#131A21] text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Reviewer Role</th>
                      <th className="py-2 px-3">Decisions</th>
                      <th className="py-2 px-3">Clarifications</th>
                      <th className="py-2 px-3 text-right">Overrides</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22303A]">
                    {Object.entries(
                      overview?.reviewer_performance ?? {}
                    ).map(([reviewer, stats]) => (
                      <tr key={reviewer} className="hover:bg-[#131A21]/50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-[#E8EDF1] uppercase">
                          {reviewer}
                        </td>
                        <td className="py-2 px-3 font-bold text-[#3DDC84]">
                          {stats.decisions ?? 0}
                        </td>
                        <td className="py-2 px-3 font-bold text-[#E0A93D]">
                          {stats.request_clarification ?? 0}
                        </td>
                        <td className="py-2 px-3 font-bold text-[#D9534F] text-right">
                          {stats.overrides ?? 0}
                        </td>
                      </tr>
                    ))}
                    {!Object.keys(overview?.reviewer_performance ?? {}).length && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-xs text-[#8B99A6]">
                          NO REVIEWER PERFORMANCE TELEMETRY RECORDED YET
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reviewer Workload Distribution (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <Distribution
                title="REVIEWER WORKLOAD DISTRIBUTION"
                data={overview?.reviewer_workload ?? {}}
                accentTone="bg-[#3DDC84]"
              />
              <Distribution
                title="RULE FAILURE FREQUENCY"
                data={overview?.rule_failure_frequency ?? {}}
                accentTone="bg-[#E0A93D]"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Distribution({
  title,
  data,
  accentTone = "bg-[#3DDC84]",
  colSpan = false,
}: {
  title: string;
  data: Record<string, number>;
  accentTone?: string;
  colSpan?: boolean;
}) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div
      className={`rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-1.5 font-mono text-xs flex flex-col justify-between ${
        colSpan ? "lg:col-span-2" : ""
      }`}
    >
      <div className="font-bold text-[#E8EDF1] text-[10px] uppercase tracking-wider">
        {title}
      </div>

      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => {
          const widthPercent = Math.min(100, Math.max(5, (value / max) * 100));
          return (
            <div key={key} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#8B99A6] uppercase">{key.replaceAll("_", " ")}</span>
                <span className={`font-bold ${accentTone.includes("D9534F") ? "text-[#D9534F]" : accentTone.includes("E0A93D") ? "text-[#E0A93D]" : "text-[#3DDC84]"}`}>
                  {value}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-[3px] bg-[#131A21] border border-[#22303A] overflow-hidden p-[1px]">
                <div
                  className={`h-full rounded-[1px] transition-all duration-300 ${accentTone}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
        {!Object.keys(data).length && (
          <div className="text-[10px] text-[#8B99A6] italic py-1">
            No telemetry data recorded.
          </div>
        )}
      </div>
    </div>
  );
}
