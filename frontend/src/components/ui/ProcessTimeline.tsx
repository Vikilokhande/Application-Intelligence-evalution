// src/components/ui/ProcessTimeline.tsx
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from "lucide-react";

export type StepStatus = "complete" | "active" | "warning" | "pending";

export interface TimelineStep {
  id: string;
  label: string;
  description?: string;
  status: StepStatus;
  detail?: string; // shown when expanded
}

export function ProcessTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <div key={step.id} className="flex gap-4">
            {/* Timeline column */}
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 my-1 min-h-[2rem] ${
                    step.status === "complete" ? "bg-teal-300" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
            {/* Content */}
            <div className={`pb-6 min-w-0 ${isLast ? "pb-0" : ""}`}>
              <p
                className={`text-sm font-semibold ${
                  step.status === "complete" ? "text-teal-700" :
                  step.status === "active"   ? "text-sky-700"  :
                  step.status === "warning"  ? "text-amber-700":
                                              "text-slate-400"
                }`}
              >
                {step.label}
              </p>
              {step.description && (
                <p className={`text-xs mt-0.5 ${
                  step.status === "pending" ? "text-slate-300" : "text-slate-500"
                }`}>
                  {step.description}
                </p>
              )}
              {step.detail && step.status !== "pending" && (
                <p className="text-xs text-slate-400 mt-1 italic">{step.detail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepIcon({ status }: { status: StepStatus }) {
  const base = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2";
  if (status === "complete")
    return <div className={`${base} border-teal-400 bg-teal-50`}><CheckCircle2 size={16} className="text-teal-600" /></div>;
  if (status === "active")
    return <div className={`${base} border-sky-400 bg-sky-50`}><Loader2 size={14} className="text-sky-600 animate-spin" /></div>;
  if (status === "warning")
    return <div className={`${base} border-amber-400 bg-amber-50`}><AlertTriangle size={14} className="text-amber-600" /></div>;
  return <div className={`${base} border-slate-200 bg-white`}><Circle size={12} className="text-slate-300" /></div>;
}
