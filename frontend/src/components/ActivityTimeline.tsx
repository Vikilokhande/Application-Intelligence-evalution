import { CheckCircle2, Clock, UserCheck, AlertTriangle, FileText, Activity } from "lucide-react";

export function ActivityTimeline({
  events
}: {
  events: Array<Record<string, unknown>>;
}) {
  if (!events.length) {
    return (
      <div className="text-xs text-[#64748B] italic p-4 text-center">
        No audit trail events recorded.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E2E8F0]">
      {events.map((evt, idx) => {
        const actionStr = String(evt.action || evt.event_type || "AUDIT_EVENT").toUpperCase();
        const isDecision = actionStr.includes("DECISION") || actionStr.includes("APPROVE");
        const isReject = actionStr.includes("REJECT") || actionStr.includes("FAIL");
        const isOverride = actionStr.includes("OVERRIDE");

        return (
          <div key={idx} className="relative flex items-start gap-4">
            {/* Timeline Node Badge */}
            <div
              className={`absolute -left-6 flex h-6 w-6 items-center justify-center rounded-full border bg-white text-xs font-bold ${
                isDecision
                  ? "border-emerald-500 text-emerald-700 bg-emerald-50"
                  : isReject
                    ? "border-rose-500 text-rose-700 bg-rose-50"
                    : isOverride
                      ? "border-amber-500 text-amber-700 bg-amber-50"
                      : "border-sky-500 text-sky-700 bg-sky-50"
              }`}
            >
              {isDecision ? (
                <CheckCircle2 size={13} />
              ) : isReject ? (
                <AlertTriangle size={13} />
              ) : isOverride ? (
                <UserCheck size={13} />
              ) : (
                <Activity size={13} />
              )}
            </div>

            {/* Event Content Card */}
            <div className="flex-1 rounded-xl border border-[#E2E8F0] bg-white p-3.5 shadow-sm space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-[#0F172A]">
                <span className="uppercase text-[11px] text-[#0F766E]">
                  {actionStr.replaceAll("_", " ")}
                </span>
                <span className="font-mono text-[10px] text-slate-500 font-normal">
                  {evt.timestamp ? new Date(String(evt.timestamp)).toLocaleString() : `Event #${idx + 1}`}
                </span>
              </div>
              <div className="text-[#334155] font-mono text-[11px] bg-[#F8FAFC] p-2 rounded border border-slate-100 break-words">
                {String(evt.details || evt.description || JSON.stringify(evt.event_payload || evt))}
              </div>
              {Boolean(evt.reviewer_id) && (
                <div className="text-[10px] text-[#64748B] font-semibold pt-1">
                  Actor: <span className="text-[#0F172A]">{String(evt.reviewer_id)}</span>
                </div>
              )}

            </div>
          </div>
        );
      })}
    </div>
  );
}
