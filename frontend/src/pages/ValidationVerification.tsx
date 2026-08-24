import { useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { EmptyState, FindingCard, PageHeader, SummaryCard } from "../components/ui";
import type { ApplicationDetail, ValidationResult } from "../types/api";

function humanLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());
}

const FIELD_TYPES = [
  "REQUIRED_FIELD",
  "DATA_RANGE",
  "BUSINESS_RULE_PRECHECK",
  "FIELD_VALIDATION",
  "DATA_TYPE",
];

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.map(formatValue).join(", ") : "None";
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${k.replaceAll("_", " ")}: ${formatValue(v)}`)
      .join("; ") || "Unavailable";
  }
  if (value == null || value === "") return "Unavailable";
  return String(value);
}

function evidenceOf(v: ValidationResult) {
  return (v.evidence ?? {}) as Record<string, unknown>;
}

function getFieldName(v: ValidationResult): string {
  const ev = evidenceOf(v);
  return String(ev.field_name ?? ev.field ?? ev.applied_field ?? v.validation_type);
}

function getExpected(v: ValidationResult): string {
  const ev = evidenceOf(v);
  const expected = ev.expected as Record<string, unknown> | undefined;
  if (ev.expected_value != null) return formatValue(ev.expected_value);
  if (expected?.max != null) return `<= ${formatValue(expected.max)}`;
  if (expected?.min != null) return `>= ${formatValue(expected.min)}`;
  if (expected?.allowed_values != null) return `One of: ${formatValue(expected.allowed_values)}`;
  if (expected?.required_documents != null) return formatValue(expected.required_documents);
  if (expected?.minimum_distinct_documents != null) return `${formatValue(expected.minimum_distinct_documents)} documents`;
  if (expected?.required === true) return "Required";
  return "Unavailable";
}

function getActual(v: ValidationResult): string {
  const ev = evidenceOf(v);
  const actual = ev.actual as Record<string, unknown> | undefined;
  return formatValue(ev.actual_value ?? ev.extracted_value ?? actual?.value ?? actual?.document_values);
}

function getSource(v: ValidationResult): string {
  const ev = evidenceOf(v);
  return formatValue(
    ev.evidence_source ??
      ev.knowledge_base_document ??
      ev.retrieved_source ??
      ev.document_id ??
      ev.source_type
  );
}

function getConfidence(v: ValidationResult): string {
  const raw = evidenceOf(v).confidence;
  return typeof raw === "number" ? `${Math.round(raw * 100)}%` : "Unavailable";
}

export function ValidationVerification({ detail }: { detail: ApplicationDetail | null }) {
  const [showAll, setShowAll] = useState(false);

  if (!detail) {
    return (
      <EmptyState
        icon={<ShieldCheck size={24} />}
        title="No application selected"
        description="Select an application from the Dashboard to view validation checks."
      />
    );
  }

  const all = detail.validation_results ?? [];
  const passes = all.filter(v => v.status === "PASS");
  const warnings = all.filter(v => v.status === "WARN" || v.status === "NOT_VERIFIABLE");
  const fails = all.filter(v => v.status === "FAIL");
  const skipped = all.filter(v => v.status === "NOT_CHECKED");
  const importantFindings = [...fails, ...warnings].slice(0, 10);
  const fieldResults = all.filter(v => FIELD_TYPES.some(t => v.validation_type.startsWith(t)));

  return (
    <div className="max-w-[1000px] mx-auto space-y-6">
      <PageHeader
        title="Validation Results"
        subtitle={`Automated validation for: ${detail.project_title ?? "Selected application"}`}
        breadcrumb="Case Review"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCount icon={<CheckCircle2 size={18} className="text-emerald-600" />} label="Passed" count={passes.length} colorClass="border-emerald-200 bg-emerald-50 text-emerald-800" />
        <SummaryCount icon={<AlertTriangle size={18} className="text-amber-500" />} label="Need Verification" count={warnings.length} colorClass="border-amber-200 bg-amber-50 text-amber-800" />
        <SummaryCount icon={<XCircle size={18} className="text-rose-500" />} label="Failed" count={fails.length} colorClass="border-rose-200 bg-rose-50 text-rose-800" />
        <SummaryCount icon={<HelpCircle size={18} className="text-slate-400" />} label="Not Checked" count={skipped.length} colorClass="border-slate-200 bg-slate-50 text-slate-500" />
      </div>

      {importantFindings.length > 0 && (
        <SummaryCard title="Important Findings">
          <div className="space-y-2">
            {importantFindings.map((v, i) => (
              <FindingCard key={i} status={v.status} title={humanLabel(v.validation_type)} message={v.message} />
            ))}
          </div>
        </SummaryCard>
      )}

      {fieldResults.length > 0 && (
        <SummaryCard title="Field Verification" noPad>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Field</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Actual</th>
                <th className="text-left px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide hidden md:table-cell">Expected</th>
                <th className="text-center px-4 py-2.5 text-xs font-bold text-slate-500 uppercase tracking-wide">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {fieldResults.map((v, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-sm font-medium text-slate-800">{humanLabel(getFieldName(v))}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 hidden sm:table-cell">{getActual(v)}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 hidden md:table-cell">{getExpected(v)}</td>
                  <td className="px-4 py-3 text-center"><ResultPill status={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </SummaryCard>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-slate-400" />
            <span>All Validation Checks ({all.length})</span>
          </div>
          {showAll ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        </button>

        {showAll && (
          <div className="border-t border-slate-100 p-4 space-y-2">
            {all.map((v, i) => (
              <div key={i} className="space-y-1">
                <FindingCard status={v.status} title={humanLabel(v.validation_type)} message={v.message} />
                <CheckEvidenceSummary validation={v} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckEvidenceSummary({ validation }: { validation: ValidationResult }) {
  return (
    <div className="grid gap-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
      <EvidenceDatum label="Actual" value={getActual(validation)} />
      <EvidenceDatum label="Expected" value={getExpected(validation)} />
      <EvidenceDatum label="Evidence" value={getSource(validation)} />
      <EvidenceDatum label="Confidence" value={getConfidence(validation)} />
    </div>
  );
}

function EvidenceDatum({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="break-words text-slate-700">{value}</p>
    </div>
  );
}

function SummaryCount({ icon, label, count, colorClass }: { icon: ReactNode; label: string; count: number; colorClass: string }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col items-center text-center gap-2 ${colorClass}`}>
      {icon}
      <span className="text-2xl font-bold">{count}</span>
      <span className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</span>
    </div>
  );
}

function ResultPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PASS: { label: "Pass", cls: "bg-emerald-100 text-emerald-700" },
    FAIL: { label: "Fail", cls: "bg-rose-100 text-rose-700" },
    WARN: { label: "Attention", cls: "bg-amber-100 text-amber-700" },
    NOT_VERIFIABLE: { label: "Unverifiable", cls: "bg-amber-100 text-amber-700" },
    NOT_CHECKED: { label: "Skipped", cls: "bg-slate-100 text-slate-500" },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
