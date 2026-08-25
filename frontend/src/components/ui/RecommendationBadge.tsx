// src/components/ui/RecommendationBadge.tsx
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

type RecValue = string | null | undefined;

export function RecommendationBadge({ value, large }: { value: RecValue; large?: boolean }) {
  const { t } = useTranslation();
  if (!value) return <span className="text-sm text-slate-400">—</span>;

  const REC_CONFIG: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    APPROVE:               { label: t("common.approved", "Approve"),                cls: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]", Icon: CheckCircle2 },
    APPROVED:              { label: t("common.approved", "Approved"),               cls: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]", Icon: CheckCircle2 },
    REJECT:                { label: t("common.rejected", "Reject"),                 cls: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]",          Icon: XCircle      },
    REJECTED:              { label: t("common.rejected", "Rejected"),               cls: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]",          Icon: XCircle      },
    REQUEST_CLARIFICATION: { label: t("common.clarification", "Clarification Required"), cls: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",       Icon: HelpCircle   },
    REVIEW_REQUIRED:       { label: t("common.clarification", "Review Required"),        cls: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",       Icon: HelpCircle   },
  };

  const cfg = REC_CONFIG[value.toUpperCase()] ?? {
    label: value.replaceAll("_", " "),
    cls: "border-[#CBD5E1] bg-[#F1F5F9] text-[#475569]",
    Icon: HelpCircle,
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

