// ValidationVerification.tsx — Validation & Verification Results.
// Color Palette: Deep Navy Blue (#0A243F), Dark Navy (#071A2B), Mustard Gold (#D5A51A), Warm Off-White (#F8F9FA), White (#FFFFFF), Slate Gray (#66717C).
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
  FileCheck,
  Layers,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState, PageHeader } from "../components/ui";
import type { ApplicationDetail, ValidationResult } from "../types/api";

const HUMAN_FIELD_MAP: Record<string, string> = {
  REQUIRED_FIELD: "Mandatory Field Verification",
  COMPLETENESS: "Data Completeness Check",
  BUSINESS_RULE_PRECHECK: "Scheme Rule Pre-Check",
  CROSS_DOCUMENT_CONSISTENCY: "Cross-Document Consistency Check",
  FIELD_VALIDATION: "Field Parameter Validation",
  DATA_RANGE: "Threshold & Cost Range Check",
  DATA_TYPE: "Data Format Validation",
  AUTHENTICITY_INDICATOR: "Document Authenticity & Certificate Check",
  DUPLICATE_DETECTION: "Duplicate Application Check",
  SUSPICIOUS_INDICATOR: "Anomaly & Integrity Indicator Check",
  SCHEMA: "Application Profile Schema Check",
  REQUIRED_DOCUMENT: "Required Supporting Documents Check",
  SCHEME_KNOWLEDGE_RETRIEVAL: "Scheme Knowledge Base Verification",
  RAG_PROJECT_COST_LIMIT: "Scheme Project Cost Limit Check",
  RAG_PROJECT_DURATION_LIMIT: "Scheme Duration Limit Check",
  RAG_ORGANIZATION_ELIGIBILITY: "Eligible Organization Type Check",
  RAG_PROJECT_CATEGORY_ELIGIBILITY: "Project Category Eligibility Check",
  RAG_REQUIRED_DOCUMENTS: "Supporting Documents Guideline Check",
  RAG_SCHEME_VALIDATION: "Scheme Guidelines Match Check",
  DOCUMENT_LLM: "Semantic Document Quality Validation",
  // Dotted & raw field identifiers
  "applicant.name": "Applicant Full Name",
  "applicant.organization_type": "Organization / Entity Type",
  "applicant.email": "Applicant Email Address",
  "project.title": "Project Title",
  "project.category": "Project Category",
  "financial.project_cost": "Estimated Project Cost",
  "timeline.duration_months": "Project Duration",
  "certificates.certificate_number": "Certificate Number",
  environmental_benefit: "Environmental Benefit",
  applicant_name: "Applicant Full Name",
  organization_type: "Organization / Entity Type",
  project_title: "Project Title",
  project_category: "Project Category",
  project_cost: "Estimated Project Cost",
  duration_months: "Project Duration",
  certificate_number: "Certificate Number",
};

function humanLabel(value: string): string {
  if (!value) return "Field Parameter";
  if (HUMAN_FIELD_MAP[value]) return HUMAN_FIELD_MAP[value];
  const cleaned = value
    .replace(/^CROSS_DOCUMENT_/, "")
    .replace(/^RAG_/, "")
    .replace(/^(applicant|project|financial|timeline|certificates)\./, "")
    .replaceAll("_", " ")
    .replaceAll(".", " ");
  return cleaned.replace(/\b\w/g, c => c.toUpperCase());
}

