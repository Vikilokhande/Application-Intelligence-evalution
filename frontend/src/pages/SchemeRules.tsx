// SchemeRules.tsx — Governance: Schemes & Eligibility Rules.
// Palette: Deep Navy Blue (#0A243F), Dark Navy (#071A2B), Mustard Gold (#D5A51A), Warm Off-White (#F8F9FA), White (#FFFFFF), Slate Gray (#66717C), Soft Gray (#E5E7EB).
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  PlusCircle,
  Search,
  Trash2,
  TrendingUp,
  ShieldCheck,
  Layers,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AlertBanner, EmptyState, PageHeader } from "../components/ui";
import { KnowledgeSearch } from "../components/KnowledgeSearch";
import type { SchemeRead } from "../types/api";

const SEVERITY_OPTIONS = ["ERROR", "WARNING", "INFO"] as const;

function humanRuleType(ruleType: string): { icon: ReactNode; label: string } {
  const t = ruleType.toLowerCase();
  if (t.includes("max") || t.includes("cost") || t.includes("value") || t.includes("limit")) {
    return { icon: <TrendingUp size={13} className="text-[#0A243F]" />, label: "Financial Limit" };
  }
  if (t.includes("duration") || t.includes("time")) {
    return { icon: <Clock size={13} className="text-[#D5A51A]" />, label: "Duration Requirement" };
  }
  if (t.includes("doc")) {
    return { icon: <FileText size={13} className="text-[#0A243F]" />, label: "Document Requirement" };
  }
  return { icon: <ShieldCheck size={13} className="text-[#0A243F]" />, label: "Eligibility Rule" };
}

function humanCondition(condition: Record<string, unknown>): string {
  if (condition.max != null) return `Must not exceed ${formatMoneyOrText(condition.max)}`;
  if (condition.min != null) return `Must be at least ${formatMoneyOrText(condition.min)}`;
  if (condition.allowed_values) return `Allowed: ${toList(condition.allowed_values).join(", ")}`;
  if (condition.document_types) return `Requires: ${toList(condition.document_types).join(", ")}`;
  if (condition.required) return "Mandatory required application field";
  if (condition.expected != null) return `Expected: ${String(condition.expected)}`;
  if (condition.field) return `Checks ${String(condition.field).replaceAll("_", " ")}`;
  return "Requirement configured";
}

function formatMoneyOrText(value: unknown): string {
  if (typeof value === "number") return `₹${value.toLocaleString("en-IN")}`;
  return String(value);
}

function toList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean);
  if (typeof value === "string") return value.split(",").map(item => item.trim()).filter(Boolean);
  return [];
}

function splitLines(value: string): string[] {
  return value.split(/\n|,/).map(item => item.trim()).filter(Boolean);
}

