import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";

export function ScoreContributionChart({
  contributions
}: {
  contributions: Record<string, number> | null | undefined;
}) {
  if (!contributions || Object.keys(contributions).length === 0) {
    return (
      <div className="text-xs text-[#64748B] italic p-4 text-center">
        No feature attribution scores recorded for this model prediction.
      </div>
    );
  }

  const entries = Object.entries(contributions);
  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)), 1.0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-[#0F172A]">
        <span className="flex items-center gap-1.5 uppercase tracking-wider text-[#64748B]">
          <BarChart3 size={16} className="text-[#0F766E]" /> Feature Attribution (SHAP Waterfalls)
        </span>
        <span className="text-[11px] text-[#64748B] font-normal">
          Green = Positive Quality Boost | Red = Increased Risk Impact
        </span>
      </div>

      <div className="space-y-2.5">
        {entries.map(([feature, val]) => {
          const isPositive = val >= 0;
          const widthPercent = Math.min(100, Math.max(10, (Math.abs(val) / maxAbs) * 100));

          return (
            <div key={feature} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0F172A] flex items-center gap-1.5">
                  {isPositive ? (
                    <TrendingUp size={14} className="text-emerald-600" />
                  ) : (
                    <TrendingDown size={14} className="text-rose-600" />
                  )}
                  {feature.replaceAll("_", " ")}
                </span>
                <span className={`font-mono font-bold ${isPositive ? "text-emerald-700" : "text-rose-700"}`}>
                  {isPositive ? `+${val.toFixed(2)}` : val.toFixed(2)}
                </span>
              </div>

              {/* Bar track */}
              <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isPositive ? "bg-[#0F766E]" : "bg-rose-600"
                  }`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
