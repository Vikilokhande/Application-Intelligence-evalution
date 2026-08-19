import type { LucideIcon } from "lucide-react";

export function MetricTile({
  icon: Icon,
  label,
  value,
  accent = "text-pine"
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-field ${accent}`}>
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

