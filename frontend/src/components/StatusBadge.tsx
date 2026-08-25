import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Clock, Info } from "lucide-react";

const toneByStatus: Record<string, { tone: string; icon: typeof CheckCircle2 }> = {
  PASS: { tone: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]", icon: CheckCircle2 },
  SUCCESS: { tone: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]", icon: CheckCircle2 },
  APPROVE: { tone: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]", icon: CheckCircle2 },
  APPROVED: { tone: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]", icon: CheckCircle2 },
  LOW_RISK: { tone: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]", icon: CheckCircle2 },
  HUMAN_DECISION_RECORDED: { tone: "border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]", icon: CheckCircle2 },

  WARN: { tone: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]", icon: AlertTriangle },
  WARNING: { tone: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]", icon: AlertTriangle },
  MEDIUM_RISK: { tone: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]", icon: AlertTriangle },
  REQUEST_CLARIFICATION: { tone: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]", icon: AlertTriangle },
  CLARIFICATION_REQUESTED: { tone: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]", icon: AlertTriangle },

  FAIL: { tone: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]", icon: AlertCircle },
  ERROR: { tone: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]", icon: AlertCircle },
  PROCESSING_FAILED: { tone: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]", icon: AlertCircle },
  HIGH_RISK: { tone: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]", icon: AlertCircle },
  REJECT: { tone: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]", icon: AlertCircle },
  REJECTED: { tone: "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]", icon: AlertCircle },

  AWAITING_HUMAN_REVIEW: { tone: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]", icon: Clock },
  PROCESSING: { tone: "border-[#0A2540]/20 bg-[#0A2540]/5 text-[#0A2540]", icon: Clock },
  GENERATED_DEVELOPMENT_MODEL: { tone: "border-[#0A2540]/20 bg-[#0A2540]/5 text-[#0A2540]", icon: Sparkles }
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const label = value ?? "PENDING";
  const config = toneByStatus[label] ?? { tone: "border-slate-300 bg-slate-100 text-slate-700", icon: Info };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase ${config.tone}`}>
      <Icon size={13} aria-hidden="true" />
      <span>{label.replaceAll("_", " ")}</span>
    </span>
  );
}
