// EvidenceList.tsx — Shows real evidence with actual source document names, document IDs, and evidence text.
// NEVER shows fake source labels. If source is unavailable → shows clearly as "Source Unavailable".

import { FileText, HelpCircle, Sparkles } from "lucide-react";
import type { EvidenceRead } from "../types/api";

export function EvidenceList({ evidence }: { evidence: EvidenceRead[] }) {
  if (!evidence.length) {
    return (
      <div className="py-4 text-center font-mono text-xs text-[#8B99A6]">
        NO EVIDENCE TRACES RECORDED FOR THIS CASE
      </div>
    );
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 items-stretch font-sans text-xs">
      {evidence.map((item) => {
        const formattedField = item.field_name
          ? item.field_name
              .split(".")
              .pop()
              ?.replaceAll("_", " ")
              .toUpperCase()
          : null;

        const formattedValue = formatExtractedValue(item.field_name, item.extracted_value);

        // Real source — never fake "System Baseline Rules"
        const sourceLabel =
          !item.source || item.source === "unavailable" || item.source === "unknown"
            ? null  // shown explicitly as unavailable below
            : item.source;

        // Real confidence — show 0% if actually 0, don't fake 100%
        const confValue = item.confidence != null ? Math.round(item.confidence * 100) : null;
        const confDisplay = confValue != null ? `${confValue}%` : "N/A";
        const confColor = confValue != null && confValue >= 70
          ? "text-[#3DDC84]"
          : confValue != null && confValue >= 40
          ? "text-[#E0A93D]"
          : "text-[#D9534F]";

        // KB document and chunk from metadata
        const meta = item.metadata_json as Record<string, unknown> | undefined;
        const kbDocument = meta?.knowledge_base_document as string | undefined;
        const kbChunk = meta?.knowledge_base_chunk as string | undefined;
        const evidenceText = meta?.evidence_text as string | undefined;
        const ruleId = meta?.rule_id as string | undefined;

        // Locator (page/section) — only show when actually present
        const locator = item.locator && item.locator !== "feature_contributions" ? item.locator : null;

        return (
          <article
            key={item.id}
            className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-2 font-mono text-xs flex flex-col justify-between"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-[#22303A] pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-[#131A21] border border-[#22303A] text-[#3DDC84] shrink-0">
                  <FileText size={14} />
                </div>
                <h3 className="font-bold text-[#E8EDF1] uppercase text-[11px] truncate">
                  {item.finding_type.replaceAll("_", " ")}
                </h3>
              </div>

              <span className={`font-mono text-[9px] font-bold ${confColor} bg-[#131A21] border border-[#22303A] px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shrink-0`}>
                <Sparkles size={10} />
                {confDisplay} CONF
              </span>
            </div>

            {/* Source document */}
            <div className="space-y-1 text-[10px]">
              {sourceLabel ? (
                <div className="text-[#8B99A6]">
                  SOURCE:{" "}
                  <span className="text-[#3DDC84] font-bold">{sourceLabel}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[#8B99A6]">
                  <HelpCircle size={10} className="text-[#8B99A6]" />
                  <span>SOURCE: <span className="text-[#D9534F]">UNAVAILABLE</span></span>
                </div>
              )}

              {/* Document ID when available */}
              {item.document_id && (
                <div className="text-[#8B99A6] truncate">
                  DOC ID:{" "}
                  <span className="text-[#E8EDF1] font-mono text-[9px]">{item.document_id.slice(0, 16)}…</span>
                </div>
              )}

              {/* Page/section only when actually present */}
              {locator && (
                <div className="text-[#8B99A6]">
                  LOCATION:{" "}
                  <span className="text-[#E8EDF1]">{locator}</span>
                </div>
              )}

              {/* Rule ID */}
              {ruleId && (
                <div className="text-[#8B99A6]">
                  RULE:{" "}
                  <span className="text-[#E0A93D] font-bold text-[9px]">{ruleId}</span>
                </div>
              )}
            </div>

            {/* Extracted value */}
            {formattedField && (
              <div className="rounded bg-[#131A21] border border-[#22303A] p-2 space-y-0.5 mt-1">
                <div className="text-[9px] text-[#8B99A6] font-bold uppercase tracking-wider">
                  FIELD: {formattedField}
                </div>
                <div className="font-mono text-xs font-bold text-[#3DDC84] truncate">
                  {formattedValue}
                </div>
              </div>
            )}

            {/* Knowledge base citation */}
            {(kbDocument || kbChunk) && (
              <div className="rounded bg-[#0d1117] border border-[#22303A] p-2 space-y-0.5 mt-1">
                <div className="text-[9px] text-[#8B99A6] font-bold uppercase tracking-wider">
                  KB CITATION
                </div>
                {kbDocument && (
                  <div className="text-[10px] text-[#C8D6E0] truncate">
                    📄 {kbDocument}
                  </div>
                )}
                {kbChunk && (
                  <div className="text-[9px] text-[#8B99A6]">
                    Chunk: {kbChunk}
                  </div>
                )}
              </div>
            )}

            {/* Evidence text snippet */}
            {evidenceText && (
              <div className="rounded bg-[#0d1117] border border-[#22303A] p-2 mt-1">
                <div className="text-[9px] text-[#8B99A6] font-bold uppercase tracking-wider mb-1">
                  EVIDENCE TEXT
                </div>
                <p className="text-[10px] text-[#8B99A6] font-sans leading-relaxed line-clamp-3">
                  "{evidenceText}"
                </p>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function formatExtractedValue(
  field: string | null | undefined,
  val: unknown
): string {
  const fieldLower = (field ?? "").toLowerCase();

  if (val == null || val === "None" || val === "null" || val === "") {
    return "NOT EXTRACTED";
  }

  const str = String(val);
  const num = Number(str);

  if (!isNaN(num)) {
    if (fieldLower.includes("cost") || fieldLower.includes("financial") || fieldLower.includes("amount")) {
      const lakhs = (num / 100000).toFixed(2);
      return `₹${num.toLocaleString("en-IN")} (₹${lakhs} Lakhs)`;
    }
    if (fieldLower.includes("duration") || fieldLower.includes("month")) {
      const yrs = (num / 12).toFixed(1);
      return `${num} Months (${yrs} Yrs)`;
    }
    return str;
  }

  return str.replaceAll("_", " ");
}