function cleanValidationMessage(message: string | null | undefined): string {
  if (!message) return "Verification check completed.";
  let text = message
    .replace(/applicant\.name/g, "Applicant Full Name")
    .replace(/applicant\.organization_type/g, "Organization / Entity Type")
    .replace(/applicant\.email/g, "Applicant Email Address")
    .replace(/project\.title/g, "Project Title")
    .replace(/project\.category/g, "Project Category")
    .replace(/project\.location/g, "Project Location")
    .replace(/financial\.project_cost/g, "Estimated Project Cost")
    .replace(/timeline\.duration_months/g, "Project Duration")
    .replace(/certificates\.certificate_number/g, "Certificate Number");

  if (text.includes("has only 0 distinct document-derived value(s)") || text.includes("has only 1 distinct document-derived value(s)")) {
    const match = text.match(/^(.*?) has only/);
    const fieldName = match ? match[1] : "Field parameter";
    return `${fieldName}: Single document extracted. Awaiting secondary document for multi-document cross-comparison.`;
  }
  if (text.includes("Required evidence unavailable")) {
    text = text.replace(/\.?\s*Required evidence unavailable\.?/g, "");
    if (text.includes("is required")) {
      return `${text}. Please attach supporting certificate or proposal document.`;
    }
    if (text.trim()) {
      return `${text.trim()} (Needs supporting document verification).`;
    }
    return "Needs supporting document verification.";
  }
  if (text.includes("Application field completeness is")) {
    return text.replace("Application field completeness is", "Application parameters completeness rate is");
  }
  return text;
}

const FIELD_TYPES = [
  "REQUIRED_FIELD",
  "DATA_RANGE",
  "BUSINESS_RULE_PRECHECK",
  "FIELD_VALIDATION",
  "DATA_TYPE",
];

function formatValue(value: unknown): string {
  if (value == null || value === "") return "Not available";
  if (typeof value === "number") {
    if (value >= 10000) {
      return `₹${value.toLocaleString("en-IN")}`;
    }
    return String(value);
  }
  if (Array.isArray(value)) {
    if (!value.length) return "Not available";
    return value
      .map(item => {
        if (item && typeof item === "object" && "value" in item) {
          return String((item as { value: unknown }).value);
        }
        return formatValue(item);
      })
      .filter(v => v !== "Not available")
      .join(", ") || "Not available";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if ("value" in obj && obj.value != null) {
      return formatValue(obj.value);
    }
    const entries = Object.entries(obj)
      .filter(([k, v]) => v != null && v !== "" && k !== "document_id" && k !== "locator")
      .map(([k, v]) => `${humanLabel(k)}: ${formatValue(v)}`);
    return entries.length ? entries.join("; ") : "Not available";
  }
  return String(value);
}

function evidenceOf(v: ValidationResult): Record<string, unknown> {
  return (v.evidence ?? {}) as Record<string, unknown>;
}

function getFieldName(v: ValidationResult): string {
  const ev = evidenceOf(v);
  return String(ev.display_field ?? ev.field_name ?? ev.field ?? ev.applied_field ?? v.validation_type);
}

function getExpected(v: ValidationResult): string {
  const ev = evidenceOf(v);
  const expected = ev.expected as Record<string, unknown> | undefined;
  if (ev.expected_value != null) return formatValue(ev.expected_value);
  if (expected?.max != null && expected?.min != null) return `${formatValue(expected.min)} – ${formatValue(expected.max)}`;
  if (expected?.max != null) return `≤ ${formatValue(expected.max)}`;
  if (expected?.min != null) return `≥ ${formatValue(expected.min)}`;
  if (expected?.allowed_values != null) return `One of: ${formatValue(expected.allowed_values)}`;
  if (expected?.required_documents != null) return formatValue(expected.required_documents);
  if (expected?.minimum_distinct_documents != null) return `≥ ${formatValue(expected.minimum_distinct_documents)} distinct documents`;
  if (expected?.comparison != null) return String(expected.comparison);
  if (expected?.required === true) return "Required";
  return "Not available";
}

function getActual(v: ValidationResult): string {
  const ev = evidenceOf(v);
  const actual = ev.actual as Record<string, unknown> | undefined;
  if (ev.extracted_value != null && ev.extracted_value !== "") return formatValue(ev.extracted_value);
  if (ev.actual_value != null && ev.actual_value !== "") return formatValue(ev.actual_value);
  if (actual?.value != null && actual.value !== "") return formatValue(actual.value);
  if (Array.isArray(actual?.values) && actual.values.length > 0) return formatValue(actual.values);
  if (Array.isArray(actual?.document_values) && actual.document_values.length > 0) return formatValue(actual.document_values);
  if (Array.isArray(ev.values) && ev.values.length > 0) return formatValue(ev.values);
  return "Not available";
}

