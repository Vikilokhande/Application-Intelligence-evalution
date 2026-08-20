import { CheckCircle2, AlertTriangle, AlertCircle, Sparkles, Clock, Info } from "lucide-react";

const toneByStatus: Record<string, { tone: string; icon: typeof CheckCircle2 }> = {
  PASS: { tone: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  SUCCESS: { tone: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  APPROVE: { tone: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  LOW_RISK: { tone: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },
  HUMAN_DECISION_RECORDED: { tone: "border-emerald-300 bg-emerald-50 text-emerald-800", icon: CheckCircle2 },

  WARN: { tone: "border-amber-300 bg-amber-50 text-amber-800", icon: AlertTriangle },
  WARNING: { tone: "border-amber-300 bg-amber-50 text-amber-800", icon: AlertTriangle },
  MEDIUM_RISK: { tone: "border-amber-300 bg-amber-50 text-amber-800", icon: AlertTriangle },

  FAIL: { tone: "border-rose-300 bg-rose-50 text-rose-800", icon: AlertCircle },
  ERROR: { tone: "border-rose-300 bg-rose-50 text-rose-800", icon: AlertCircle },
  PROCESSING_FAILED: { tone: "border-rose-300 bg-rose-50 text-rose-800", icon: AlertCircle },
  HIGH_RISK: { tone: "border-rose-300 bg-rose-50 text-rose-800", icon: AlertCircle },
  REJECT: { tone: "border-rose-300 bg-rose-50 text-rose-800", icon: AlertCircle },

  AWAITING_HUMAN_REVIEW: { tone: "border-sky-300 bg-sky-50 text-sky-800", icon: Clock },
  PROCESSING: { tone: "border-blue-300 bg-blue-50 text-blue-800", icon: Clock },
  GENERATED_DEVELOPMENT_MODEL: { tone: "border-sky-300 bg-sky-50 text-sky-800", icon: Sparkles }
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
