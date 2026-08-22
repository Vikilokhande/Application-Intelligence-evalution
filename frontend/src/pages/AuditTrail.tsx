// Structural Idea: A forensic case audit ledger presenting an immutable, timestamped investigation timeline with control room event node indicators.

import { ShieldCheck, Terminal } from "lucide-react";
import { ActivityTimeline } from "../components/ActivityTimeline";
import type { ApplicationDetail } from "../types/api";

export function AuditTrail({ detail }: { detail: ApplicationDetail | null }) {
  if (!detail) {
    return (
      <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-8 text-center font-mono text-xs text-[#8B99A6]">
        NO CASE SELECTED. SELECT AN APPLICATION FROM THE{" "}
        <span className="text-[#3DDC84]">DASHBOARD</span> TO INSPECT THE AUDIT LOG.
      </div>
    );
  }

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

      {/* Audit Telemetry Header Strip */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84] shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase truncate">
                CASE DECISION IMMUTABLE AUDIT LOG
              </h1>
              <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px] shrink-0">
                IMMUTABLE LEDGER
              </span>
            </div>
            <p className="text-xs text-[#8B99A6] mt-0.5 truncate">
              Audit trail for:{" "}
              <strong className="text-[#E8EDF1]">
                {detail.project_title ?? "Selected Case"}
              </strong>{" "}
              • Every human decision and AI inference is permanently logged
            </p>
          </div>
        </div>

        <div className="font-mono text-xs border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 rounded-[6px] text-[#3DDC84] uppercase">
          STATUS: {detail.status.replaceAll("_", " ")}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 rounded-[10px] border border-[#22303A] bg-[#131A21] p-4 flex flex-col">
        <div className="flex items-center justify-between border-b border-[#22303A] pb-2.5 mb-3 shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
            <ShieldCheck size={14} className="text-[#3DDC84]" />
            <span>VISUAL INVESTIGATION TIMELINE</span>
          </div>
          <span className="font-mono text-[10px] text-[#3DDC84]">
            {detail.audit_trail.length} EVENT(S) TRACEABLE
          </span>
        </div>

        {/* Scrollable Timeline Container */}
        <div className="overflow-y-auto max-h-[550px] p-1"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(61,220,132,0.4) #22303A" }}
        >
          <ActivityTimeline events={detail.audit_trail} />
        </div>
      </div>
    </div>
  );
}
