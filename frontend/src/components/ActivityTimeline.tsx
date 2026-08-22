// Structural Idea: An immutable forensic audit timeline rendering each event type as a human-friendly summary card with key facts as pill badges, raw JSON hidden behind an optional toggle.

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  FileText,
  Layers,
  PauseCircle,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
  Zap,
} from "lucide-react";

type AuditEvent = Record<string, unknown>;

// ─── Helpers ────────────────────────────────────────────────────────────────

function Badge({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: "green" | "red" | "amber" | "neutral";
}) {
  const colors = {
    green: "text-[#3DDC84] bg-[#3DDC84]/10 border-[#3DDC84]/30",
    red: "text-[#D9534F] bg-[#D9534F]/10 border-[#D9534F]/30",
    amber: "text-[#E0A93D] bg-[#E0A93D]/10 border-[#E0A93D]/30",
    neutral: "text-[#8B99A6] bg-[#131A21] border-[#22303A]",
  };
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${colors[tone]}`}>
      <span className="text-[#8B99A6] font-normal">{label}:</span> {value}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-start gap-2 text-[10px]">
      <span className="font-mono text-[#8B99A6] shrink-0 uppercase">{label}:</span>
      <span className="font-mono text-[#E8EDF1] font-semibold">{value}</span>
    </div>
  );
}

// ─── Per-Event-Type Human Renderers ─────────────────────────────────────────

function renderEventBody(action: string, payload: AuditEvent): React.ReactNode {
  const p = payload;

  // DECISION SUBMITTED
  if (action.includes("DECISION_SUBMITTED") || action.includes("DECISION SUBMITTED")) {
    const decision = String(p.decision ?? "").toUpperCase();
    const override = Boolean(p.override);
    const prev = String(p.previous_recommendation ?? "").replaceAll("_", " ");
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge label="DECISION" value={decision} tone={decision === "APPROVE" ? "green" : decision === "REJECT" ? "red" : "amber"} />
          <Badge label="AI OVERRIDE" value={override ? "YES" : "NO"} tone={override ? "amber" : "neutral"} />
          {prev && <Badge label="PREV AI REC" value={prev} tone="neutral" />}
        </div>
        {override && (
          <div className="text-[10px] text-[#E0A93D] font-mono">
            Human reviewer overrode the AI recommendation and submitted a final decision.
          </div>
        )}
      </div>
    );
  }

  // AI OVERRIDDEN
  if (action.includes("AI_OVERRIDDEN") || action.includes("AI OVERRIDDEN")) {
    const reason = String(p.reason ?? "No reason recorded");
    return (
      <div className="space-y-1">
        <InfoRow label="OVERRIDE REASON" value={reason} />
      </div>
    );
  }

  // REVIEWER OPENED CASE / REVIEWER ASSIGNED
  if (action.includes("REVIEWER_ASSIGNED") || action.includes("REVIEWER ASSIGNED")) {
    const rec = String(p.recommendation ?? "").replaceAll("_", " ");
    const role = String(p.reviewer_role ?? "").replaceAll("_", " ").toUpperCase();
    const reason = String(p.reason ?? "");
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {role && <Badge label="ROLE" value={role} tone="neutral" />}
          {rec && <Badge label="RECOMMENDATION" value={rec} tone="amber" />}
          {p.risk_score != null && <Badge label="RISK SCORE" value={String(p.risk_score)} tone={Number(p.risk_score) > 50 ? "red" : "green"} />}
        </div>
        {reason && <InfoRow label="REASON" value={reason} />}
      </div>
    );
  }

  // WORKFLOW PAUSED FOR HUMAN REVIEW
  if (action.includes("WORKFLOW_PAUSED") || action.includes("WORKFLOW PAUSED")) {
    const rec = String(p.recommendation ?? "").replaceAll("_", " ");
    const role = String(p.reviewer_role ?? "").replaceAll("_", " ").toUpperCase();
    return (
      <div className="flex flex-wrap gap-2">
        <Badge label="STATUS" value="AWAITING HUMAN DECISION" tone="amber" />
        {role && <Badge label="ASSIGNED ROLE" value={role} tone="neutral" />}
        {rec && <Badge label="AI SUGGESTION" value={rec} tone="amber" />}
      </div>
    );
  }

  // EXTRACTION COMPLETED
  if (action.includes("EXTRACTION_COMPLETED") || action.includes("EXTRACTION COMPLETED")) {
    const docType = String(p.document_type ?? "UNKNOWN").replaceAll("_", " ");
    const conf = p.confidence != null ? `${Math.round(Number(p.confidence) * 100)}%` : "N/A";
    const method = String(p.extraction_method ?? "").replaceAll("_", " ");
    const parser = String(p.parser ?? "");
    const fields = Array.isArray(p.fields_extracted) ? p.fields_extracted.length : 0;
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge label="DOC TYPE" value={docType} tone="neutral" />
          <Badge label="CONFIDENCE" value={conf} tone={Number(p.confidence) > 0.7 ? "green" : "amber"} />
          <Badge label="FIELDS EXTRACTED" value={String(fields)} tone={fields > 0 ? "green" : "amber"} />
        </div>
        {method && <InfoRow label="METHOD" value={method} />}
        {parser && <InfoRow label="PARSER" value={parser} />}
      </div>
    );
  }

  // NORMALIZATION COMPLETED
  if (action.includes("NORMALIZATION_COMPLETED") || action.includes("NORMALIZATION COMPLETED")) {
    const conf = p.extraction_confidence != null ? `${Math.round(Number(p.extraction_confidence) * 100)}%` : "N/A";
    return (
      <div className="flex flex-wrap gap-2">
        <Badge label="NORMALIZATION CONFIDENCE" value={conf} tone={Number(p.extraction_confidence) > 0.7 ? "green" : "amber"} />
      </div>
    );
  }

  // VALIDATION RULE FAILED
  if (action.includes("VALIDATION_RULE_FAILED") || action.includes("VALIDATION RULE FAILED")) {
    const checkId = String(p.check_id ?? "").replaceAll("_", " ");
    const validator = String(p.validator ?? "").toUpperCase();
    const severity = String(p.severity ?? "ERROR").toUpperCase();
    return (
      <div className="flex flex-wrap gap-2">
        {checkId && <Badge label="RULE" value={checkId} tone="red" />}
        {validator && <Badge label="VALIDATOR" value={validator} tone="neutral" />}
        <Badge label="SEVERITY" value={severity} tone="red" />
      </div>
    );
  }

  // VALIDATION COMPLETED
  if (action.includes("VALIDATION_COMPLETED") || action.includes("VALIDATION COMPLETED")) {
    const summary = (p.summary as Record<string, unknown>) ?? {};
    const passed = Number(summary.passed ?? 0);
    const failed = Number(summary.failed ?? 0);
    const total = Number(summary.total_checks ?? 0);
    const conf = summary.validation_confidence != null ? `${Math.round(Number(summary.validation_confidence) * 100)}%` : "N/A";
    const status = String(summary.overall_status ?? "").toUpperCase();
    const durationMs = Number(p.duration_ms ?? 0);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge label="RESULT" value={status} tone={status === "PASS" ? "green" : "red"} />
          <Badge label="PASSED" value={`${passed}/${total}`} tone="green" />
          <Badge label="FAILED" value={String(failed)} tone={failed > 0 ? "red" : "green"} />
          <Badge label="CONFIDENCE" value={conf} tone="neutral" />
          {durationMs > 0 && <Badge label="DURATION" value={`${durationMs}ms`} tone="neutral" />}
        </div>
      </div>
    );
  }

  // RULE EXECUTED
  if (action.includes("RULE_EXECUTED") || action.includes("RULE EXECUTED")) {
    const rules = Number(p.rules ?? 0);
    const passed = Number(p.passed ?? 0);
    const failures = Number(p.failures ?? 0);
    return (
      <div className="flex flex-wrap gap-2">
        <Badge label="TOTAL RULES" value={String(rules)} tone="neutral" />
        <Badge label="PASSED" value={String(passed)} tone="green" />
        <Badge label="FAILED" value={String(failures)} tone={failures > 0 ? "red" : "green"} />
      </div>
    );
  }

  // FEATURES GENERATED
  if (action.includes("FEATURES_GENERATED") || action.includes("FEATURES GENERATED")) {
    const count = Number(p.feature_count ?? 0);
    const cost = p.project_cost != null ? `₹${Number(p.project_cost).toLocaleString("en-IN")}` : "N/A";
    const duration = p.project_duration != null ? `${p.project_duration} Months` : "N/A";
    const ragConf = p.rag_retrieval_confidence != null ? `${Math.round(Number(p.rag_retrieval_confidence) * 100)}%` : "N/A";
    const ragFails = Number(p.rag_validation_fail_count ?? 0);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge label="FEATURES" value={String(count)} tone="neutral" />
          <Badge label="PROJECT COST" value={cost} tone="neutral" />
          <Badge label="DURATION" value={duration} tone="neutral" />
          <Badge label="RAG CONFIDENCE" value={ragConf} tone="green" />
          {ragFails > 0 && <Badge label="RAG FAILURES" value={String(ragFails)} tone="red" />}
        </div>
      </div>
    );
  }

  // ML SCORE GENERATED
  if (action.includes("ML_SCORE_GENERATED") || action.includes("ML SCORE GENERATED")) {
    const predClass = String(p.prediction_class ?? "UNAVAILABLE").toUpperCase();
    const isUnavail = predClass === "UNAVAILABLE";
    const modelName = String(p.model_name ?? "").replace("unavailable", "Baseline Rule Engine");
    const quality = p.quality_score != null ? String(p.quality_score) : "N/A (Baseline)";
    const risk = p.risk_score != null ? String(p.risk_score) : "N/A (Baseline)";
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge label="MODEL" value={modelName} tone={isUnavail ? "amber" : "green"} />
          <Badge label="PREDICTION" value={predClass} tone={isUnavail ? "amber" : "green"} />
          <Badge label="QUALITY" value={quality} tone="neutral" />
          <Badge label="RISK" value={risk} tone="neutral" />
        </div>
        {isUnavail && (
          <div className="text-[10px] text-[#E0A93D] font-mono">
            No trained ML model loaded. Deterministic baseline scoring applied for governance continuity.
          </div>
        )}
      </div>
    );
  }

  // LLM RECOMMENDATION
  if (action.includes("LLM_RECOMMENDATION") || action.includes("LLM RECOMMENDATION")) {
    const status = String(p.status ?? "").replaceAll("_", " ").toUpperCase();
    const provider = String(p.provider ?? "").toUpperCase();
    const failed = status.includes("FAIL");
    return (
      <div className="flex flex-wrap gap-2">
        <Badge label="STATUS" value={status} tone={failed ? "amber" : "green"} />
        {provider && <Badge label="PROVIDER" value={provider} tone="neutral" />}
        {failed && (
          <span className="text-[10px] text-[#E0A93D] font-mono self-center">LLM unavailable — rule-based fallback active</span>
        )}
      </div>
    );
  }

  // EXPLANATION GENERATED
  if (action.includes("EXPLANATION_GENERATED") || action.includes("EXPLANATION GENERATED")) {
    const failedRules = Array.isArray(p.failed_rules) ? p.failed_rules as string[] : [];
    const policyEvidence = Number(p.policy_evidence_count ?? 0);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge label="POLICY EVIDENCE" value={String(policyEvidence)} tone="neutral" />
          <Badge label="FAILED RULES" value={String(failedRules.length)} tone={failedRules.length > 0 ? "red" : "green"} />
        </div>
        {failedRules.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {failedRules.map((r, i) => (
              <span key={i} className="font-mono text-[9px] text-[#D9534F] bg-[#D9534F]/10 border border-[#D9534F]/30 px-1.5 py-0.5 rounded uppercase">
                {String(r).replaceAll("_", " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // DOCUMENT UPLOADED
  if (action.includes("DOCUMENT_UPLOADED") || action.includes("DOCUMENT UPLOADED")) {
    const filename = String(p.filename ?? "Unknown File");
    const checksum = String(p.checksum ?? "").slice(0, 12);
    return (
      <div className="flex flex-wrap gap-2">
        <Badge label="FILE" value={filename} tone="green" />
        {checksum && <Badge label="CHECKSUM" value={`${checksum}...`} tone="neutral" />}
      </div>
    );
  }

  // APPLICATION CREATED
  if (action.includes("APPLICATION_CREATED") || action.includes("APPLICATION CREATED")) {
    const schemeId = String(p.scheme_id ?? "").slice(0, 12);
    return (
      <div className="flex flex-wrap gap-2">
        <Badge label="STATUS" value="CASE CREATED" tone="green" />
        {schemeId && <Badge label="SCHEME REF" value={`${schemeId}...`} tone="neutral" />}
      </div>
    );
  }

  // Empty payload or simple events
  const keys = Object.keys(p).filter((k) => k !== "stage" && k !== "version");
  if (keys.length === 0) {
    return <span className="text-[10px] text-[#8B99A6] font-mono italic">Event recorded — no additional payload</span>;
  }

  // Fallback: render first 4 key-value pairs cleanly
  return (
    <div className="flex flex-wrap gap-2">
      {keys.slice(0, 4).map((k) => (
        <Badge key={k} label={k.replaceAll("_", " ").toUpperCase()} value={String(p[k])} tone="neutral" />
      ))}
    </div>
  );
}

// ─── Node icon & color per event type ────────────────────────────────────────

function nodeStyle(action: string): { icon: React.ReactNode; border: string; text: string } {
  if (action.includes("DECISION") || action.includes("APPROVE"))
    return { icon: <CheckCircle2 size={12} />, border: "border-[#3DDC84]", text: "text-[#3DDC84]" };
  if (action.includes("REJECT") || action.includes("FAIL") || action.includes("RULE_FAILED") || action.includes("RULE FAILED"))
    return { icon: <AlertTriangle size={12} />, border: "border-[#D9534F]", text: "text-[#D9534F]" };
  if (action.includes("OVERRIDE"))
    return { icon: <UserCheck size={12} />, border: "border-[#E0A93D]", text: "text-[#E0A93D]" };
  if (action.includes("PAUSED") || action.includes("PAUSED"))
    return { icon: <PauseCircle size={12} />, border: "border-[#E0A93D]", text: "text-[#E0A93D]" };
  if (action.includes("ML_SCORE") || action.includes("ML SCORE") || action.includes("EXPLANATION"))
    return { icon: <BrainCircuit size={12} />, border: "border-[#8B99A6]", text: "text-[#8B99A6]" };
  if (action.includes("VALIDATION"))
    return { icon: <ShieldAlert size={12} />, border: "border-[#8B99A6]", text: "text-[#8B99A6]" };
  if (action.includes("RULE"))
    return { icon: <ShieldCheck size={12} />, border: "border-[#8B99A6]", text: "text-[#8B99A6]" };
  if (action.includes("EXTRACTION") || action.includes("DOCUMENT"))
    return { icon: <FileText size={12} />, border: "border-[#8B99A6]", text: "text-[#8B99A6]" };
  if (action.includes("FEATURES") || action.includes("NORMALIZATION"))
    return { icon: <Layers size={12} />, border: "border-[#8B99A6]", text: "text-[#8B99A6]" };
  if (action.includes("PROCESSING") || action.includes("INGEST"))
    return { icon: <Zap size={12} />, border: "border-[#8B99A6]", text: "text-[#8B99A6]" };
  if (action.includes("UPLOADED") || action.includes("CREATED"))
    return { icon: <Upload size={12} />, border: "border-[#3DDC84]", text: "text-[#3DDC84]" };
  return { icon: <Activity size={12} />, border: "border-[#8B99A6]", text: "text-[#8B99A6]" };
}

// ─── Single Event Card ────────────────────────────────────────────────────────

function EventCard({ evt, idx }: { evt: AuditEvent; idx: number }) {
  const [showRaw, setShowRaw] = useState(false);

  const actionStr = String(evt.action || evt.event_type || "AUDIT_EVENT").toUpperCase();
  const { icon, border, text } = nodeStyle(actionStr);

  // Extract payload — prefer event_payload, fall back to stripping meta keys
  const metaKeys = new Set(["action", "event_type", "timestamp", "reviewer_id", "id"]);
  const payload: AuditEvent =
    evt.event_payload && typeof evt.event_payload === "object"
      ? (evt.event_payload as AuditEvent)
      : Object.fromEntries(Object.entries(evt).filter(([k]) => !metaKeys.has(k)));

  const label = actionStr.replaceAll("_", " ");

  return (
    <div className="relative flex items-start gap-4">
      {/* Timeline Node */}
      <div
        className={`absolute -left-6 flex h-5 w-5 items-center justify-center rounded-full border bg-[#0B0F14] ${border} ${text}`}
      >
        {icon}
      </div>

      {/* Card */}
      <div className="flex-1 rounded-[6px] border border-[#22303A] bg-[#0B0F14] font-mono text-xs overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#22303A]">
          <span className={`text-[11px] font-bold uppercase ${text}`}>{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#8B99A6] font-normal">
              {evt.timestamp
                ? new Date(String(evt.timestamp)).toLocaleString()
                : `EVENT #${idx + 1}`}
            </span>
            {Boolean(evt.reviewer_id) && (
              <span className="text-[9px] text-[#3DDC84] border border-[#3DDC84]/30 bg-[#3DDC84]/10 px-1.5 py-0.5 rounded uppercase">
                {String(evt.reviewer_id)}
              </span>
            )}
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="flex items-center gap-1 text-[9px] text-[#8B99A6] border border-[#22303A] bg-[#131A21] hover:border-[#8B99A6] hover:text-[#E8EDF1] px-1.5 py-0.5 rounded transition-colors uppercase"
              title="Toggle raw JSON"
            >
              <Code2 size={10} />
              {showRaw ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              RAW
            </button>
          </div>
        </div>

        {/* Human-Friendly Body */}
        <div className="px-3 py-2.5">
          {renderEventBody(actionStr, payload)}
        </div>

        {/* Optional Raw JSON Viewer */}
        {showRaw && (
          <div className="border-t border-[#22303A] bg-[#131A21] px-3 py-2">
            <pre className="text-[#8B99A6] text-[10px] whitespace-pre-wrap break-all leading-relaxed">
              {JSON.stringify(payload, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export function ActivityTimeline({
  events,
}: {
  events: Array<Record<string, unknown>>;
}) {
  if (!events.length) {
    return (
      <div className="py-6 text-center font-mono text-xs text-[#8B99A6]">
        NO AUDIT TRAIL EVENTS RECORDED FOR THIS CASE
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-3 font-sans text-xs before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#22303A]">
      {events.map((evt, idx) => (
        <EventCard key={idx} evt={evt} idx={idx} />
      ))}
    </div>
  );
}
