export function ScoreBar({ label, value, tone = "bg-pine" }: { label: string; value: number | null; tone?: string }) {
  const score = value ?? 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="font-semibold text-ink">{value === null ? "Unavailable" : score.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-md bg-slate-100">
        <div className={`h-2 rounded-md ${tone}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

