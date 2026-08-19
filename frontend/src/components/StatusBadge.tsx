const toneByStatus: Record<string, string> = {
  PASS: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAIL: "border-rose-200 bg-rose-50 text-rose-800",
  WARN: "border-amber-200 bg-amber-50 text-amber-800",
  WARNING: "border-amber-200 bg-amber-50 text-amber-800",
  ERROR: "border-rose-200 bg-rose-50 text-rose-800",
  AWAITING_HUMAN_REVIEW: "border-cobalt/20 bg-blue-50 text-cobalt",
  HUMAN_DECISION_RECORDED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  PROCESSING_FAILED: "border-rose-200 bg-rose-50 text-rose-800",
  HIGH_RISK: "border-rose-200 bg-rose-50 text-rose-800",
  MEDIUM_RISK: "border-amber-200 bg-amber-50 text-amber-800",
  LOW_RISK: "border-emerald-200 bg-emerald-50 text-emerald-800"
};

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const label = value ?? "UNKNOWN";
  const tone = toneByStatus[label] ?? "border-slate-200 bg-slate-50 text-slate-700";
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${tone}`}>{label.replaceAll("_", " ")}</span>;
}

