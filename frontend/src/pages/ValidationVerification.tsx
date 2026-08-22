// ValidationVerification.tsx — Forensic cross-document validation & rule audit matrix.
// Shows: required docs · field validation · RAG knowledge evidence · cross-doc consistency · rule grid.
// NOT_VERIFIABLE (amber) = evidence missing. NOT_CHECKED (grey) = deliberately skipped.

import { useState, useMemo } from "react";
import {
  AlertTriangle, BookOpen, CheckCircle2, FileText,
  HelpCircle, Info, ShieldCheck, Terminal, XCircle
} from "lucide-react";
import { ContradictionMatrix } from "../components/ContradictionMatrix";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import type { ApplicationDetail, EvidenceRead, ValidationResult } from "../types/api";

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  if (status === "PASS") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded uppercase">
      <CheckCircle2 size={10} /> PASS
    </span>
  );
  if (status === "FAIL") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#D9534F] bg-[#D9534F]/10 border border-[#D9534F]/40 px-2 py-0.5 rounded uppercase">
      <XCircle size={10} /> FAIL
    </span>
  );
  if (status === "WARN") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#E0A93D] bg-[#E0A93D]/10 border border-[#E0A93D]/40 px-2 py-0.5 rounded uppercase">
      <AlertTriangle size={10} /> WARN
    </span>
  );
  if (status === "NOT_VERIFIABLE") return (
    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[#E0A93D] bg-[#E0A93D]/10 border border-[#E0A93D]/40 px-2 py-0.5 rounded uppercase">
      <HelpCircle size={10} /> NOT VERIFIABLE
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#8B99A6] bg-[#0B0F14] border border-[#22303A] px-2 py-0.5 rounded uppercase">
      <Info size={10} /> {status}
    </span>
  );
}

// ── Validation summary stats ─────────────────────────────────────────────────

function ValidationStats({ results }: { results: ValidationResult[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { PASS: 0, FAIL: 0, WARN: 0, NOT_VERIFIABLE: 0, NOT_CHECKED: 0 };
    for (const r of results) {
      if (r.status in c) c[r.status]++;
      else c[r.status] = (c[r.status] || 0) + 1;
    }
    return c;
  }, [results]);

  const pairs: [string, string, string][] = [
    ["PASS", `${counts.PASS}`, "text-[#3DDC84]"],
    ["FAIL", `${counts.FAIL}`, "text-[#D9534F]"],
    ["WARN", `${counts.WARN}`, "text-[#E0A93D]"],
    ["NOT VERIFIABLE", `${counts.NOT_VERIFIABLE}`, "text-[#E0A93D]"],
    ["NOT CHECKED", `${counts.NOT_CHECKED}`, "text-[#8B99A6]"],
  ];

  return (
    <div className="flex flex-wrap gap-3 font-mono text-xs">
      {pairs.map(([label, val, cls]) => (
        <div key={label} className="flex items-center gap-1.5 border border-[#22303A] bg-[#0B0F14] rounded px-2 py-1">
          <span className="text-[#8B99A6] text-[9px] uppercase">{label}:</span>
          <span className={`font-bold ${cls}`}>{val}</span>
        </div>
      ))}
    </div>
  );
}

// ── Required Document Check Panel ────────────────────────────────────────────

