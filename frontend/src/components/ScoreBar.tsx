// Structural Idea: A dark-themed telemetry score progress bar utilizing DESIGN.md tokens for quality and risk visualization.

export function ScoreBar({
  label,
  value,
  tone = "bg-[#3DDC84]",
}: {
  label: string;
  value: number | null;
  tone?: string;
}) {
  const score = value ?? 0;
  const barTone = tone.includes("rose") || tone.includes("red") || tone.includes("brick")
    ? "bg-[#D9534F]"
    : tone.includes("amber") || tone.includes("saffron")
    ? "bg-[#E0A93D]"
    : "bg-[#3DDC84]";

  return (
    <div className="space-y-1.5 font-sans text-xs">
      <div className="flex items-center justify-between font-mono">
        <span className="text-[#8B99A6] font-semibold uppercase">{label}</span>
        <span className={`font-bold ${barTone.includes("D9534F") ? "text-[#D9534F]" : "text-[#3DDC84]"}`}>
          {value === null ? "N/A" : `${score.toFixed(1)}%`}
        </span>
      </div>
      <div className="h-2 rounded-[4px] bg-[#0B0F14] border border-[#22303A] overflow-hidden p-[1px]">
        <div
          className={`h-full rounded-[2px] transition-all duration-300 ${barTone}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}
