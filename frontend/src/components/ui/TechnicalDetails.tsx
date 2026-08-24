// src/components/ui/TechnicalDetails.tsx
// Progressive disclosure container for L3 technical information.
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export function TechnicalDetails({
  label = "View technical details",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-slate-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 select-none">
        <span>{label}</span>
        <ChevronDown
          size={14}
          className="transition-transform group-open:rotate-180 text-slate-400"
          aria-hidden
        />
      </summary>
      <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-600 space-y-2">
        {children}
      </div>
    </details>
  );
}

/** A key-value row inside TechnicalDetails */
export function TechRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="shrink-0 w-36 font-medium text-slate-500">{label}</span>
      <span className="break-all font-mono text-[11px] text-slate-700">{value ?? "—"}</span>
    </div>
  );
}
