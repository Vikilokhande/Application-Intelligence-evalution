// src/components/ui/RiskBadge.tsx
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

type RiskLevel = "LOW_RISK" | "MEDIUM_RISK" | "HIGH_RISK" | string | null | undefined;

export function RiskBadge({ value, large }: { value: RiskLevel; large?: boolean }) {
  const { t } = useTranslation();
  if (!value) return <span className="text-sm text-slate-400">—</span>;

  const RISK_CONFIG = {
    LOW_RISK:    { label: t("dashboard.priority_low", "Low Risk"),    cls: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]", Icon: ShieldCheck },
    MEDIUM_RISK: { label: t("dashboard.priority_medium", "Medium Risk"), cls: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",       Icon: AlertTriangle },
    HIGH_RISK:   { label: t("dashboard.priority_high", "High Risk"),   cls: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]",          Icon: ShieldAlert },
  } as const;

  const cfg = RISK_CONFIG[value as keyof typeof RISK_CONFIG] ?? {
    label: value.replaceAll("_", " "),
    cls: "border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]",
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

