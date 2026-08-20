import type { LucideIcon } from "lucide-react";

export function MetricTile({
  icon: Icon,
  label,
  value,
  accent = "text-[#0F766E]"
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="panel p-5 hover:border-[#CBD5E1]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="field-label mb-1">{label}</div>
          <div className="text-2xl font-extrabold text-[#0F172A] font-mono tracking-tight">{value}</div>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] ${accent}`}>
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
