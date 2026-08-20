import { FileText, Sparkles } from "lucide-react";
import type { EvidenceRead } from "../types/api";

export function EvidenceList({ evidence }: { evidence: EvidenceRead[] }) {
  if (!evidence.length) {
    return <div className="text-xs text-[#64748B] italic p-2">No evidence traces recorded for this application.</div>;
  }

  return (
    <div className="grid gap-3.5 md:grid-cols-2">
      {evidence.map((item) => (
        <article key={item.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 transition-all hover:border-[#CBD5E1] shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
              <FileText size={18} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wide">{item.finding_type.replaceAll("_", " ")}</h3>
                <span className="inline-flex items-center gap-1 rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                  <Sparkles size={10} /> {Math.round(item.confidence * 100)}% confidence
                </span>
              </div>
              <p className="mt-1.5 truncate text-xs text-[#475569] font-mono">{item.source}</p>
              <p className="mt-0.5 text-[11px] text-[#64748B]">{item.locator ?? "Locator pending"}</p>
              {item.field_name && (
                <div className="mt-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs">
                  <span className="font-semibold text-sky-800">{item.field_name}:</span>{" "}
                  <span className="text-[#0F172A] font-mono">{item.extracted_value}</span>
                </div>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
