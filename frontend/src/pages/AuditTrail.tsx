import { ScrollText, ShieldCheck } from "lucide-react";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { ApplicationDetail } from "../types/api";

export function AuditTrail({ detail }: { detail: ApplicationDetail | null }) {
  if (!detail) {
    return (
      <SectionPanel title="Governance Audit Trail">
        <div className="p-8 text-center text-sm text-[#64748B]">
          No application selected. Select an application from the <span className="font-bold text-[#0F766E]">Dashboard</span> to inspect the audit log.
        </div>
      </SectionPanel>
    );
  }

  return (
    <div className="space-y-6">
      {/* Audit Banner */}
      <div className="panel border-l-4 border-l-[#0F766E] bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                Case Decision Audit Log
              </h1>
              <span className="human-boundary-badge">✓ Tamper-Traceable Log</span>
            </div>
            <p className="mt-1 text-xs text-[#475569]">
              Audit trail for <strong className="text-[#0F172A]">{detail.project_title ?? "Selected Case"}</strong> • Every human decision and AI inference is immutable and recorded.
            </p>
          </div>
          <StatusBadge value={detail.status} />
        </div>
      </div>

      {/* Audit Timeline Section */}
      <SectionPanel
        title="Visual Investigation Timeline"
        action={
          <span className="text-xs font-semibold text-[#0F766E] flex items-center gap-1.5">
            <ShieldCheck size={14} /> {detail.audit_trail.length} Event(s) Traceable
          </span>
        }
      >
        <ActivityTimeline events={detail.audit_trail} />
      </SectionPanel>
    </div>
  );
}
