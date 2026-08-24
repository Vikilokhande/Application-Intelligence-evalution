// src/components/ui/FindingCard.tsx
// Displays a single PASS/WARN/FAIL finding in human-readable form.
import { AlertCircle, AlertTriangle, CheckCircle2, HelpCircle, Info } from "lucide-react";

type FindingStatus = "PASS" | "FAIL" | "WARN" | "NOT_VERIFIABLE" | "NOT_CHECKED" | string;

const STATUS_CONFIG: Record<string, { icon: typeof Info; cls: string; label: string }> = {
  PASS:           { icon: CheckCircle2,  cls: "border-emerald-200 bg-emerald-50",  label: "Passed" },
  FAIL:           { icon: AlertCircle,   cls: "border-rose-200 bg-rose-50",        label: "Failed" },
  WARN:           { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50",      label: "Attention Required" },
  NOT_VERIFIABLE: { icon: HelpCircle,    cls: "border-amber-200 bg-amber-50",      label: "Could Not Verify" },
  NOT_CHECKED:    { icon: Info,          cls: "border-slate-200 bg-slate-50",      label: "Not Checked" },
};

export function FindingCard({
  status,
  title,
  message,
  action,
}: {
  status: FindingStatus;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.NOT_CHECKED;
  const Icon = cfg.icon;

  const iconColor =
    status === "PASS"           ? "text-emerald-600" :
    status === "FAIL"           ? "text-rose-600"    :
    status === "WARN"           ? "text-amber-600"   :
    status === "NOT_VERIFIABLE" ? "text-amber-600"   :
                                  "text-slate-400";

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${cfg.cls}`}>
      <Icon size={16} className={`shrink-0 mt-0.5 ${iconColor}`} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {message && <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{message}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
