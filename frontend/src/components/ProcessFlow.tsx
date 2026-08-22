// Structural Idea: A compact telemetry stepper rendering LangGraph node execution progression using control room dark tokens.

import { CheckCircle2, CircleDot, Clock, XCircle, ChevronRight } from "lucide-react";
import { useState } from "react";

export function ProcessFlow({
  nodes,
  currentNode,
  failed,
}: {
  nodes: string[];
  currentNode?: string;
  failed?: boolean;
}) {
  const [isGrid, setIsGrid] = useState(false);
  const currentIndex = currentNode ? nodes.indexOf(currentNode) : -1;

  return (
    <div className="space-y-2">
      {/* View Mode Toggle Header */}
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] text-[#8B99A6]">
          STAGE <strong className="text-[#E8EDF1]">{currentIndex >= 0 ? currentIndex + 1 : 0}</strong> OF <strong className="text-[#E8EDF1]">{nodes.length}</strong>
        </div>
        <button
          type="button"
          onClick={() => setIsGrid((v) => !v)}
          className="font-mono text-[9px] font-bold border border-[#22303A] bg-[#0B0F14] text-[#8B99A6] hover:text-[#3DDC84] hover:border-[#3DDC84] px-2 py-0.5 rounded uppercase transition-colors"
        >
          {isGrid ? "COMPACT FLOW" : "GRID MATRIX"}
        </button>
      </div>

      {isGrid ? (
        /* Grid view (for users who prefer expanded view) */
        <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 font-mono text-xs min-w-0">
          {nodes.map((node, index) => {
            const complete = currentIndex > index;
            const active = currentIndex === index;
            const activeFailed = active && !!failed;
            return (
              <div
                key={node}
                className={`flex min-h-[34px] min-w-0 items-center gap-2 rounded-[5px] border px-2.5 py-1.5 transition-colors ${
                  activeFailed
                    ? "border-[#D9534F] bg-[#D9534F]/10 text-[#D9534F] font-bold"
                    : active
                    ? "border-[#3DDC84] bg-[#3DDC84]/10 text-[#3DDC84] font-bold"
                    : complete
                    ? "border-[#22303A] bg-[#0B0F14] text-[#3DDC84]"
                    : "border-[#22303A] bg-[#0B0F14]/40 text-[#8B99A6] opacity-60"
                }`}
              >
                {complete ? (
                  <CheckCircle2 className="text-[#3DDC84] shrink-0" size={13} />
                ) : activeFailed ? (
                  <XCircle className="text-[#D9534F] shrink-0" size={13} />
                ) : active ? (
                  <Clock className="text-[#3DDC84] shrink-0 animate-pulse" size={13} />
                ) : (
                  <CircleDot className="text-[#8B99A6] shrink-0" size={13} />
                )}
                <span className="truncate tracking-wide uppercase text-[10px]">
                  {node.replaceAll("_", " ")}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        /* Sleek Compact Horizontal Lineage Flow (DEFAULT) */
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] min-w-0">
          {nodes.map((node, index) => {
            const complete = currentIndex > index;
            const active = currentIndex === index;
            const activeFailed = active && !!failed;
            const isLast = index === nodes.length - 1;

            return (
              <div key={node} className="flex items-center gap-1.5">
                <div
                  className={`flex items-center gap-1.5 rounded-[5px] border px-2.5 py-1 transition-all ${
                    activeFailed
                      ? "border-[#D9534F] bg-[#D9534F]/15 text-[#D9534F] font-bold shadow-[0_0_8px_rgba(217,83,79,0.25)]"
                      : active
                      ? "border-[#3DDC84] bg-[#3DDC84]/15 text-[#3DDC84] font-bold shadow-[0_0_8px_rgba(61,220,132,0.25)]"
                      : complete
                      ? "border-[#3DDC84]/40 bg-[#3DDC84]/5 text-[#3DDC84]"
                      : "border-[#22303A] bg-[#0B0F14]/50 text-[#8B99A6]/60"
                  }`}
                >
                  {complete ? (
                    <CheckCircle2 className="text-[#3DDC84] shrink-0" size={12} />
                  ) : activeFailed ? (
                    <XCircle className="text-[#D9534F] shrink-0" size={12} />
                  ) : active ? (
                    <Clock className="text-[#3DDC84] shrink-0 animate-pulse" size={12} />
                  ) : (
                    <CircleDot className="text-[#8B99A6]/50 shrink-0" size={12} />
                  )}
                  <span className="truncate tracking-wide uppercase font-semibold">
                    {node.replaceAll("_", " ")}
                  </span>
                </div>

                {!isLast && (
                  <ChevronRight
                    size={11}
                    className={`shrink-0 ${
                      complete
                        ? "text-[#3DDC84]/60"
                        : active
                        ? "text-[#3DDC84] animate-pulse"
                        : "text-[#22303A]"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
