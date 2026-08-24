// src/components/ui/RecommendationBadge.tsx
import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";

type RecValue = string | null | undefined;

const REC_CONFIG: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  APPROVE:               { label: "Approve",                cls: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CheckCircle2 },
  APPROVED:              { label: "Approved",               cls: "border-emerald-200 bg-emerald-50 text-emerald-800", Icon: CheckCircle2 },
  REJECT:                { label: "Reject",                 cls: "border-rose-200 bg-rose-50 text-rose-800",          Icon: XCircle      },
  REJECTED:              { label: "Rejected",               cls: "border-rose-200 bg-rose-50 text-rose-800",          Icon: XCircle      },
  REQUEST_CLARIFICATION: { label: "Clarification Required", cls: "border-amber-200 bg-amber-50 text-amber-800",       Icon: HelpCircle   },
  REVIEW_REQUIRED:       { label: "Review Required",        cls: "border-amber-200 bg-amber-50 text-amber-800",       Icon: HelpCircle   },
};

export function RecommendationBadge({ value, large }: { value: RecValue; large?: boolean }) {
  if (!value) return <span className="text-sm text-slate-400">—</span>;

  const cfg = REC_CONFIG[value.toUpperCase()] ?? {
    label: value.replaceAll("_", " "),
    cls: "border-slate-200 bg-slate-100 text-slate-600",
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
