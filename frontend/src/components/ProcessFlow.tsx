import { CheckCircle2, CircleDot, Clock } from "lucide-react";

export function ProcessFlow({ nodes, currentNode }: { nodes: string[]; currentNode?: string }) {
  const currentIndex = currentNode ? nodes.indexOf(currentNode) : -1;
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {nodes.map((node, index) => {
        const complete = currentIndex > index;
        const active = currentIndex === index;
        return (
          <div
            key={node}
            className={`flex min-h-12 items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-all ${
              active
                ? "border-[#0F766E] bg-[#F0FDF4] shadow-sm"
                : complete
                  ? "border-emerald-200 bg-emerald-50/60"
                  : "border-slate-200 bg-white opacity-60"
            }`}
          >
            {complete ? (
              <CheckCircle2 className="text-[#0F766E] shrink-0" size={18} />
            ) : active ? (
              <Clock className="text-[#0F766E] shrink-0 animate-pulse" size={18} />
            ) : (
              <CircleDot className="text-slate-400 shrink-0" size={18} />
            )}
            <span className={`text-xs font-semibold tracking-wide uppercase ${active ? "text-[#0F766E]" : complete ? "text-slate-800" : "text-slate-500"}`}>
              {node.replaceAll("_", " ")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