function getCrossDocValues(v: ValidationResult): { checkName: string; docA: string; docB: string } {
  const ev = evidenceOf(v);
  const checkName = String(
    ev.display_field ||
    (ev.field_name ? humanLabel(String(ev.field_name)) : "") ||
    (ev.field ? humanLabel(String(ev.field)) : "") ||
    (ev.check_id ? humanLabel(String(ev.check_id).replace(/^CROSS_DOCUMENT_/, "")) : "") ||
    humanLabel(v.validation_type)
  );

  let docA = "Not available";
  let docB = "Not available";

  if (ev.document_a && typeof ev.document_a === "string" && ev.document_a !== "—") {
    docA = ev.document_a;
  }
  if (ev.document_b && typeof ev.document_b === "string" && ev.document_b !== "—") {
    docB = ev.document_b;
  }

  // Fallback to documents array
  if ((docA === "Not available" || docB === "Not available") && Array.isArray(ev.documents)) {
    const docs = ev.documents as Array<{ filename?: string; value?: unknown }>;
    if (docs.length >= 1 && docA === "Not available") {
      const d0 = docs[0];
      const val = d0.value != null ? formatValue(d0.value) : "Not available";
      docA = d0.filename && val !== "Not available" ? `${d0.filename}: ${val}` : val;
    }
    if (docs.length >= 2 && docB === "Not available") {
      const d1 = docs[1];
      const val = d1.value != null ? formatValue(d1.value) : "Not available";
      docB = d1.filename && val !== "Not available" ? `${d1.filename}: ${val}` : val;
    }
  }

  // Fallback to values array
  if (docA === "Not available" && Array.isArray(ev.values) && ev.values.length >= 1) {
    docA = formatValue(ev.values[0]);
  }
  if (docB === "Not available" && Array.isArray(ev.values) && ev.values.length >= 2) {
    docB = formatValue(ev.values[1]);
  }

  return { checkName, docA, docB };
}

