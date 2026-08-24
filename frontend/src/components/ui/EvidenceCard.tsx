// src/components/ui/EvidenceCard.tsx
// Displays RAG evidence in a human-readable format with drawer on "View source".
// Never fabricates source, page, chunk, or confidence values.
import { useState } from "react";
import { BookOpen, CheckCircle2, ExternalLink, HelpCircle, XCircle } from "lucide-react";
import type { EvidenceRead } from "../../types/api";
import { EvidenceDrawer } from "./EvidenceDrawer";

function resultIcon(result: string | undefined) {
  if (!result) return null;
  const r = result.toUpperCase();
  if (r === "PASS")                     return <CheckCircle2 size={13} className="text-emerald-600" />;
  if (r === "FAIL")                     return <XCircle size={13} className="text-rose-600" />;
  if (r.includes("NOT") || r === "WARN") return <HelpCircle size={13} className="text-amber-600" />;
  return null;
}

function resultLabel(result: string | undefined): string {
  if (!result) return "";
  const map: Record<string, string> = {
    PASS:           "Passed",
    FAIL:           "Failed",
    WARN:           "Attention Required",
    NOT_VERIFIABLE: "Could not verify",
  };
  return map[result.toUpperCase()] ?? result.replaceAll("_", " ");
}

export function EvidenceCard({ item }: { item: EvidenceRead }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const meta = item.metadata_json as Record<string, unknown> | undefined;

  // Only display values that actually exist — never fabricate
  const evidenceText  = meta?.evidence_text   as string | undefined;
  const kbDocument    = meta?.knowledge_base_document as string | undefined;
  const resultVal     = (meta?.result ?? meta?.decision) as string | undefined;
  const appValue      = item.extracted_value;
  const expectedVal   = meta?.expected_value as unknown;

  // Source label — only real values
  const sourceLabel =
    !item.source || item.source === "unavailable" || item.source === "unknown"
      ? (kbDocument ?? null)
      : item.source;

  const resultCls =
    resultVal?.toUpperCase() === "PASS"           ? "border-emerald-200 bg-emerald-50" :
    resultVal?.toUpperCase() === "FAIL"           ? "border-rose-200 bg-rose-50"       :
    resultVal?.toUpperCase().includes("NOT") ||
    resultVal?.toUpperCase() === "WARN"           ? "border-amber-200 bg-amber-50"     :
                                                    "border-slate-200 bg-white";

  return (
    <>
      <div className={`rounded-xl border shadow-sm overflow-hidden transition-shadow hover:shadow-md ${resultCls}`}>
        <div className="p-4 space-y-3">
          {/* Source */}
          <div className="flex items-start gap-2">
            <BookOpen size={14} className="text-teal-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Source</p>
              <p className="text-sm font-semibold text-slate-800">
                {sourceLabel ?? <span className="italic text-slate-400 font-normal">Source not available</span>}
              </p>
            </div>
          </div>

          {/* Evidence text */}
          {evidenceText && (
            <blockquote className="text-sm text-slate-700 italic leading-relaxed border-l-2 border-teal-300 pl-3">
              "{evidenceText}"
            </blockquote>
          )}

          {/* Application value vs expected */}
          {(appValue || Boolean(expectedVal)) && (
            <div className="grid grid-cols-2 gap-2">
              {appValue && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Application</p>
                  <p className="text-xs text-slate-700 font-medium">{appValue}</p>
                </div>
              )}
              {Boolean(expectedVal) && (
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expected</p>
                  <p className="text-xs text-slate-700 font-medium">{String(expectedVal)}</p>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {resultVal && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {resultIcon(resultVal)}
                <span className="text-sm font-semibold text-slate-700">{resultLabel(resultVal)}</span>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition"
              >
                <ExternalLink size={11} /> View source
              </button>
            </div>
          )}

          {/* View source link if no result */}
          {!resultVal && (evidenceText || sourceLabel) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition"
              >
                <ExternalLink size={11} /> View source
              </button>
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <EvidenceDrawer item={item} onClose={() => setDrawerOpen(false)} />
      )}
    </>
  );
}