function RequiredDocPanel({ results }: { results: ValidationResult[] }) {
  const reqDoc = results.find(r => r.validation_type === "REQUIRED_DOCUMENT");
  if (!reqDoc) return null;

  const ev = reqDoc.evidence as Record<string, unknown>;
  const required = (ev.required as string[] | undefined) ?? [];
  const present = (ev.present as string[] | undefined) ?? [];
  const missing = (ev.missing as string[] | undefined) ?? [];
  const configMissing = ev.configuration_missing as boolean | undefined;

  return (
    <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-[#E8EDF1] uppercase">
          <FileText size={12} className="text-[#3DDC84]" />
          REQUIRED DOCUMENTS
        </div>
        <StatusPill status={reqDoc.status} />
      </div>
      <p className="text-[11px] text-[#8B99A6] font-sans">{reqDoc.message}</p>
      {configMissing && (
        <p className="text-[10px] text-[#E0A93D] italic">
          No active required-document rule configured for this scheme.
        </p>
      )}
      {required.length > 0 && (
        <div className="grid grid-cols-2 gap-1 mt-1">
          {required.map((doc) => {
            const isPresent = present.includes(doc);
            return (
              <div key={doc} className={`flex items-center gap-1.5 text-[10px] font-mono rounded px-2 py-1 border ${
                isPresent
                  ? "border-[#3DDC84]/30 bg-[#3DDC84]/5 text-[#3DDC84]"
                  : "border-[#D9534F]/40 bg-[#D9534F]/10 text-[#D9534F]"
              }`}>
                {isPresent ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                {doc}
              </div>
            );
          })}
        </div>
      )}
      {missing.length > 0 && (
        <div className="text-[10px] text-[#D9534F] font-mono flex items-center gap-1">
          <AlertTriangle size={10} />
          Missing: {missing.join(", ")}
        </div>
      )}
    </div>
  );
}

// ── Field Validation Panel ────────────────────────────────────────────────────

function FieldValidationPanel({ results }: { results: ValidationResult[] }) {
  const fieldTypes = ["REQUIRED_FIELD", "DATA_RANGE", "BUSINESS_RULE_PRECHECK", "FIELD_VALIDATION"];
  const fieldResults = results.filter(r => fieldTypes.some(t => r.validation_type.startsWith(t)));
  if (!fieldResults.length) return null;

  return (
    <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-2">
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-[#E8EDF1] uppercase">
        <ShieldCheck size={12} className="text-[#3DDC84]" />
        FIELD VALIDATION ({fieldResults.length})
      </div>
      <div className="space-y-1.5">
        {fieldResults.map(r => {
          const ev = r.evidence as Record<string, unknown>;
          const field = ev.field as string | undefined;
          const actual = ev.actual as unknown;
          const isFail = r.status === "FAIL";
          return (
            <div key={r.id} className={`flex items-start gap-2 rounded p-1.5 border text-[10px] font-mono ${
              isFail ? "border-[#D9534F]/40 bg-[#D9534F]/5" : "border-[#22303A] bg-[#131A21]"
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#C8D6E0] truncate">{field ?? r.validation_type.replaceAll("_", " ")}</span>
                  <StatusPill status={r.status} />
                </div>
                <div className="text-[#8B99A6] font-sans text-[9px] mt-0.5">{r.message}</div>
                {actual != null && (
                  <div className="text-[9px] text-[#8B99A6] mt-0.5">
                    actual: <span className="text-[#E8EDF1]">{String(actual)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── RAG Knowledge Evidence Panel ──────────────────────────────────────────────

function RAGEvidencePanel({ results }: { results: ValidationResult[] }) {
  const RAG_TYPES = [
    "RAG_PROJECT_COST_LIMIT", "RAG_PROJECT_DURATION_LIMIT",
    "RAG_ORGANIZATION_ELIGIBILITY", "RAG_PROJECT_CATEGORY_ELIGIBILITY",
    "RAG_REQUIRED_DOCUMENTS", "SCHEME_KNOWLEDGE_RETRIEVAL",
  ];
  const ragResults = results.filter(r => RAG_TYPES.includes(r.validation_type));
  if (!ragResults.length) return null;

  return (
    <div className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-2">
      <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-[#E8EDF1] uppercase">
        <BookOpen size={12} className="text-[#3DDC84]" />
        RAG / SCHEME KNOWLEDGE EVIDENCE ({ragResults.length})
      </div>
      <div className="space-y-2">
        {ragResults.map(r => {
          const ev = r.evidence as Record<string, unknown>;
          const kbDoc = ev.knowledge_base_document as string | undefined;
          const kbChunk = ev.knowledge_base_chunk as string | undefined;
          const evidenceText = ev.evidence_text as string | undefined;
          const ruleId = ev.rule_id as string | undefined;
          const guideline = ev.extracted_guideline as Record<string, unknown> | undefined;

          return (
            <div key={r.id} className={`rounded border p-2 space-y-1.5 text-[10px] ${
              r.status === "NOT_VERIFIABLE"
                ? "border-[#E0A93D]/40 bg-[#E0A93D]/5"
                : r.status === "FAIL"
                ? "border-[#D9534F]/40 bg-[#D9534F]/5"
                : r.status === "PASS"
                ? "border-[#3DDC84]/20 bg-[#3DDC84]/5"
                : "border-[#22303A] bg-[#131A21]"
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-[#E8EDF1] text-[9px] uppercase">
                  {(ruleId ?? r.validation_type).replaceAll("_", " ")}
                </span>
                <StatusPill status={r.status} />
              </div>

              <p className="text-[#8B99A6] font-sans text-[9px] leading-relaxed">{r.message}</p>

              {/* KB Citation */}
              {kbDoc ? (
                <div className="rounded bg-[#0B0F14] border border-[#22303A] p-1.5 space-y-1">
                  <div className="flex items-center gap-1 text-[#3DDC84] text-[9px] font-bold">
                    <BookOpen size={9} /> {kbDoc}
                  </div>
                  {kbChunk && (
                    <div className="text-[8px] text-[#8B99A6]">Chunk: {kbChunk}</div>
                  )}
                  {guideline && (
                    <div className="text-[8px] text-[#E0A93D]">
                      Guideline: {JSON.stringify(guideline)}
                    </div>
                  )}
                  {evidenceText && (
                    <p className="text-[9px] text-[#8B99A6] italic font-sans leading-relaxed line-clamp-3 border-t border-[#22303A] pt-1 mt-0.5">
                      "{evidenceText}"
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[8px] text-[#8B99A6] italic">
                  <HelpCircle size={9} />
                  Knowledge base document not available for this check
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function ValidationVerification({
  detail,
}: {
  detail: ApplicationDetail | null;
}) {
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceRead | null>(null);

  if (!detail) {
    return (
      <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-8 text-center font-mono text-xs text-[#8B99A6]">
        NO CASE SELECTED. SELECT AN APPLICATION FROM THE{" "}
        <span className="text-[#3DDC84]">DASHBOARD</span> TO INSPECT VALIDATION CHECKS.
      </div>
    );
  }

  const allValidations = detail.validation_results ?? [];

  return (
    <div className="relative flex flex-col gap-3 font-sans text-[#E8EDF1] max-w-[1400px] mx-auto pb-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -inset-4 z-0 overflow-hidden opacity-[0.08]" aria-hidden="true">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 1000 600" preserveAspectRatio="none">
          <path d="M 0,80 Q 250,40 500,110 T 1000,70 M 0,190 Q 300,150 600,220 T 1000,180 M 0,300 Q 200,270 500,330 T 1000,290" fill="none" stroke="#3DDC84" strokeWidth="1.5" />
          <path d="M 0,130 Q 350,170 700,110 T 1000,190 M 0,240 Q 200,280 500,230 T 1000,280" fill="none" stroke="#22303A" strokeWidth="2" />
        </svg>
      </div>

      {/* Header */}
      <div className="relative z-10 shrink-0 rounded-[10px] border border-[#22303A] bg-[#131A21] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#22303A] bg-[#0B0F14] text-[#3DDC84] shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-mono text-sm font-bold tracking-wider text-[#E8EDF1] uppercase truncate">
                CROSS-DOCUMENT VALIDATION & RULE VERIFICATION
              </h1>
              <span className="font-mono text-[10px] font-semibold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-2 py-0.5 rounded-[4px] shrink-0">
                AUDIT MATRIX ACTIVE
              </span>
            </div>
            <p className="text-xs text-[#8B99A6] mt-0.5 truncate">
              Automated document consistency audit for:{" "}
              <strong className="text-[#E8EDF1]">{detail.project_title ?? "Selected Case"}</strong>
            </p>
          </div>
        </div>
        <div className="font-mono text-xs border border-[#22303A] bg-[#0B0F14] px-3 py-1.5 rounded-[6px] text-[#3DDC84] uppercase">
          STATUS: {detail.status.replaceAll("_", " ")}
        </div>
      </div>

      {/* Validation summary counters */}
      <div className="relative z-10 shrink-0">
        <ValidationStats results={allValidations} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 space-y-3">

        {/* Section 1: Required Documents + Field Validation + RAG (3-col grid) */}
        <div className="grid gap-3 lg:grid-cols-3">
          <RequiredDocPanel results={allValidations} />
          <FieldValidationPanel results={allValidations} />
          <RAGEvidencePanel results={allValidations} />
        </div>

        {/* Section 2: Cross-Document Contradiction Matrix */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#22303A] pb-2 mb-2">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#E8EDF1] uppercase">
              <ShieldCheck size={14} className="text-[#3DDC84]" />
              CROSS-DOCUMENT CONTRADICTION MATRIX
            </div>
            <span className="font-mono text-[10px] text-[#8B99A6]">
              CHECKS: {allValidations.length}
            </span>
          </div>
          <div
            className="max-h-[340px] overflow-y-auto"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(61,220,132,0.4) #22303A" }}
          >
            <ContradictionMatrix
              validationResults={allValidations}
              evidenceList={detail.evidence}
              onInspectEvidence={(item) => setSelectedEvidence(item)}
            />
          </div>
        </div>

        {/* Section 3: Scheme Rule Verification Grid */}
        <div className="rounded-[10px] border border-[#22303A] bg-[#131A21] p-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-[#22303A] pb-2 mb-2 shrink-0">
            <h2 className="font-mono text-xs font-bold text-[#E8EDF1] uppercase tracking-wider">
              SCHEME RULE VERIFICATION GRID ({detail.rule_results.length})
            </h2>
            <span className="font-mono text-[10px] text-[#3DDC84]">POLICY MATRIX</span>
          </div>

          <div
            className="overflow-y-auto max-h-[350px] grid gap-2 sm:grid-cols-2"
            style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(61,220,132,0.4) #22303A" }}
          >
            {detail.rule_results.map((item) => {
              const isFail = item.result === "FAIL";
              const isWarn = item.result === "WARN";
              return (
                <article
                  key={item.id}
                  className={`rounded-[6px] border p-3 space-y-2 font-mono text-xs ${
                    isFail
                      ? "border-[#D9534F] bg-[#D9534F]/10 text-[#E8EDF1]"
                      : isWarn
                      ? "border-[#E0A93D]/40 bg-[#E0A93D]/5 text-[#E8EDF1]"
                      : "border-[#22303A] bg-[#0B0F14] text-[#E8EDF1]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-[#22303A] pb-1.5">
                    <div>
                      <div className="font-bold text-[#E8EDF1] uppercase flex items-center gap-1.5 text-[11px]">
                        <ShieldCheck size={12} className="text-[#3DDC84] shrink-0" />
                        <span className="truncate max-w-[140px]">{item.rule_name || item.rule_id}</span>
                      </div>
                      <span className="text-[9px] text-[#8B99A6]">
                        {item.rule_id} · {item.severity}
                      </span>
                    </div>
                    <span className={`font-bold px-1.5 py-0.5 rounded text-[9px] uppercase shrink-0 ${
                      isFail
                        ? "bg-[#D9534F] text-[#0B0F14]"
                        : isWarn
                        ? "bg-[#E0A93D] text-[#0B0F14]"
                        : "bg-[#3DDC84] text-[#0B0F14]"
                    }`}>
                      {item.result}
                    </span>
                  </div>

                  <p className="font-sans text-[11px] text-[#8B99A6] leading-relaxed">{item.reason}</p>

                  <div className="grid gap-1 text-[10px] bg-[#131A21] p-2 rounded border border-[#22303A]">
                    <div>
                      EXPECTED:{" "}
                      <span className="font-bold text-[#3DDC84]">
                        {JSON.stringify(item.expected_value)}
                      </span>
                    </div>
                    <div>
                      ACTUAL:{" "}
                      <span className={`font-bold ${isFail ? "text-[#D9534F]" : "text-[#E8EDF1]"}`}>
                        {JSON.stringify(item.actual_value)}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}

            {!detail.rule_results.length && (
              <div className="py-6 text-center font-mono text-xs text-[#8B99A6] col-span-2">
                NO RULE VERIFICATION RESULTS RECORDED
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-over Evidence Drawer */}
      <EvidenceDrawer
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
}
