// Structural Idea: A dark SHAP feature attribution waterfall chart rendering positive quality boosts and risk impacts using control room tokens.

import { BarChart3, TrendingDown, TrendingUp } from "lucide-react";

export function ScoreContributionChart({
  contributions,
}: {
  contributions: Record<string, number> | null | undefined;
}) {
  if (!contributions || Object.keys(contributions).length === 0) {
    return (
      <div className="py-6 text-center font-mono text-xs text-[#8B99A6]">
        NO FEATURE ATTRIBUTION SCORES RECORDED FOR THIS MODEL PREDICTION
      </div>
    );
  }

  const entries = Object.entries(contributions);
  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)), 1.0);

  return (
    <div className="space-y-3 font-sans text-xs">
      <div className="flex items-center justify-between font-mono">
        <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#E8EDF1]">
          <BarChart3 size={15} className="text-[#3DDC84]" /> FEATURE ATTRIBUTION (SHAP WATERFALLS)
        </span>
        <span className="text-[10px] text-[#8B99A6]">
          GREEN = POSITIVE BOOST | RED = RISK IMPACT
        </span>
      </div>

      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {entries.map(([feature, val]) => {
          const isPositive = val >= 0;
          const widthPercent = Math.min(100, Math.max(10, (Math.abs(val) / maxAbs) * 100));

          return (
            <div key={feature} className="space-y-1 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#E8EDF1] flex items-center gap-1.5 uppercase">
                  {isPositive ? (
                    <TrendingUp size={13} className="text-[#3DDC84]" />
                  ) : (
                    <TrendingDown size={13} className="text-[#D9534F]" />
                  )}
                  {feature.replaceAll("_", " ")}
                </span>
                <span className={`font-bold ${isPositive ? "text-[#3DDC84]" : "text-[#D9534F]"}`}>
                  {isPositive ? `+${val.toFixed(2)}` : val.toFixed(2)}
                </span>
              </div>

              {/* Bar track */}
              <div className="h-2 w-full rounded-[4px] bg-[#0B0F14] border border-[#22303A] overflow-hidden p-[1px]">
                <div
                  className={`h-full rounded-[2px] transition-all duration-300 ${
                    isPositive ? "bg-[#3DDC84]" : "bg-[#D9534F]"
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
