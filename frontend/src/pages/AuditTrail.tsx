// AuditTrail.tsx — Readable audit event timeline.
// Palette: Deep Navy Blue (#0A243F), Dark Navy (#071A2B), Mustard Gold (#D5A51A), Warm Off-White (#F8F9FA), White (#FFFFFF), Slate Gray (#66717C).
import { History, User, CheckCircle2, FileText, Sparkles, ShieldCheck, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState, PageHeader } from "../components/ui";
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

function EventIcon({ action }: { action: string }) {
  const act = action.toUpperCase();
  if (act.includes("DECISION") || act.includes("APPROVED") || act.includes("REJECT")) {
    return <CheckCircle2 size={15} className="text-[#0A243F]" />;
  }
  if (act.includes("DOCUMENT") || act.includes("CREATED") || act.includes("SUBMITTED")) {
    return <FileText size={15} className="text-[#0A243F]" />;
  }
  if (act.includes("ASSESSMENT") || act.includes("AI")) {
    return <Sparkles size={15} className="text-[#D5A51A]" />;
  }
  if (act.includes("VALIDATION") || act.includes("RULE")) {
    return <ShieldCheck size={15} className="text-[#0A243F]" />;
  }
  return <Clock size={15} className="text-[#66717C]" />;
}

export function AuditTrail({ detail }: { detail: ApplicationDetail | null }) {
  const { t } = useTranslation();

  function humanAction(raw: string): string {
    const labels: Record<string, string> = {
      APPLICATION_CREATED:     t("audit.event_app_created", "Application Submitted"),
      APPLICATION_PROCESSING:  t("audit.event_proc_started", "Processing Started"),
      DOCUMENT_UPLOADED:       t("audit.event_doc_uploaded", "Document Uploaded"),
      DOCUMENT_PROCESSED:      t("audit.event_doc_processed", "Document Processed"),
      VALIDATION_COMPLETED:    t("audit.event_val_completed", "Validation Completed"),
      AI_ASSESSMENT_GENERATED: t("audit.event_ai_assessed", "AI Assessment Generated"),
      REVIEW_OPENED:           t("audit.event_review_opened", "Reviewer Opened Case"),
      DECISION_SUBMITTED:      t("audit.event_decision_recorded", "Decision Submitted"),
      STATUS_CHANGED:          t("audit.event_status_changed", "Status Updated"),
      FEEDBACK_SUBMITTED:      t("audit.event_feedback", "Reviewer Feedback Submitted"),
      RULE_EVALUATED:          t("audit.event_rules", "Rule Evaluated"),
    };
    return labels[raw] ?? raw.replaceAll("_", " ");
  }

  if (!detail) {
    return (
      <EmptyState
        icon={<History size={24} />}
        title={t("audit.empty_title", "No application selected")}
        description={t("audit.empty_desc", "Select an application from the Dashboard to view its audit history.")}
      />
    );
  }

  const events = detail.audit_trail ?? [];

  return (
    <div className="max-w-[900px] mx-auto space-y-6 animate-slide-up font-sans">
      <PageHeader
        title={t("audit.title", "Audit Trail & Compliance Log")}
        subtitle={`${t("audit.subtitle", "Chronological record of evaluation events")}: ${detail.project_title ?? ""}`}
        breadcrumb={t("nav.group_governance", "Governance")}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-1.5 text-xs font-semibold text-[#0A243F] shadow-2xs">
            <History size={13} className="text-[#D5A51A]" />
            {events.length} {t("audit.events_count", "Recorded Events")}
          </span>
        }
      />

      {events.length === 0 && (
        <EmptyState
          title={t("audit.empty_title", "No audit events yet")}
          description={t("audit.empty_desc", "Events are recorded as the application progresses through the review process.")}
        />
      )}

      {/* Timeline */}
      <div className="relative space-y-4 pl-8">
        {/* Vertical line */}
        <div className="absolute left-3.5 top-3 bottom-3 w-0.5 bg-[#E5E7EB]" aria-hidden />

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
              <div className="absolute -left-5 top-4 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#E5E7EB] bg-white shadow-2xs">
                <EventIcon action={action} />
              </div>

              <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs p-5 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#0A243F]">{humanAction(action)}</p>
                    {summary && (
                      <p className="text-xs text-[#66717C] mt-1 leading-relaxed">{summary}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-[#66717C]">{fmtDate(ts)}</p>
                    <div className="flex items-center gap-1 mt-1 justify-end">
                      <User size={11} className="text-[#66717C]" />
                      <p className="text-[11px] font-bold text-[#0A243F]">
                        {isSystemEvent ? t("audit.system_agent", "System") : actor}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

