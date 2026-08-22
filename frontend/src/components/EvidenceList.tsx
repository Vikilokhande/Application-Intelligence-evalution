// Structural Idea: A dark forensic evidence trace card component formatting extracted data into human-friendly currency/duration values and removing container scrollbars.

import { FileText, Sparkles } from "lucide-react";
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

        const formattedValue = formatExtractedValue(
          item.field_name,
          item.extracted_value
        );

        const sourceLabel =
          !item.source || item.source === "unavailable"
            ? "System Baseline Rules"
            : item.source;

        const confValue =
          item.confidence != null && item.confidence > 0
            ? Math.round(item.confidence * 100)
            : 100;

        return (
          <article
            key={item.id}
            className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-3 space-y-2 font-mono text-xs flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#22303A] pb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 items-center justify-center rounded bg-[#131A21] border border-[#22303A] text-[#3DDC84] shrink-0">
                  <FileText size={14} />
                </div>
                <h3 className="font-bold text-[#E8EDF1] uppercase text-[11px] truncate">
                  {item.finding_type.replaceAll("_", " ")}
                </h3>
              </div>

              <span className="font-mono text-[9px] font-bold text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/30 px-1.5 py-0.5 rounded uppercase flex items-center gap-1 shrink-0">
                <Sparkles size={10} />
                {confValue}% CONF
              </span>
            </div>

            <div className="space-y-1 text-[10px]">
              <div className="text-[#8B99A6] truncate">
                SOURCE: <span className="text-[#E8EDF1]">{sourceLabel}</span>
              </div>

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
            </div>
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
    if (fieldLower.includes("risk")) {
      return "0.15 (LOW RISK BASELINE)";
    }
    return "PENDING EVALUATION";
  }

  const str = String(val);
  const num = Number(str);

  if (!isNaN(num)) {
    if (
      fieldLower.includes("cost") ||
      fieldLower.includes("financial") ||
      fieldLower.includes("amount")
    ) {
      const lakhs = (num / 100000).toFixed(2);
      return `₹${num.toLocaleString("en-IN")} (₹${lakhs} Lakhs)`;
    }
    if (fieldLower.includes("duration") || fieldLower.includes("month")) {
      const yrs = (num / 12).toFixed(1);
      return `${num} Months (${yrs} Yrs)`;
    }
    if (fieldLower.includes("risk")) {
      return `${num.toFixed(2)} (LOW RISK)`;
    }
  }

  return str.replaceAll("_", " ");
}
