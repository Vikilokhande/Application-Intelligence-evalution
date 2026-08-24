import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  PlusCircle,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { AlertBanner, EmptyState, PageHeader } from "../components/ui";
import { KnowledgeSearch } from "../components/KnowledgeSearch";
import type { SchemeRead } from "../types/api";

const SEVERITY_OPTIONS = ["ERROR", "WARNING", "INFO"] as const;
const RULE_TYPE_OPTIONS = [
  { value: "max_value", label: "Maximum Value" },
  { value: "min_value", label: "Minimum Value" },
  { value: "required_field", label: "Required Field" },
  { value: "required_documents", label: "Required Documents" },
  { value: "in_set", label: "Allowed Values" },
  { value: "boolean", label: "Yes/No Requirement" },
];

function humanRuleType(ruleType: string): { icon: ReactNode; label: string } {
  const t = ruleType.toLowerCase();
  if (t.includes("max") || t.includes("cost") || t.includes("value") || t.includes("limit")) {
    return { icon: <TrendingUp size={13} className="text-emerald-600" />, label: "Financial Limit" };
  }
  if (t.includes("duration") || t.includes("time")) {
    return { icon: <Clock size={13} className="text-amber-600" />, label: "Duration Requirement" };
  }
  if (t.includes("doc")) {
    return { icon: <FileText size={13} className="text-violet-600" />, label: "Document Requirement" };
  }
  return { icon: <CheckCircle2 size={13} className="text-teal-600" />, label: "Eligibility Rule" };
}

function humanCondition(condition: Record<string, unknown>): string {
  if (condition.max != null) return `Must not exceed ${formatMoneyOrText(condition.max)}`;
  if (condition.min != null) return `Must be at least ${formatMoneyOrText(condition.min)}`;
  if (condition.allowed_values) return `Must be one of: ${toList(condition.allowed_values).join(", ")}`;
  if (condition.document_types) return `Requires: ${toList(condition.document_types).join(", ")}`;
  if (condition.required) return "Required field must be provided";
  if (condition.expected != null) return `Expected: ${String(condition.expected)}`;
  if (condition.field) return `Checks ${String(condition.field).replaceAll("_", " ")}`;
  return "Human-readable requirement not configured";
}

