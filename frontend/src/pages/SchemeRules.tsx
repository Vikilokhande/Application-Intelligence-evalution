import type { FormEvent } from "react";
import { useState } from "react";
import { BookOpen, Settings2, PlusCircle, ShieldCheck, Sparkles, Layers } from "lucide-react";
import { KnowledgeSearch } from "../components/KnowledgeSearch";
import { SectionPanel } from "../components/SectionPanel";
import { StatusBadge } from "../components/StatusBadge";
import type { SchemeRead } from "../types/api";

export function SchemeRules({
  schemes,
  onCreateRule
}: {
  schemes: SchemeRead[];
  onCreateRule: (schemeId: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [schemeId, setSchemeId] = useState("");
  const [ruleId, setRuleId] = useState("MAX_TREE_COST");
  const [field, setField] = useState("financial.project_cost");
  const [max, setMax] = useState("5000000");

  const activeScheme = schemes.find((scheme) => scheme.id === (schemeId || schemes[0]?.id)) ?? schemes[0];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activeScheme) return;
    await onCreateRule(activeScheme.id, {
      rule_id: ruleId,
      rule_name: ruleId.replaceAll("_", " "),
      rule_type: "max_value",
      condition: { field, max: Number(max) },
      severity: "ERROR",
      active: true
    });
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="panel border-l-4 border-l-[#0F766E] bg-gradient-to-r from-white via-[#F8FAFC] to-[#F0FDF4] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">
                Scheme Rules & RAG Knowledge Center
              </h1>
              <span className="ai-boundary-badge">✦ Environmental Policy Console</span>
            </div>
            <p className="mt-1 text-xs text-[#475569]">
              Directorate of Env. & Climate Change • Manage regulatory scheme thresholds, validation rules & policy RAG search.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-white px-3.5 py-2 shadow-sm">
            <Settings2 size={16} className="text-[#0F766E]" />
            <div className="text-xs font-bold text-[#0F766E]">{schemes.length} Active Scheme(s) Loaded</div>
          </div>
        </div>
      </div>

      {/* Section 1: Scheme Configuration Cards */}
      <SectionPanel title="Active Scheme Configuration">
        <div className="space-y-4">
          <label className="block max-w-md">
            <span className="field-label">Select Active Regulatory Scheme</span>
            <select
              className="w-full text-xs font-bold"
              value={schemeId}
              onChange={(event) => setSchemeId(event.target.value)}
            >
              <option value="">Default Scheme</option>
              {schemes.map((scheme) => (
                <option key={scheme.id} value={scheme.id}>
                  {scheme.name} ({scheme.code})
                </option>
              ))}
            </select>
          </label>

          {activeScheme && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-xl border border-[#CBD5E1] bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[#0F172A] text-sm">{activeScheme.name}</h3>
                  <span className="font-mono text-[10px] bg-teal-50 text-[#0F766E] border border-teal-200 px-2 py-0.5 rounded font-bold">
                    {activeScheme.code}
                  </span>
                </div>
                <p className="text-xs text-[#475569]">{activeScheme.description || "Environmental funding & clearance scheme."}</p>
                <div className="pt-2 text-[11px] font-semibold text-[#0F766E]">
                  ✓ {activeScheme.rules.length} Rule(s) Configured
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] space-y-1.5">
                <span className="field-label">Scheme Configuration Parameters</span>
                <pre className="max-h-28 overflow-auto text-[11px] font-mono text-[#0F172A]">
                  {JSON.stringify(activeScheme.configuration, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </SectionPanel>

      {/* Section 2: Interactive RAG Policy Console */}
      <SectionPanel title="Ask Scheme Knowledge Console (RAG Search)">
        <KnowledgeSearch initialQuery={activeScheme?.name || ""} />
      </SectionPanel>

      {/* Section 3: Rules Management Grid */}
      <SectionPanel title={`Active Rules Matrix (${activeScheme?.rules.length || 0})`}>
        <div className="grid gap-4 md:grid-cols-2">
          {activeScheme?.rules.map((rule) => (
            <article key={rule.id} className="panel p-4 space-y-3 border-[#CBD5E1]">
              <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-2">
                <div>
                  <h3 className="font-bold text-[#0F172A] text-xs flex items-center gap-1.5">
                    <ShieldCheck size={16} className="text-[#0F766E]" /> {rule.rule_name}
                  </h3>
                  <span className="text-[10px] text-slate-500 font-mono">Type: {rule.rule_type}</span>
                </div>
                <StatusBadge value={rule.active ? "ACTIVE" : "INACTIVE"} />
              </div>
              <div className="p-2.5 rounded-lg border border-slate-200 bg-[#F8FAFC] text-[11px] font-mono text-[#0F172A]">
                Condition: {JSON.stringify(rule.condition)}
              </div>
            </article>
          ))}
          {!activeScheme?.rules.length && (
            <div className="py-6 text-xs text-[#64748B] italic text-center col-span-2">
              No rules configured for this scheme.
            </div>
          )}
        </div>
      </SectionPanel>

      {/* Section 4: Add Rule Intake Form */}
      <SectionPanel title="Provision New Scheme Rule">
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="field-label">Rule Identifier</span>
              <input
                className="w-full text-xs"
                value={ruleId}
                onChange={(event) => setRuleId(event.target.value)}
                placeholder="MAX_TREE_COST"
              />
            </label>
            <label className="block">
              <span className="field-label">Condition Field Path</span>
              <input
                className="w-full text-xs"
                value={field}
                onChange={(event) => setField(event.target.value)}
                placeholder="financial.project_cost"
              />
            </label>
            <label className="block">
              <span className="field-label">Maximum Threshold (₹)</span>
              <input
                className="w-full text-xs"
                type="number"
                value={max}
                onChange={(event) => setMax(event.target.value)}
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button className="primary-button text-xs py-2 px-4" type="submit">
              <PlusCircle size={15} /> Provision Scheme Rule
            </button>
          </div>
        </form>
      </SectionPanel>
    </div>
  );
}
