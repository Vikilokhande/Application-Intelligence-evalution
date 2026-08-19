import type { FormEvent } from "react";
import { useState } from "react";
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
  const activeScheme = schemes.find((scheme) => scheme.id === (schemeId || schemes[0]?.id));

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
    <div className="space-y-4">
      <SectionPanel title="Scheme Knowledge">
        <select className="w-full rounded-md border border-line px-3 py-2 md:w-96" value={schemeId} onChange={(event) => setSchemeId(event.target.value)}>
          <option value="">Default scheme</option>
          {schemes.map((scheme) => (
            <option key={scheme.id} value={scheme.id}>
              {scheme.name}
            </option>
          ))}
        </select>
        {activeScheme && <p className="mt-3 text-sm text-slate-600">{activeScheme.description}</p>}
      </SectionPanel>

      <SectionPanel title="Rules">
        <div className="grid gap-3 lg:grid-cols-2">
          {activeScheme?.rules.map((rule) => (
            <article className="rounded-md border border-line bg-field p-3" key={rule.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">{rule.rule_name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{rule.rule_type}</p>
                </div>
                <StatusBadge value={rule.active ? "ACTIVE" : "INACTIVE"} />
              </div>
              <code className="mt-3 block text-xs text-slate-600">{JSON.stringify(rule.condition)}</code>
            </article>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel title="Add Rule">
        <form className="grid gap-3 md:grid-cols-4" onSubmit={submit}>
          <input className="rounded-md border border-line px-3 py-2" value={ruleId} onChange={(event) => setRuleId(event.target.value)} />
          <input className="rounded-md border border-line px-3 py-2" value={field} onChange={(event) => setField(event.target.value)} />
          <input className="rounded-md border border-line px-3 py-2" type="number" value={max} onChange={(event) => setMax(event.target.value)} />
          <button className="primary-button" type="submit">
            Add Rule
          </button>
        </form>
      </SectionPanel>
    </div>
  );
}