function formatMoneyOrText(value: unknown): string {
  if (typeof value === "number") return `INR ${value.toLocaleString("en-IN")}`;
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
  const [selectedScheme, setSelectedScheme] = useState(0);
  const [showAddScheme, setShowAddScheme] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [ruleSearch, setRuleSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

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
      setSuccess(`Scheme "${schemeName}" added successfully.`);
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
    <div className="max-w-[1100px] mx-auto space-y-6 animate-slide-up">
      <PageHeader
        title="Schemes & Rules"
        subtitle="Manage government schemes and their eligibility rules."
        breadcrumb="Governance"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setShowAddScheme(v => !v); setShowAddRule(false); }}
              className="secondary-button"
            >
              <PlusCircle size={14} /> Add Scheme
            </button>
            <button
              onClick={() => { setShowAddRule(v => !v); setShowAddScheme(false); }}
              className="primary-button"
            >
              <PlusCircle size={14} /> Add Rule
            </button>
          </div>
        }
      />

      {error && <AlertBanner variant="error" onDismiss={() => setError(null)}>{error}</AlertBanner>}
      {success && <AlertBanner variant="success" onDismiss={() => setSuccess(null)}>{success}</AlertBanner>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {schemes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {schemes.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedScheme(i); setExpandedRule(null); }}
                  className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                    selectedScheme === i
                      ? "border-teal-500 bg-teal-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}

          {showAddScheme && (
            <FormPanel title="Add Scheme" subtitle="Create a scheme using readable fields. Rules can be added after the scheme is saved.">
              <form onSubmit={handleAddScheme} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Scheme Name" required>
                    <input className="form-input" value={schemeName} onChange={e => setSchemeName(e.target.value)} placeholder="Green Infrastructure Support" required />
                  </FormField>
                  <FormField label="Scheme Code">
                    <input className="form-input" value={schemeCode} onChange={e => setSchemeCode(e.target.value)} placeholder="GISS_2026" />
                  </FormField>
                </div>
                <FormField label="Purpose" required>
                  <textarea className="form-input min-h-20" value={schemePurpose} onChange={e => setSchemePurpose(e.target.value)} placeholder="Support eligible green infrastructure projects." required />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label="Eligibility">
                    <textarea className="form-input min-h-24" value={schemeEligibility} onChange={e => setSchemeEligibility(e.target.value)} placeholder="Registered NGO&#10;Municipal body" />
                  </FormField>
                  <FormField label="Required Documents">
                    <textarea className="form-input min-h-24" value={schemeDocuments} onChange={e => setSchemeDocuments(e.target.value)} placeholder="Application Form&#10;Budget&#10;Certificate" />
                  </FormField>
                  <FormField label="Project Categories">
                    <textarea className="form-input min-h-24" value={schemeCategories} onChange={e => setSchemeCategories(e.target.value)} placeholder="Urban Greening&#10;Water Conservation" />
                  </FormField>
                </div>
                <FormActions onCancel={() => setShowAddScheme(false)} busy={busy} submitLabel="Save Scheme" />
              </form>
            </FormPanel>
          )}

          {scheme && <SchemeCard scheme={scheme} />}

          {showAddRule && scheme && (
            <FormPanel title={`Add Rule to ${scheme.name}`} subtitle="Fill in the rule details below. No JSON required.">
              <form onSubmit={handleAddRule} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Rule Name" required>
                    <input className="form-input" value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="Maximum Project Cost" required />
                  </FormField>
                  <FormField label="Rule Type" required>
                    <select className="form-select" value={ruleType} onChange={e => setRuleType(e.target.value)}>
                      {RULE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormField label="Checks">
                  <input className="form-input" value={ruleDesc} onChange={e => setRuleDesc(e.target.value)} placeholder="Whether the submitted value follows scheme requirements." />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField label="Field to Check">
                    <input className="form-input" value={ruleField} onChange={e => setRuleField(e.target.value)} placeholder="financial.project_cost" />
                  </FormField>
                  <FormField label={ruleValueLabel(ruleType)}>
                    <input className="form-input" value={ruleValue} onChange={e => setRuleValue(e.target.value)} placeholder={ruleValuePlaceholder(ruleType)} />
                  </FormField>
                  <FormField label="Severity">
                    <select className="form-select" value={severity} onChange={e => setSeverity(e.target.value as typeof severity)}>
                      {SEVERITY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FormField>
                </div>
                <FormActions onCancel={() => setShowAddRule(false)} busy={busy} submitLabel="Save Rule" />
              </form>
            </FormPanel>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-slate-700">Rules {scheme ? `(${scheme.rules.length})` : ""}</h3>
              {(scheme?.rules.length ?? 0) > 3 && (
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input className="form-input w-44 py-1.5 pl-7 text-xs" placeholder="Search rules..." value={ruleSearch} onChange={e => setRuleSearch(e.target.value)} />
                </div>
              )}
            </div>

            {filteredRules.length === 0 && !showAddRule && (
              <EmptyState
                title="No rules configured"
                description={scheme ? `No eligibility rules are set for ${scheme.name}.` : "Select a scheme to view its rules."}
                action={
                  <button onClick={() => setShowAddRule(true)} className="primary-button">
                    <PlusCircle size={13} /> Add first rule
                  </button>
                }
              />
            )}

            {filteredRules.map(rule => {
              const { icon, label } = humanRuleType(rule.rule_type);
              const requirement = humanCondition(rule.condition);
              const open = expandedRule === rule.id;
              return (
                <div key={rule.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedRule(open ? null : rule.id)}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">{icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{rule.rule_name}</span>
                        <Badge>{label}</Badge>
                        <Badge tone={rule.active ? "green" : "gray"}>{rule.active ? "Active" : "Inactive"}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{requirement}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {onDeleteRule && (
                        <button
                          onClick={async e => { e.stopPropagation(); await onDeleteRule(scheme!.id, rule.id); }}
                          className="text-slate-300 transition hover:text-rose-500"
                          title="Delete rule"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      {open ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-slate-100 px-5 pb-4 pt-3">
                      <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 sm:grid-cols-3">
                        <RuleInfo label="Checks" value={ruleDescForType(rule.rule_type)} />
                        <RuleInfo label="Requirement" value={requirement} />
                        <RuleInfo label="Status" value={rule.active ? "Active" : "Inactive"} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <h3 className="text-sm font-bold text-slate-800">Policy Search</h3>
              <p className="mt-0.5 text-xs text-slate-400">Search scheme requirements and guidelines.</p>
            </div>
            <div className="p-4">
              <KnowledgeSearch />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchemeCard({ scheme }: { scheme: SchemeRead }) {
  const configuration = scheme.configuration ?? {};
  const purpose = String(configuration.purpose ?? scheme.description ?? "Purpose not provided.");
  const eligibility = toList(configuration.eligibility);
  const docs = toList(configuration.required_documents);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{scheme.name}</h2>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">{scheme.code}</p>
        </div>
        <Badge tone={scheme.active ? "green" : "gray"}>{scheme.active ? "Active" : "Inactive"}</Badge>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <SchemeInfo label="Purpose" value={purpose} />
        <SchemeInfo label="Eligibility" value={eligibility.length ? eligibility.join(", ") : "Evidence unavailable"} />
        <SchemeInfo label="Required Documents" value={docs.length ? docs.join(", ") : "Evidence unavailable"} />
      </div>
    </div>
  );
}

function FormPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-teal-200 bg-teal-50 shadow-sm overflow-hidden animate-slide-up">
      <div className="border-b border-teal-200 px-5 py-4">
        <h3 className="text-sm font-bold text-teal-800">{title}</h3>
        <p className="mt-0.5 text-xs text-teal-600">{subtitle}</p>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FormActions({ onCancel, busy, submitLabel }: { onCancel: () => void; busy: boolean; submitLabel: string }) {
  return (
    <div className="flex justify-end gap-3">
      <button type="button" onClick={onCancel} className="secondary-button">Cancel</button>
      <button type="submit" disabled={busy} className="primary-button disabled:opacity-50">{busy ? "Saving..." : submitLabel}</button>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SchemeInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm leading-relaxed text-slate-700">{value}</p>
    </div>
  );
}

function RuleInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" }) {
  const cls = tone === "green" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{children}</span>;
}

function ruleDescForType(ruleType: string): string {
  if (ruleType === "required_documents") return "Whether required documents were submitted.";
  if (ruleType === "required_field") return "Whether a required application field is available.";
  if (ruleType === "in_set") return "Whether the value matches permitted scheme values.";
  if (ruleType.includes("max")) return "Whether the value is within the permitted maximum.";
  if (ruleType.includes("min")) return "Whether the value meets the minimum requirement.";
  return "Whether the application follows the configured scheme requirement.";
}

function ruleValueLabel(ruleType: string): string {
  if (ruleType === "in_set") return "Allowed Values";
  if (ruleType === "required_documents") return "Required Documents";
  if (ruleType === "boolean") return "Expected Value";
  if (ruleType === "min_value") return "Minimum Value";
  return "Maximum Value";
}

function ruleValuePlaceholder(ruleType: string): string {
  if (ruleType === "in_set") return "Registered NGO, Municipal body";
  if (ruleType === "required_documents") return "Application Form, Budget, Certificate";
  if (ruleType === "boolean") return "true";
  return "5000000";
}
