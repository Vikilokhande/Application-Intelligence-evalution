// src/components/ui/SummaryCard.tsx
import type { ReactNode } from "react";

export function SummaryCard({
  title,
  badge,
  children,
  footer,
  noPad,
}: {
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  noPad?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {badge}
      </div>
      <div className={noPad ? "" : "p-5"}>{children}</div>
      {footer && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">{footer}</div>
      )}
    </div>
  );
}

/** Field row inside SummaryCard */
export function FieldRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide sm:w-36 shrink-0">
        {label}
      </span>
      <span className="text-sm text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

/** Badge showing a count */
export function CountBadge({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
      {count}
    </span>
  );
}
