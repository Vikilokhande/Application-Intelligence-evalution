// src/components/ui/AlertBanner.tsx
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import type { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "error";

const CONFIG: Record<AlertVariant, { icon: typeof Info; cls: string }> = {
  info:    { icon: Info,          cls: "border-sky-200 bg-sky-50 text-sky-900" },
  success: { icon: CheckCircle2,  cls: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  warning: { icon: AlertTriangle, cls: "border-amber-200 bg-amber-50 text-amber-900" },
  error:   { icon: AlertCircle,   cls: "border-rose-200 bg-rose-50 text-rose-900" },
};

export function AlertBanner({
  variant = "info",
  title,
  children,
  onDismiss,
}: {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const { icon: Icon, cls } = CONFIG[variant];
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${cls}`} role="alert">
      <Icon size={16} className="mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0 text-sm leading-relaxed">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 opacity-60 hover:opacity-100 transition" aria-label="Dismiss">
          <X size={15} />
        </button>
      )}
    </div>
  );
}