function slug(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function SchemeRules({
  schemes,
  onCreateScheme,
  onCreateRule,
  onDeleteRule,
}: {
  schemes: SchemeRead[];
  onCreateScheme: (payload: Record<string, unknown>) => Promise<void>;
  onCreateRule: (schemeId: string, payload: Record<string, unknown>) => Promise<void>;
  onDeleteRule?: (schemeId: string, ruleId: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [selectedScheme, setSelectedScheme] = useState(0);
  const [showAddScheme, setShowAddScheme] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleSearch, setRuleSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const RULE_TYPE_OPTIONS = [
    { value: "max_value", label: "Maximum Value Limit" },
    { value: "min_value", label: "Minimum Value Threshold" },
    { value: "required_field", label: "Required Mandatory Field" },
    { value: "required_documents", label: "Required Clearance Documents" },
    { value: "in_set", label: "Permitted Value List" },
    { value: "boolean", label: "Yes/No Compliance Requirement" },
  ];

  const [schemeName, setSchemeName] = useState("");
  const [schemeCode, setSchemeCode] = useState("");
  const [schemePurpose, setSchemePurpose] = useState("");
  const [schemeEligibility, setSchemeEligibility] = useState("");
  const [schemeDocuments, setSchemeDocuments] = useState("");
  const [schemeCategories, setSchemeCategories] = useState("");

  const [ruleName, setRuleName] = useState("");
  const [ruleDesc, setRuleDesc] = useState("");
  const [ruleType, setRuleType] = useState("max_value");
  const [ruleField, setRuleField] = useState("");
  const [ruleValue, setRuleValue] = useState("");
  const [severity, setSeverity] = useState<"ERROR" | "WARNING" | "INFO">("ERROR");

  const scheme = schemes[selectedScheme] ?? null;

  async function handleAddScheme(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const code = schemeCode.trim() || slug(schemeName);
      await onCreateScheme({
        code,
        name: schemeName.trim(),
        description: schemePurpose.trim(),
        configuration: {
          purpose: schemePurpose.trim(),
          eligibility: splitLines(schemeEligibility),
          required_documents: splitLines(schemeDocuments),
          project_categories: splitLines(schemeCategories),
        },
        rules: [],
      });
      setSuccess(`Scheme "${schemeName}" created successfully.`);
      setShowAddScheme(false);
      setSchemeName("");
      setSchemeCode("");
      setSchemePurpose("");
      setSchemeEligibility("");
      setSchemeDocuments("");
      setSchemeCategories("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create scheme.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddRule(e: FormEvent) {
    e.preventDefault();
    if (!scheme) return;
    setError(null);
    setBusy(true);
    try {
      const condition: Record<string, unknown> = {};
      if (ruleField) condition.field = ruleField;
      if (ruleType === "max_value" && ruleValue) condition.max = Number(ruleValue);
      if (ruleType === "min_value" && ruleValue) condition.min = Number(ruleValue);
      if (ruleType === "in_set" && ruleValue) condition.allowed_values = splitLines(ruleValue);
      if (ruleType === "required_documents" && ruleValue) condition.document_types = splitLines(ruleValue).map(item => slug(item));
      if (ruleType === "required_field") condition.required = true;
      if (ruleType === "boolean") condition.expected = ruleValue.trim().toLowerCase() !== "false";

      await onCreateRule(scheme.id, {
        rule_id: slug(ruleName),
        rule_name: ruleName.trim(),
        rule_type: ruleType,
        condition,
        severity,
        active: true,
      });
      setSuccess(`Rule "${ruleName}" added successfully.`);
      setShowAddRule(false);
      setRuleName("");
      setRuleDesc("");
      setRuleField("");
      setRuleValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create rule.");
    } finally {
      setBusy(false);
    }
  }

  const filteredRules = (scheme?.rules ?? []).filter(rule => {
    if (!ruleSearch.trim()) return true;
    const q = ruleSearch.toLowerCase();
    return rule.rule_name.toLowerCase().includes(q) || rule.rule_type.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-slide-up font-sans">
      <PageHeader
        title={t("schemes.title", "Schemes & Governance Rules")}
        subtitle={t("schemes.subtitle", "Statutory clearance requirements, document requirements, and parameter rules")}
        breadcrumb={t("nav.group_governance", "Governance")}
        actions={
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => { setShowAddScheme(v => !v); setShowAddRule(false); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-bold text-[#0A243F] hover:bg-[#F8F9FA] hover:border-[#0A243F] transition shadow-2xs"
            >
              <PlusCircle size={14} className="text-[#D5A51A]" /> {t("schemes.create_btn", "Create Scheme")}
            </button>
            <button
              onClick={() => { setShowAddRule(v => !v); setShowAddScheme(false); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A243F] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d2f50] transition shadow-xs"
            >
              <PlusCircle size={14} className="text-[#D5A51A]" /> {t("schemes.add_rule_btn", "Add Rule")}
            </button>
          </div>
        }
      />

      {error && <AlertBanner variant="error" onDismiss={() => setError(null)}>{error}</AlertBanner>}
      {success && <AlertBanner variant="success" onDismiss={() => setSuccess(null)}>{success}</AlertBanner>}

      {/* ── Scheme Selector Horizontal Row ────────────────────── */}
      {schemes.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-1">
          {schemes.map((item, i) => (
            <button
              key={item.id}
              onClick={() => { setSelectedScheme(i); setExpandedRule(null); }}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                selectedScheme === i
                  ? "bg-[#0A243F] text-white shadow-xs"
                  : "bg-white border border-[#E5E7EB] text-[#66717C] hover:text-[#0A243F] hover:border-[#0A243F]"
              }`}
            >
              <span>{item.name}</span>
              {selectedScheme === i && (
                <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[#D5A51A]" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── Add Scheme Form Panel ──────────────────────────── */}
      {showAddScheme && (
        <FormPanel title={t("schemes.create_btn", "Add Environmental Scheme")} subtitle="Provide scheme parameters and metadata. Rules can be configured after creation.">
          <form onSubmit={handleAddScheme} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t("schemes.scheme_name_label", "Scheme Name")} required>
                <input className="form-input text-xs" value={schemeName} onChange={e => setSchemeName(e.target.value)} placeholder={t("schemes.scheme_name_placeholder", "e.g. National Green Hydrogen Mission")} required />
              </FormField>
              <FormField label={t("schemes.scheme_code_label", "Scheme Code")}>
                <input className="form-input text-xs" value={schemeCode} onChange={e => setSchemeCode(e.target.value)} placeholder="e.g. NGHM-2026" />
              </FormField>
            </div>
            <FormField label={t("schemes.scheme_desc_label", "Scheme Description & Scope")} required>
              <textarea className="form-input text-xs min-h-[70px]" value={schemePurpose} onChange={e => setSchemePurpose(e.target.value)} placeholder={t("schemes.scheme_desc_placeholder", "Describe the statutory purpose and guidelines...")} required />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label={t("details.tab_overview", "Eligibility Criteria")}>
                <textarea className="form-input text-xs min-h-[80px]" value={schemeEligibility} onChange={e => setSchemeEligibility(e.target.value)} placeholder="Registered Entity&#10;Municipal Corporation&#10;State Department" />
              </FormField>
              <FormField label={t("details.tab_documents", "Required Documents")}>
                <textarea className="form-input text-xs min-h-[80px]" value={schemeDocuments} onChange={e => setSchemeDocuments(e.target.value)} placeholder="EIA Clearance Report&#10;Project Budget&#10;Land Certificate" />
              </FormField>
              <FormField label={t("details.project_cat", "Project Categories")}>
                <textarea className="form-input text-xs min-h-[80px]" value={schemeCategories} onChange={e => setSchemeCategories(e.target.value)} placeholder="Water Conservation&#10;Afforestation&#10;Renewable Energy" />
              </FormField>
            </div>
            <FormActions onCancel={() => setShowAddScheme(false)} busy={busy} submitLabel={t("common.confirm", "Save Scheme")} />
          </form>
        </FormPanel>
      )}

      {/* ── Main 2-Column Balanced Content ──────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] items-start">
        {/* Left Column: Selected Scheme Info + Rules List */}
        <div className="space-y-6">
          {scheme && <SchemeCard scheme={scheme} />}

          {/* Add Rule Form Panel */}
          {showAddRule && scheme && (
            <FormPanel title={`${t("schemes.add_rule_btn", "Add Rule to")} ${scheme.name}`} subtitle="Configure rule parameter checks. No complex formatting required.">
              <form onSubmit={handleAddRule} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label={t("schemes.rule_name_label", "Rule Name")} required>
                    <input className="form-input text-xs" value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder={t("schemes.rule_name_placeholder", "e.g. Max Total Cost Threshold")} required />
                  </FormField>
                  <FormField label={t("schemes.rule_type_label", "Rule Type")} required>
                    <select className="form-select text-xs" value={ruleType} onChange={e => setRuleType(e.target.value)}>
                      {RULE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label={t("schemes.rule_type_label", "Rule Objective")}>
                  <input className="form-input text-xs" value={ruleDesc} onChange={e => setRuleDesc(e.target.value)} placeholder="Describe what this compliance check validates…" />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label={t("validation.col_check", "Target Field")}>
                    <input className="form-input text-xs" value={ruleField} onChange={e => setRuleField(e.target.value)} placeholder="e.g. project_cost" />
                  </FormField>
                  <FormField label={ruleValueLabel(ruleType)}>
                    <input className="form-input text-xs" value={ruleValue} onChange={e => setRuleValue(e.target.value)} placeholder={ruleValuePlaceholder(ruleType)} />
                  </FormField>
                  <FormField label={t("schemes.rule_severity_label", "Severity")}>
                    <select className="form-select text-xs" value={severity} onChange={e => setSeverity(e.target.value as typeof severity)}>
                      {SEVERITY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormActions onCancel={() => setShowAddRule(false)} busy={busy} submitLabel={t("common.confirm", "Save Rule")} />
              </form>
            </FormPanel>
          )}

          {/* Rules List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#0A243F]" />
                <h3 className="text-sm font-bold text-[#0A243F]">
                  {t("details.tab_rules", "Configured Eligibility Rules")} {scheme ? `(${scheme.rules.length})` : ""}
                </h3>
              </div>
              {(scheme?.rules.length ?? 0) > 2 && (
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#66717C]" />
                  <input
                    className="form-input w-48 py-1.5 pl-8 text-xs"
                    placeholder={t("common.search", "Search rules…")}
                    value={ruleSearch}
                    onChange={e => setRuleSearch(e.target.value)}
                  />
                </div>
              )}
            </div>

            {filteredRules.length === 0 && !showAddRule && (
              <EmptyState
                title={t("schemes.rules_count", "No rules configured")}
                description={scheme ? `No rules have been configured for ${scheme.name} yet.` : "Select a scheme to view rules."}
                action={
                  <button
                    onClick={() => setShowAddRule(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A243F] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d2f50]"
                  >
                    <PlusCircle size={13} className="text-[#D5A51A]" /> {t("schemes.add_rule_btn", "Add first rule")}
                  </button>
                }
              />
            )}

            <div className="space-y-2.5">
              {filteredRules.map(rule => {
                const { icon, label } = humanRuleType(rule.rule_type);
                const requirement = humanCondition(rule.condition);
                const open = expandedRule === rule.id;
                return (
                  <div key={rule.id} className="rounded-2xl border border-[#E5E7EB] bg-white shadow-2xs overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedRule(open ? null : rule.id)}
                      className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-[#F8F9FA]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0A243F]/10 text-[#0A243F]">
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#0A243F]">{rule.rule_name}</span>
                          <span className="rounded-md border border-[#0A243F]/20 bg-[#0A243F]/5 px-2 py-0.5 text-[10px] font-semibold text-[#0A243F]">
                            {label}
                          </span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${rule.active ? "border border-[#0A243F]/20 bg-[#0A243F]/5 text-[#0A243F]" : "border border-[#E5E7EB] bg-[#F8F9FA] text-[#66717C]"}`}>
                            {rule.active ? t("common.active", "Active") : t("common.pending", "Inactive")}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-[#66717C] truncate">{requirement}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {onDeleteRule && (
                          <button
                            onClick={async e => { e.stopPropagation(); await onDeleteRule(scheme!.id, rule.id); }}
                            className="text-[#66717C] transition hover:text-rose-600 p-1"
                            title={t("details.delete_app_btn", "Delete rule")}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        {open ? <ChevronDown size={14} className="text-[#66717C]" /> : <ChevronRight size={14} className="text-[#66717C]" />}
                      </div>
                    </button>

                    {open && (
                      <div className="border-t border-[#E5E7EB] px-5 py-3 bg-[#F8F9FA]">
                        <div className="grid gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3.5 sm:grid-cols-3 text-xs">
                          <RuleInfo label={t("details.case_info", "Check Scope")} value={ruleDescForType(rule.rule_type)} />
                          <RuleInfo label={t("details.tab_evidence", "Statutory Requirement")} value={requirement} />
                          <RuleInfo label={t("validation.col_status", "Status")} value={rule.active ? "Active Rule" : "Inactive"} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Search Scheme Requirements / Knowledge Widget */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden">
            <div className="border-b border-[#E5E7EB] bg-[#F8F9FA] px-5 py-4">
              <h3 className="text-sm font-bold text-[#0A243F]">{t("details.tab_evidence", "Search Scheme Guidelines")}</h3>
              <p className="mt-0.5 text-xs text-[#66717C]">{t("schemes.subtitle", "Query statutory limits, eligibility guidelines, and document rules.")}</p>
            </div>
            <div className="p-5">
              <KnowledgeSearch />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-Components ───────────────────────────────────────────────── */
function SchemeCard({ scheme }: { scheme: SchemeRead }) {
  const { t } = useTranslation();
  const configuration = scheme.configuration ?? {};
  const purpose = String(configuration.purpose ?? scheme.description ?? "Purpose not provided.");
  const eligibility = toList(configuration.eligibility);
  const docs = toList(configuration.required_documents);

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-xs overflow-hidden font-sans">
      <div className="flex items-start justify-between gap-4 border-b border-[#E5E7EB] bg-[#F8F9FA] px-6 py-4">
        <div>
          <h2 className="text-sm font-bold text-[#0A243F]">{scheme.name}</h2>
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wider text-[#66717C]">{scheme.code}</p>
        </div>
        <span className="rounded-full border border-[#0A243F]/20 bg-[#0A243F]/5 px-2.5 py-0.5 text-xs font-bold text-[#0A243F]">
          {scheme.active ? t("common.active", "Active Scheme") : t("common.pending", "Inactive")}
        </span>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-3">
        <SchemeInfo label={t("schemes.scheme_desc_label", "Scheme Purpose")} value={purpose} />
        <SchemeInfo label={t("details.tab_overview", "Eligible Entities")} value={eligibility.length ? eligibility.join(", ") : t("common.no_data", "Not configured")} />
        <SchemeInfo label={t("details.tab_documents", "Mandatory Documents")} value={docs.length ? docs.join(", ") : t("common.no_data", "Not configured")} />
      </div>
    </div>
  );
}

function FormPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#0A243F]/20 bg-white shadow-sm overflow-hidden animate-slide-up">
      <div className="border-b border-[#E5E7EB] bg-[#0A243F] text-white px-6 py-4">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="mt-0.5 text-xs text-slate-200">{subtitle}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function FormActions({ onCancel, busy, submitLabel }: { onCancel: () => void; busy: boolean; submitLabel: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-xs font-semibold text-[#66717C] hover:bg-[#F8F9FA]"
      >
        {t("common.cancel", "Cancel")}
      </button>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-[#0A243F] px-5 py-2 text-xs font-bold text-white hover:bg-[#0d2f50] disabled:opacity-50 shadow-xs"
      >
        {busy ? t("common.processing", "Saving…") : submitLabel}
      </button>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-[#66717C]">
        {label}{required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SchemeInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#66717C]">{label}</p>
      <p className="text-xs font-medium leading-relaxed text-[#071A2B]">{value}</p>
    </div>
  );
}

function RuleInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-wider text-[#66717C]">{label}</p>
      <p className="text-xs font-semibold text-[#071A2B]">{value}</p>
    </div>
  );
}

function ruleDescForType(ruleType: string): string {
  if (ruleType === "required_documents") return "Mandatory clearance documents must be present.";
  if (ruleType === "required_field") return "Application field must be populated.";
  if (ruleType === "in_set") return "Value must match authorized guideline values.";
  if (ruleType.includes("max")) return "Value must not exceed authorized maximum threshold.";
  if (ruleType.includes("min")) return "Value must meet the minimum threshold.";
  return "Application must follow statutory scheme guidelines.";
}

function ruleValueLabel(ruleType: string): string {
  if (ruleType === "in_set") return "Allowed Values";
  if (ruleType === "required_documents") return "Required Documents";
  if (ruleType === "boolean") return "Expected Value";
  if (ruleType === "min_value") return "Minimum Value";
  return "Maximum Value Limit";
}

function ruleValuePlaceholder(ruleType: string): string {
  if (ruleType === "in_set") return "e.g. Registered NGO, Municipal body";
  if (ruleType === "required_documents") return "e.g. EIA Report, Budget, Certificate";
  if (ruleType === "boolean") return "true";
  return "e.g. 5000000";
}
