// AuditTrail.tsx — Readable audit event timeline.
// Primary: event / date / actor / summary. Technical payload in expandable section.
import { History, User } from "lucide-react";
import { EmptyState, PageHeader, TechnicalDetails } from "../components/ui";
import type { ApplicationDetail } from "../types/api";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function humanAction(raw: string): string {
  const labels: Record<string, string> = {
    APPLICATION_CREATED:     "Application Submitted",
    APPLICATION_PROCESSING:  "Processing Started",
    DOCUMENT_UPLOADED:       "Document Uploaded",
    DOCUMENT_PROCESSED:      "Document Processed",
    VALIDATION_COMPLETED:    "Validation Completed",
    AI_ASSESSMENT_GENERATED: "AI Assessment Generated",
    REVIEW_OPENED:           "Reviewer Opened Case",
    DECISION_SUBMITTED:      "Decision Submitted",
    STATUS_CHANGED:          "Status Updated",
    FEEDBACK_SUBMITTED:      "Reviewer Feedback Submitted",
    RULE_EVALUATED:          "Rule Evaluated",
  };
  return labels[raw] ?? raw.replaceAll("_", " ");
}

function eventIcon(action: string): string {
  if (action.includes("DECISION") || action.includes("APPROVED") || action.includes("REJECT")) return "✓";
  if (action.includes("CREATED") || action.includes("SUBMITTED")) return "📋";
  if (action.includes("DOCUMENT")) return "📄";
  if (action.includes("VALIDATION") || action.includes("RULE")) return "🔍";
  if (action.includes("ASSESSMENT") || action.includes("AI")) return "🤖";
  if (action.includes("REVIEW") || action.includes("OPENED")) return "👤";
  return "●";
}

export function AuditTrail({ detail }: { detail: ApplicationDetail | null }) {
  if (!detail) {
    return (
      <EmptyState
        icon={<History size={24} />}
        title="No application selected"
        description="Select an application from the Dashboard to view its audit history."
      />
    );
  }

  const events = detail.audit_trail ?? [];

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <PageHeader
        title="Audit Log"
        subtitle={`Event history for: ${detail.project_title ?? "Selected application"}`}
        breadcrumb="Governance"
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">
            <History size={13} />
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        }
      />

      {events.length === 0 && (
        <EmptyState
          title="No audit events yet"
          description="Events are recorded as the application progresses through the review process."
        />
      )}

      {/* Timeline */}
      <div className="relative space-y-4 pl-8">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-slate-200" aria-hidden />

        {events.map((rawEvent, i) => {
          const event  = rawEvent as Record<string, unknown>;
          const action = (event.action ?? event.event_type ?? event.type ?? "Event") as string;
          const actor  = (event.actor_id ?? event.actor ?? event.reviewer_id ?? "System") as string;
          const ts     = (event.timestamp ?? event.created_at ?? event.occurred_at) as string | undefined;
          const summary= (event.summary ?? event.description ?? event.comments ?? "") as string;
          const isSystemEvent = !String(actor).includes("@") && String(actor).length < 20;

          return (
            <div key={i} className="relative">
              {/* Dot */}
              <div className="absolute -left-5 top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-sm">
                {eventIcon(action)}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{humanAction(action)}</p>
                    {summary && (
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{summary}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">{fmtDate(ts)}</p>
                    <div className="flex items-center gap-1 mt-0.5 justify-end">
                      <User size={10} className="text-slate-300" />
                      <p className="text-[11px] text-slate-400">
                        {isSystemEvent ? "AI System" : actor}
                      </p>
                    </div>
                  </div>
                </div>

                <TechnicalDetails label="View event details">
                  <pre className="text-[10px] text-slate-500 whitespace-pre-wrap break-all leading-relaxed">
                    {JSON.stringify(event, null, 2)}
                  </pre>
                </TechnicalDetails>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
