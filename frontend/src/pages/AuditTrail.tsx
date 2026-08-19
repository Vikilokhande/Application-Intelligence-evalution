import { SectionPanel } from "../components/SectionPanel";
import type { ApplicationDetail } from "../types/api";

export function AuditTrail({ detail }: { detail: ApplicationDetail | null }) {
  if (!detail) {
    return <SectionPanel title="Audit Trail">Select or create an application.</SectionPanel>;
  }

  return (
    <SectionPanel title="Audit Trail">
      <div className="divide-y divide-line">
        {detail.audit_trail.map((event, index) => (
          <div className="grid gap-2 py-3 md:grid-cols-[220px_180px_1fr]" key={`${event.event_type}-${index}`}>
            <div className="font-semibold text-ink">{String(event.event_type).replaceAll("_", " ")}</div>
            <div className="text-sm text-slate-500">{new Date(String(event.created_at)).toLocaleString()}</div>
            <code className="text-xs text-slate-600">{JSON.stringify(event.event_payload)}</code>
          </div>
        ))}
        {!detail.audit_trail.length && <div className="py-4 text-sm text-slate-500">No audit events recorded.</div>}
      </div>
    </SectionPanel>
  );
}

