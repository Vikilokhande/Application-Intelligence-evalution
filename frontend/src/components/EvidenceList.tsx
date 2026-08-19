import { FileText } from "lucide-react";
import type { EvidenceRead } from "../types/api";

export function EvidenceList({ evidence }: { evidence: EvidenceRead[] }) {
  if (!evidence.length) {
    return <div className="text-sm text-slate-500">No evidence has been generated for the selected application.</div>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {evidence.map((item) => (
        <article key={item.id} className="rounded-md border border-line bg-field p-3">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 text-cobalt" size={18} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-ink">{item.finding_type.replaceAll("_", " ")}</h3>
                <span className="text-xs text-slate-500">{Math.round(item.confidence * 100)}%</span>
              </div>
              <p className="mt-1 truncate text-sm text-slate-600">{item.source}</p>
              <p className="mt-1 text-xs text-slate-500">{item.locator ?? "source locator pending"}</p>
              {item.field_name && (
                <p className="mt-2 text-sm">
                  <span className="font-medium">{item.field_name}:</span> {item.extracted_value}
                </p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

