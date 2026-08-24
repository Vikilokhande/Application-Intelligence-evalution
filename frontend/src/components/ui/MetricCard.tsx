// src/components/ui/MetricCard.tsx
import type { ReactNode } from "react";

export function MetricCard({
  label,
  value,
  sub,
  icon,
  accent = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  icon?: ReactNode;
  accent?: "default" | "amber" | "green" | "red" | "blue";
}) {
  const iconBg = {
    default: "bg-slate-100 text-slate-500",
    amber:   "bg-amber-50 text-amber-600",
    green:   "bg-emerald-50 text-emerald-600",
    red:     "bg-rose-50 text-rose-600",
    blue:    "bg-sky-50 text-sky-600",
  }[accent];

  const valueColor = {
    default: "text-slate-900",
    amber:   "text-amber-700",
    green:   "text-emerald-700",
    red:     "text-rose-700",
    blue:    "text-sky-700",
  }[accent];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {icon && (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          {icon}
        </div>
      )}
    </div>
  );
}
