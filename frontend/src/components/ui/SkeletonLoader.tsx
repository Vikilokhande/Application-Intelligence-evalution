// SkeletonLoader.tsx — skeleton placeholders for loading states
export function SkeletonLine({ w = "full", h = "3" }: { w?: string; h?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 h-${h} ${
        w === "full" ? "w-full" : w === "3/4" ? "w-3/4" : w === "1/2" ? "w-1/2" : w === "1/4" ? "w-1/4" : `w-${w}`
      }`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-3 animate-pulse">
      <SkeletonLine w="1/2" h="4" />
      <SkeletonLine />
      <SkeletonLine w="3/4" />
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} w={i === lines - 1 ? "2/3" : "full"} />
      ))}
    </div>
  );
}

export function SkeletonDetailPage() {
  return (
    <div className="max-w-[1100px] mx-auto space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-3 w-24 rounded bg-slate-200" />
          <div className="h-7 w-80 rounded bg-slate-200" />
          <div className="h-3 w-48 rounded bg-slate-200" />
        </div>
        <div className="h-7 w-28 rounded-full bg-slate-200" />
      </div>

      {/* Status row */}
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="h-2.5 w-16 rounded bg-slate-200" />
            <div className="h-6 w-24 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>

      {/* Two column */}
      <div className="grid grid-cols-[1fr_340px] gap-6">
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
