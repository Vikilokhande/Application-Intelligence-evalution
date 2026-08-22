// Structural Idea: A forensic environmental policy & scheme governance console pairing live RAG policy query search on the left with human-readable scheme rule threshold management & provisioning on the right.

import type { FormEvent } from "react";
import { useState } from "react";
import {
  CheckSquare,
  Clock,
  FileText,
  PlusCircle,
  Settings2,
  ShieldCheck,
  Terminal,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { KnowledgeSearch } from "../components/KnowledgeSearch";
import type { SchemeRead } from "../types/api";

function getRuleTypeAccent(ruleType: string) {
  const type = (ruleType ?? "").toLowerCase();
  if (type.includes("max_value") || type.includes("cost") || type.includes("limit")) {
    return {
      border: "border-l-2 border-l-[#3DDC84]",
      badge: "text-[#3DDC84] bg-[#3DDC84]/10 border-[#3DDC84]/30",
      icon: <TrendingUp size={13} className="text-[#3DDC84] shrink-0" />,
    };
  }
  if (type.includes("duration") || type.includes("time")) {
    return {
      border: "border-l-2 border-l-[#F0A500]",
      badge: "text-[#F0A500] bg-[#F0A500]/10 border-[#F0A500]/30",
      icon: <Clock size={13} className="text-[#F0A500] shrink-0" />,
    };
  }
  if (type.includes("document")) {
    return {
      border: "border-l-2 border-l-[#6366F1]",
      badge: "text-[#6366F1] bg-[#6366F1]/10 border-[#6366F1]/30",
      icon: <FileText size={13} className="text-[#6366F1] shrink-0" />,
    };
  }
  if (type.includes("in_set") || type.includes("eligible")) {
    return {
      border: "border-l-2 border-l-[#06B6D4]",
      badge: "text-[#06B6D4] bg-[#06B6D4]/10 border-[#06B6D4]/30",
      icon: <CheckSquare size={13} className="text-[#06B6D4] shrink-0" />,
    };
  }
  return {
    border: "border-l-2 border-l-[#8B5CF6]",
    badge: "text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30",
    icon: <ShieldCheck size={13} className="text-[#8B5CF6] shrink-0" />,
  };
}

export function SchemeRules({
  schemes,
  onCreateRule,
  onDeleteRule,
}: {
  schemes: SchemeRead[];
  onCreateRule: (
    schemeId: string,
    payload: Record<string, unknown>
  ) => Promise<void>;
  onDeleteRule?: (schemeId: string, ruleId: string) => Promise<void>;
}) {
  const [schemeId, setSchemeId] = useState("");
  const [ruleId, setRuleId] = useState("MAX_TREE_COST");
  const [field, setField] = useState("financial.project_cost");
  const [max, setMax] = useState("5000000");

  const activeScheme =
    schemes.find((scheme) => scheme.id === (schemeId || schemes[0]?.id)) ??
    schemes[0];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!activeScheme) return;
    await onCreateRule(activeScheme.id, {
      rule_id: ruleId,
      rule_name: ruleId.replaceAll("_", " "),
      rule_type: "max_value",
      condition: { field, max: Number(max) },
      severity: "ERROR",
      active: true,
    });
  }

  return (
    <div className="relative flex flex-col gap-3 font-sans text-[#E8EDF1] max-w-[1400px] mx-auto pb-4">
      {/* Topographic Contour Background Layer Signature Motif */}
      <div
        className="pointer-events-none absolute -inset-4 z-0 overflow-hidden opacity-[0.08]"
        aria-hidden="true"
      >
        <svg
          className="h-full w-full"
          xmlns="http://www.w3.org/2000/svg"
          width="100%"
          height="100%"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
        >
          <path
            d="M 0,80 Q 250,40 500,110 T 1000,70 M 0,190 Q 300,150 600,220 T 1000,180 M 0,300 Q 200,270 500,330 T 1000,290"
            fill="none"
            stroke="#3DDC84"
            strokeWidth="1.5"
          />
          <path
            d="M 0,130 Q 350,170 700,110 T 1000,190 M 0,240 Q 200,280 500,230 T 1000,280 M 0,370 Q 450,400 800,350 T 1000,420"
            fill="none"
            stroke="#22303A"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* Governance Console Telemetry Header Strip */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84] shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase truncate">
                SCHEME RULES & RAG KNOWLEDGE GOVERNANCE CONSOLE
              </h1>
              <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px] shrink-0">
                POLICY CONSOLE
              </span>
            </div>
            <p className="text-xs text-[#8B99A6] mt-0.5 truncate">
              Directorate of Env. & Climate Change • Regulatory thresholds, validation rules & policy RAG search
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 rounded-[6px] text-[#3DDC84] shrink-0">
          <Settings2 size={14} className="text-[#3DDC84]" />
          <span>{schemes.length} ACTIVE SCHEME(S) LOADED</span>
        </div>
      </div>

      {/* Main 2-Column Governance Split View */}
      <div className="relative z-10 grid gap-3 lg:grid-cols-12 lg:items-start">
        {/* LEFT COLUMN (6 Cols): Scheme Config & Policy RAG Search */}
        <div className="lg:col-span-6 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#22303A] px-3.5 py-2.5 bg-[#0B0F14]/60 shrink-0">
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              1. REGULATORY SCHEME CONFIG & RAG SEARCH
            </h2>
            <span className="font-mono text-[10px] text-[#3DDC84]">POLICY ENGINE</span>
          </div>

          <div className="relative flex-1 min-h-0">
            <div
              className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)]"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(61,220,132,0.4) #22303A",
              }}
            >
              {/* Scheme Selector */}
              <label className="block">
                <span className="block font-mono text-[10px] font-bold text-[#8B99A6] uppercase tracking-wider mb-1">
                  SELECT ACTIVE REGULATORY SCHEME
                </span>
                <select
                  className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 font-mono text-xs text-[#E8EDF1] focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
                  value={schemeId}
                  onChange={(e) => setSchemeId(e.target.value)}
                >
                  <option value="">DEFAULT SCHEME</option>
                  {schemes.map((scheme) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name} ({scheme.code})
                    </option>
                  ))}
                </select>
              </label>

              {/* Active Scheme Config Card */}
              {activeScheme && (
                <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[#E8EDF1] uppercase">
                      {activeScheme.name}
                    </h3>
                    <span className="font-bold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded text-[10px]">
                      {activeScheme.code}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-[#8B99A6]">
                    {activeScheme.description || "Environmental funding & clearance scheme."}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#3DDC84]">
                    <ShieldCheck size={12} className="text-[#3DDC84]" />
                    {activeScheme.rules.length} RULE(S) CONFIGURABLE
                  </div>

                  {/* Human-Friendly Scheme Parameters Renderer */}
                  <div className="pt-2 border-t border-[#22303A]">
                    <HumanSchemeParameters
                      config={
                        activeScheme.configuration as Record<string, unknown>
                      }
                    />
                  </div>
                </div>
              )}

              {/* Interactive Policy RAG Search Section */}
              <div className="pt-2 border-t border-[#22303A] space-y-2">
                <div className="font-mono text-[10px] font-bold text-[#8B99A6] uppercase">
                  ASK SCHEME KNOWLEDGE BASE (RAG QUERY)
                </div>
                <KnowledgeSearch initialQuery={activeScheme?.name || ""} />
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#131A21] to-transparent z-10" />
          </div>
        </div>

        {/* RIGHT COLUMN (6 Cols): Active Rules Matrix */}
        <div className="lg:col-span-6 flex flex-col rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#22303A] px-3.5 py-2.5 bg-[#0B0F14]/60 shrink-0">
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              2. ACTIVE RULES MATRIX
            </h2>
            <span className="font-mono text-[10px] text-[#8B99A6]">
              RULES: {activeScheme?.rules.length || 0}
            </span>
          </div>

          <div className="relative flex-1 min-h-0">
            <div
              className="p-4 overflow-y-auto max-h-[calc(100vh-220px)]"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "rgba(61,220,132,0.4) #22303A",
              }}
            >
              <div className="space-y-2">
                <div className="font-mono text-[10px] font-bold text-[#8B99A6] uppercase mb-2">
                  ACTIVE CONFIGURABLE RULES
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 items-stretch">
                  {activeScheme?.rules.map((rule) => {
                    const accent = getRuleTypeAccent(rule.rule_type);
                    return (
                      <article
                        key={rule.id}
                        className={`rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-2 font-mono text-xs ${accent.border}`}
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-[#22303A] pb-1.5">
                          <div className="min-w-0">
                            <h3 className="font-bold text-[#E8EDF1] uppercase flex items-center gap-1.5 truncate">
                              {accent.icon}
                              <span className="truncate">{rule.rule_name}</span>
                            </h3>
                            <span className={`inline-block mt-1 text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase ${accent.badge}`}>
                              {rule.rule_type}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[9px] font-bold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-1.5 py-0.5 rounded uppercase">
                              {rule.active ? "ACTIVE" : "INACTIVE"}
                            </span>
                            {onDeleteRule && (
                              <button
                                type="button"
                                onClick={() => onDeleteRule(activeScheme.id, rule.id)}
                                className="flex h-5 w-5 items-center justify-center rounded border border-[#22303A] bg-[#0B0F14] text-[#8B99A6] hover:text-[#D9534F] hover:border-[#D9534F] transition-colors"
                                title="Delete rule"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Human-Friendly Policy Condition Renderer */}
                        <div className="p-2 rounded bg-[#131A21] border border-[#22303A]">
                          <HumanRuleCondition condition={rule.condition as Record<string, unknown>} />
                        </div>
                      </article>
                    );
                  })}

                  {!activeScheme?.rules.length && (
                    <div className="py-8 text-center font-mono text-xs text-[#8B99A6] col-span-2">
                      NO RULES CONFIGURED FOR THIS SCHEME
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[#131A21] to-transparent z-10" />
          </div>
        </div>
      </div>

      {/* FULL-WIDTH BOTTOM ROW: Provision New Scheme Rule Form */}
      <div className="relative z-10 rounded-[10px] border border-[#22303A] bg-[#131A21] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#22303A] px-4 py-2.5 bg-[#0B0F14]/60 shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
            <PlusCircle size={14} className="text-[#3DDC84]" />
            <span>3. PROVISION NEW SCHEME RULE</span>
          </div>
          <span className="font-mono text-[10px] text-[#8B99A6]">RULE PROVISIONING PANEL</span>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3 font-mono text-xs">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="block text-[10px] font-bold text-[#8B99A6] uppercase mb-1">
                RULE IDENTIFIER
              </span>
              <input
                className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84]"
                value={ruleId}
                onChange={(e) => setRuleId(e.target.value)}
                placeholder="MAX_TREE_COST"
              />
            </label>

            <label className="block">
              <span className="block text-[10px] font-bold text-[#8B99A6] uppercase mb-1">
                FIELD PATH
              </span>
              <input
                className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84]"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="financial.project_cost"
              />
            </label>

            <label className="block">
              <span className="block text-[10px] font-bold text-[#8B99A6] uppercase mb-1">
                MAX THRESHOLD (₹)
              </span>
              <input
                type="number"
                className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84]"
                value={max}
                onChange={(e) => setMax(e.target.value)}
              />
            </label>
          </div>

          <div className="flex justify-end pt-2 border-t border-[#22303A]">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-[6px] border border-[#3DDC84] bg-[#3DDC84] text-[#0B0F14] hover:bg-[#3DDC84]/90 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] transition-colors"
            >
              <PlusCircle size={14} />
              <span>PROVISION SCHEME RULE</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function HumanSchemeParameters({
  config,
}: {
  config: Record<string, unknown> | null | undefined;
}) {
  const [showJson, setShowJson] = useState(false);

  if (!config || Object.keys(config).length === 0) {
    return (
      <div className="text-[10px] text-[#8B99A6] italic font-sans">
        No scheme parameters configured.
      </div>
    );
  }

  return (
    <div className="space-y-1.5 font-sans">
      <div className="flex items-center justify-between font-mono text-[10px] text-[#8B99A6] uppercase font-bold">
        <span>SCHEME PARAMETERS</span>
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-[9px] text-[#3DDC84] hover:underline font-mono"
        >
          {showJson ? "HUMAN VIEW" : "JSON SPEC"}
        </button>
      </div>

      {showJson ? (
        <pre className="max-h-24 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden text-[10px] bg-[#131A21] p-2 rounded border border-[#22303A] text-[#E8EDF1] whitespace-pre-wrap break-all font-mono">
          {JSON.stringify(config, null, 2)}
        </pre>
      ) : (
        <div className="space-y-1 bg-[#131A21] p-2 rounded border border-[#22303A]">
          {Object.entries(config).map(([key, val]) => {
            const label = key
              .replaceAll("_", " ")
              .replaceAll(".", " ")
              .toUpperCase();
            const valueStr =
              typeof val === "object"
                ? JSON.stringify(val)
                : String(val).replaceAll("_", " ");

            return (
              <div
                key={key}
                className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono"
              >
                <span className="text-[#8B99A6] font-semibold text-[10px]">
                  {label}:
                </span>
                <span className="text-[#3DDC84] font-bold capitalize">
                  {valueStr}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HumanRuleCondition({
  condition,
}: {
  condition: Record<string, unknown>;
}) {
  const [showJson, setShowJson] = useState(false);

  if (!condition || Object.keys(condition).length === 0) {
    return (
      <div className="text-[10px] text-[#8B99A6] italic font-sans">
        No condition criteria specified.
      </div>
    );
  }

  // 1. Document Types Requirement
  if (Array.isArray(condition.document_types)) {
    const docs = condition.document_types as string[];
    return (
      <div className="space-y-1.5 text-[11px] font-sans">
        <div className="flex items-center justify-between font-mono text-[9px] text-[#8B99A6] uppercase tracking-wider">
          <span>REQUIRED DOCUMENTS</span>
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="text-[9px] text-[#3DDC84] hover:underline font-mono"
          >
            {showJson ? "HUMAN VIEW" : "JSON SPEC"}
          </button>
        </div>
        {showJson ? (
          <pre className="text-[9px] font-mono bg-[#0B0F14] p-1.5 rounded border border-[#22303A] text-[#E8EDF1] break-all whitespace-pre-wrap">
            {JSON.stringify(condition, null, 2)}
          </pre>
        ) : (
          <div className="flex flex-wrap gap-1">
            {docs.map((d) => (
              <span
                key={d}
                className="font-mono text-[9px] font-semibold px-2 py-0.5 rounded bg-[#0B0F14] border border-[#22303A] text-[#E8EDF1]"
              >
                {d.replaceAll("_", " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Field with Allowed Values
  if (condition.field && Array.isArray(condition.allowed_values)) {
    const fieldName =
      String(condition.field).split(".").pop()?.replaceAll("_", " ") ??
      String(condition.field);
    const allowed = condition.allowed_values as string[];
    return (
      <div className="space-y-1.5 text-[11px] font-sans">
        <div className="flex items-center justify-between font-mono text-[9px] text-[#8B99A6] uppercase tracking-wider">
          <span>ELIGIBLE {fieldName.toUpperCase()}</span>
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="text-[9px] text-[#3DDC84] hover:underline font-mono"
          >
            {showJson ? "HUMAN VIEW" : "JSON SPEC"}
          </button>
        </div>
        {showJson ? (
          <pre className="text-[9px] font-mono bg-[#0B0F14] p-1.5 rounded border border-[#22303A] text-[#E8EDF1] break-all whitespace-pre-wrap">
            {JSON.stringify(condition, null, 2)}
          </pre>
        ) : (
          <div className="flex flex-wrap gap-1">
            {allowed.map((val) => (
              <span
                key={val}
                className="font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#0B0F14] border border-[#3DDC84]/30 text-[#3DDC84]"
              >
                {val}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. Field with Max Threshold
  if (condition.field && condition.max != null) {
    const fieldPath = String(condition.field);
    const maxVal = Number(condition.max);
    const isCost =
      fieldPath.includes("cost") ||
      fieldPath.includes("financial") ||
      fieldPath.includes("amount");
    const isDuration =
      fieldPath.includes("duration") || fieldPath.includes("month");

    let formattedVal = `≤ ${maxVal}`;
    if (isCost) {
      const lakhs = (maxVal / 100000).toFixed(0);
      formattedVal = `≤ ₹${maxVal.toLocaleString("en-IN")} (₹${lakhs} Lakhs Max)`;
    } else if (isDuration) {
      formattedVal = `≤ ${maxVal} Months (${(maxVal / 12).toFixed(1)} Yrs Max)`;
    }

    return (
      <div className="space-y-1 text-[11px] font-sans">
        <div className="flex items-center justify-between font-mono text-[9px] text-[#8B99A6] uppercase tracking-wider">
          <span>
            {isCost
              ? "COST THRESHOLD"
              : isDuration
              ? "DURATION LIMIT"
              : "MAX THRESHOLD"}
          </span>
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            className="text-[9px] text-[#3DDC84] hover:underline font-mono"
          >
            {showJson ? "HUMAN VIEW" : "JSON SPEC"}
          </button>
        </div>
        {showJson ? (
          <pre className="text-[9px] font-mono bg-[#0B0F14] p-1.5 rounded border border-[#22303A] text-[#E8EDF1] break-all whitespace-pre-wrap">
            {JSON.stringify(condition, null, 2)}
          </pre>
        ) : (
          <div className="font-mono text-xs font-bold text-[#3DDC84] bg-[#0B0F14] p-1.5 rounded border border-[#22303A] truncate">
            {formattedVal}
          </div>
        )}
      </div>
    );
  }

  // Fallback — field present without allowed_values or max (e.g. required_field, enum check)
  const fieldName = condition.field
    ? String(condition.field).split(".").pop()?.replaceAll("_", " ").toUpperCase() ?? String(condition.field)
    : null;
  const ruleTypeFallback = condition.rule_type
    ? String(condition.rule_type).replaceAll("_", " ").toUpperCase()
    : "POLICY CRITERIA";
  const fieldValue = condition.value != null ? String(condition.value) : null;

  return (
    <div className="space-y-1.5 text-[11px] font-sans">
      <div className="flex items-center justify-between font-mono text-[9px] text-[#8B99A6] uppercase tracking-wider">
        <span>{ruleTypeFallback}</span>
        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="text-[9px] text-[#3DDC84] hover:underline font-mono"
        >
          {showJson ? "HUMAN VIEW" : "JSON SPEC"}
        </button>
      </div>
      {showJson ? (
        <pre className="text-[9px] font-mono bg-[#0B0F14] p-1.5 rounded border border-[#22303A] text-[#E8EDF1] break-all whitespace-pre-wrap">
          {JSON.stringify(condition, null, 2)}
        </pre>
      ) : (
        <div className="font-mono text-[10px] bg-[#0B0F14] p-1.5 rounded border border-[#22303A] space-y-0.5">
          {fieldName && (
            <div>
              <span className="text-[#8B99A6]">FIELD: </span>
              <span className="text-[#E8EDF1] font-bold">{fieldName}</span>
            </div>
          )}
          {fieldValue && (
            <div>
              <span className="text-[#8B99A6]">REQUIRED VALUE: </span>
              <span className="text-[#3DDC84] font-bold">{fieldValue}</span>
            </div>
          )}
          {!fieldName && !fieldValue && (
            <span className="text-[#3DDC84] font-bold">MUST BE PRESENT</span>
          )}
        </div>
      )}
    </div>
  );
}