export function ValidationVerification({ detail }: { detail: ApplicationDetail | null }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  if (!detail) {
    return (
      <EmptyState
        icon={<ShieldCheck size={24} />}
        title={t("audit.empty_title", "No application selected")}
        description={t("audit.empty_desc", "Select an application from the Dashboard to view validation checks.")}
      />
    );
  }

  const all = detail.validation_results ?? [];
  const passes   = all.filter(v => v.status === "PASS");
  const warnings = all.filter(v => v.status === "WARN" || v.status === "NOT_VERIFIABLE");
  const fails    = all.filter(v => v.status === "FAIL");
  const skipped  = all.filter(v => v.status === "NOT_CHECKED");

  // Deduplicate and filter field results
  const rawFieldResults = all.filter(v => FIELD_TYPES.some(t => v.validation_type.startsWith(t)));
  const seenFieldKeys = new Set<string>();
  const fieldResults = rawFieldResults.filter(v => {
    const key = `${v.validation_type}_${getFieldName(v)}`;
    if (seenFieldKeys.has(key)) return false;
    seenFieldKeys.add(key);
    return true;
  });

  // Cross-document comparison results (deduplicated)
  const CROSS_DOC_TYPES = ["CONTRADICTION", "CROSS_DOCUMENT", "BUDGET_CONSISTENCY", "CROSS"];
  const rawCrossDocResults = all.filter(v =>
    CROSS_DOC_TYPES.some(t => v.validation_type.toUpperCase().includes(t))
  );
  const seenCrossKeys = new Set<string>();
  const crossDocResults = rawCrossDocResults.filter(v => {
    const ev = evidenceOf(v);
    const key = String(ev.check_id ?? ev.field ?? v.validation_type);
    if (seenCrossKeys.has(key)) return false;
    seenCrossKeys.add(key);
    return true;
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-slide-up font-sans">
      <PageHeader
        title={t("validation.title", "Validation & Verification")}
        subtitle={`${t("validation.subtitle", "Automated rules, registry verification, and contradiction detection")} — ${detail.project_title ?? ""}`}
        breadcrumb={t("nav.group_case_review", "Case Review")}
      />

      {/* ── KPI Summary Row ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <KpiMedium
          icon={<CheckCircle2 size={16} />}
          label={t("validation.kpi_passed", "Passed Checks")}
          count={passes.length}
          accent="navy"
        />
        <KpiMedium
          icon={<AlertTriangle size={16} />}
          label={t("validation.kpi_warnings", "Needs Verification")}
          count={warnings.length}
          accent="gold"
        />
        <KpiMedium
          icon={<XCircle size={16} />}
          label={t("validation.kpi_contradictions", "Failed Checks")}
          count={fails.length}
          accent="rose"
        />
        <KpiMedium
          icon={<HelpCircle size={16} />}
          label={t("common.pending", "Skipped Checks")}
          count={skipped.length}
          accent="slate"
        />
      </div>

      {/* ── Cross-Document Comparison Table ──────────────────────────────── */}
      {crossDocResults.length > 0 && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers size={16} className="text-[#0A243F]" />
              <h2 className="text-sm font-bold text-[#0A243F]">{t("validation.tab_cross_doc", "Cross-Document Verification")}</h2>
            </div>
            <span className="text-xs font-semibold text-[#66717C]">{crossDocResults.length} {t("validation.tab_cross_doc", "Consistency Checks")}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider">{t("validation.col_check", "Verification Check")}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider hidden sm:table-cell">{t("validation.col_doc_a", "Document A Value")}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider hidden md:table-cell">{t("validation.col_doc_b", "Document B Value")}</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider">{t("validation.col_status", "Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {crossDocResults.map((v, i) => {
                  const { checkName, docA, docB } = getCrossDocValues(v);
                  return (
                    <tr key={i} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-[#0A243F]">{checkName}</td>
                      <td className="px-5 py-3.5 text-[#071A2B] text-xs hidden sm:table-cell max-w-[220px] truncate" title={docA}>
                        {docA}
                      </td>
                      <td className="px-5 py-3.5 text-[#071A2B] text-xs hidden md:table-cell max-w-[220px] truncate" title={docB}>
                        {docB}
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <ResultPill status={v.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Application Field Verification Table ──────────────────────────────── */}
      {fieldResults.length > 0 && (
        <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <FileCheck size={16} className="text-[#0A243F]" />
              <h2 className="text-sm font-bold text-[#0A243F]">{t("validation.tab_rules", "Application Field Verification")}</h2>
            </div>
            <span className="text-xs font-semibold text-[#66717C]">{fieldResults.length} {t("validation.tab_rules", "Fields Checked")}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                  <th className="text-left px-6 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider">{t("validation.col_check", "Field Name")}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider hidden sm:table-cell">{t("validation.col_extracted", "Extracted Data")}</th>
                  <th className="text-left px-5 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider hidden md:table-cell">{t("validation.col_guideline", "Scheme Guideline Requirement")}</th>
                  <th className="text-center px-5 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider">{t("validation.col_status", "Outcome")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {fieldResults.map((v, i) => (
                  <tr key={i} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-[#0A243F]">{humanLabel(getFieldName(v))}</td>
                    <td className="px-5 py-3.5 text-[#071A2B] text-xs font-medium hidden sm:table-cell max-w-[220px] truncate" title={getActual(v)}>
                      {getActual(v)}
                    </td>
                    <td className="px-5 py-3.5 text-[#66717C] text-xs hidden md:table-cell max-w-[220px] truncate" title={getExpected(v)}>
                      {getExpected(v)}
                    </td>
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      <ResultPill status={v.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Complete Verification Checklist (Expandable) ──────────────────────────────── */}
      <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="flex w-full items-center justify-between px-6 py-4 text-sm font-bold text-[#0A243F] hover:bg-[#F8F9FA] transition"
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={17} className="text-[#0A243F]" />
            <span>{t("validation.tab_all", "Complete Checklist")} ({all.length} {t("validation.kpi_total", "Automated Checks")})</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#66717C]">
            <span>{showAll ? t("common.collapse", "Hide Complete Checklist") : t("common.expand", "View Complete Checklist")}</span>
            {showAll ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </button>

        {showAll && (
          <div className="border-t border-[#E5E7EB]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F8F9FA]">
                    <th className="text-left px-6 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider">{t("validation.col_check", "Check Name")}</th>
                    <th className="text-left px-5 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider hidden lg:table-cell">{t("validation.col_rationale", "Findings & Remarks")}</th>
                    <th className="text-center px-5 py-3 text-[11px] font-bold text-[#66717C] uppercase tracking-wider">{t("validation.col_status", "Status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {all.map((v, i) => {
                    const ev = evidenceOf(v);
                    const displayName = String(
                      ev.display_field ||
                      (ev.field_name ? humanLabel(String(ev.field_name)) : "") ||
                      (ev.check_id ? humanLabel(String(ev.check_id)) : "") ||
                      humanLabel(v.validation_type)
                    );
                    return (
                      <tr key={i} className="hover:bg-[#F8F9FA] transition">
                        <td className="px-6 py-3.5">
                          <p className="font-semibold text-[#0A243F]">{displayName}</p>
                          <p className="text-xs text-[#66717C] lg:hidden mt-0.5">{cleanValidationMessage(v.message)}</p>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-[#071A2B] hidden lg:table-cell max-w-md">
                          {cleanValidationMessage(v.message)}
                        </td>
                        <td className="px-5 py-3.5 text-center whitespace-nowrap">
                          <ResultPill status={v.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── KPI Tile ─────────────────────────── */
function KpiMedium({
  icon,
  label,
  count,
  accent,
}: {
  icon: ReactNode;
  label: string;
  count: number;
  accent: "navy" | "gold" | "rose" | "slate";
}) {
  const styles = {
    navy: {
      card: "border-[#E5E7EB] bg-white",
      icon: "bg-[#0A243F]/10 text-[#0A243F]",
      num:  "text-[#0A243F]",
      lbl:  "text-[#66717C]",
    },
    gold: {
      card: "border-[#FDE68A] bg-[#FFFBEB]",
      icon: "bg-[#D5A51A]/20 text-[#B45309]",
      num:  "text-[#92400E]",
      lbl:  "text-[#B45309]",
    },
    rose: {
      card: "border-[#FECACA] bg-[#FEF2F2]",
      icon: "bg-rose-100 text-rose-700",
      num:  "text-rose-900",
      lbl:  "text-rose-700",
    },
    slate: {
      card: "border-[#E5E7EB] bg-white",
      icon: "bg-[#F8F9FA] text-[#66717C]",
      num:  "text-[#0A243F]",
      lbl:  "text-[#66717C]",
    },
  }[accent];

  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-3.5 shadow-2xs ${styles.card}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${styles.icon}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-black leading-none ${styles.num}`}>{count}</p>
        <p className={`text-[11px] font-bold uppercase tracking-wider mt-1 truncate ${styles.lbl}`}>
          {label}
        </p>
      </div>
    </div>
  );
}

/* ── Result Pill (Muted Non-Neon Colors) ─────────────────────────── */
function ResultPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const map: Record<string, { label: string; cls: string }> = {
    PASS: {
      label: t("common.passed", "Passed"),
      cls: "bg-[#0A243F]/5 text-[#0A243F] border border-[#0A243F]/20 font-bold",
    },
    FAIL: {
      label: t("common.failed", "Failed"),
      cls: "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] font-bold",
    },
    WARN: {
      label: t("validation.needs_verification", "Needs verification"),
      cls: "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-bold",
    },
    NOT_VERIFIABLE: {
      label: t("validation.needs_verification", "Needs verification"),
      cls: "bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] font-bold",
    },
    NOT_CHECKED: {
      label: t("common.pending", "Skipped"),
      cls: "bg-[#F8F9FA] text-[#66717C] border border-[#E5E7EB]",
    },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-[#F8F9FA] text-[#66717C] border border-[#E5E7EB]" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
