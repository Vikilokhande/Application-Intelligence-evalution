export function ScoreBar({ label, value, tone = "bg-[#0F766E]" }: { label: string; value: number | null; tone?: string }) {
  const score = value ?? 0;
  const barTone = tone.includes("brick")
    ? "bg-rose-600"
    : tone.includes("cobalt")
      ? "bg-sky-600"
      : tone.includes("saffron")
        ? "bg-amber-500"
        : "bg-[#0F766E]";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-700">{label}</span>
        <span className="text-slate-900 font-mono font-bold">{value === null ? "N/A" : `${score.toFixed(1)}%`}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barTone}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}
