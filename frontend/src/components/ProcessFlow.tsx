import { CheckCircle2, CircleDot } from "lucide-react";

export function ProcessFlow({ nodes, currentNode }: { nodes: string[]; currentNode?: string }) {
  const currentIndex = currentNode ? nodes.indexOf(currentNode) : -1;
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {nodes.map((node, index) => {
        const complete = currentIndex > index;
        const active = currentIndex === index;
        return (
          <div
            key={node}
            className={`flex min-h-14 items-center gap-3 rounded-md border px-3 py-2 ${
              active ? "border-cobalt bg-blue-50" : complete ? "border-emerald-200 bg-emerald-50" : "border-line bg-white"
            }`}
          >
            {complete ? <CheckCircle2 className="text-emerald-700" size={18} /> : <CircleDot className={active ? "text-cobalt" : "text-slate-400"} size={18} />}
            <span className="text-sm font-semibold text-ink">{node.replaceAll("_", " ")}</span>
          </div>
        );
      })}
    </div>
  );
}

