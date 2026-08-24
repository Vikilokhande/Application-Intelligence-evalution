// src/components/ui/RiskBadge.tsx
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

type RiskLevel = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" | string | null | undefined;

const RISK_CONFIG = {
  LOW_RISK:    { label: "Low Risk",    cls: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: ShieldCheck },
  MEDIUM_RISK: { label: "Medium Risk", cls: "border-amber-200 bg-amber-50 text-amber-800",       Icon: AlertTriangle },
  HIGH_RISK:   { label: "High Risk",   cls: "border-rose-200 bg-rose-50 text-rose-800",          Icon: ShieldAlert },
} as const;

export function RiskBadge({ value, large }: { value: RiskLevel; large?: boolean }) {
  if (!value) return <span className="text-sm text-slate-400">—</span>;

  const cfg = RISK_CONFIG[value as keyof typeof RISK_CONFIG] ?? {
    label: value.replaceAll("_", " "),
    cls: "border-slate-200 bg-slate-50 text-slate-600",
    Icon: Shield,
  };

  const { label, cls, Icon } = cfg;

  if (large) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 ${cls}`}>
        <Icon size={18} aria-hidden />
        <span className="text-base font-bold">{label}</span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <Icon size={12} aria-hidden />
      {label}
    </span>
  );
}
