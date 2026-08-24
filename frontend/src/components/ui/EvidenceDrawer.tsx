// EvidenceDrawer.tsx — slide-in evidence details drawer
// Shows full backend evidence metadata. Never fabricates values.
import { useEffect } from "react";
import {
  BookOpen, CheckCircle2, HelpCircle, X, XCircle,
} from "lucide-react";
import type { EvidenceRead } from "../../types/api";

function resultIcon(r: string | undefined) {
  if (!r) return null;
  const u = r.toUpperCase();
  if (u === "PASS") return <CheckCircle2 size={14} className="text-emerald-600" />;
  if (u === "FAIL") return <XCircle size={14} className="text-rose-600" />;
  if (u.includes("NOT") || u === "WARN") return <HelpCircle size={14} className="text-amber-600" />;
  return null;
}

function resultLabel(r: string | undefined) {
  const map: Record<string, string> = {
    PASS: "Passed", FAIL: "Failed", WARN: "Attention Required", NOT_VERIFIABLE: "Could not verify",
  };
  return r ? (map[r.toUpperCase()] ?? r.replaceAll("_", " ")) : "";
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide sm:w-36 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 break-words">{value ?? <span className="italic text-slate-300">—</span>}</span>
    </div>
  );
}

function TRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 py-1">
      <span className="text-[11px] text-slate-400 w-32 shrink-0">{label}</span>
      <span className="text-[11px] font-mono text-slate-600 break-all">{value ?? "—"}</span>
    </div>
  );
}

export function EvidenceDrawer({
  item,
  onClose,
}: {
  item: EvidenceRead | null;
  onClose: () => void;
}) {
  // Close on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;

  const meta = item.metadata_json as Record<string, unknown> | undefined;
  const evidenceText = meta?.evidence_text as string | undefined;
  const kbDoc = meta?.knowledge_base_document as string | undefined;
  const ruleName = meta?.rule_name as string | undefined;
  const resultVal = (meta?.result ?? meta?.decision) as string | undefined;
  const expectedVal = meta?.expected_value;
  const chunkId = meta?.chunk_id as string | undefined;
  const confidence = item.confidence > 0 ? item.confidence : null;

  const sourceLabel =
    !item.source || item.source === "unavailable" || item.source === "unknown"
      ? (kbDoc ?? null)
      : item.source;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col animate-drawer-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-teal-600" />
            <h2 className="text-sm font-bold text-slate-800">Evidence Details</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Source */}
          {sourceLabel && (
            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex items-start gap-2">
              <BookOpen size={14} className="text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-teal-500 uppercase tracking-wide mb-0.5">Source Document</p>
                <p className="text-sm font-semibold text-teal-900">{sourceLabel}</p>
              </div>
            </div>
          )}

          {/* Evidence text */}
          {evidenceText && (
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">Evidence</p>
              <blockquote className="border-l-4 border-teal-300 pl-4 text-sm text-slate-700 italic leading-relaxed bg-slate-50 py-3 rounded-r-lg">
                "{evidenceText}"
              </blockquote>
            </div>
          )}

          {/* Result */}
          {resultVal && (
            <div className="flex items-center gap-2">
              {resultIcon(resultVal)}
              <span className="text-sm font-semibold text-slate-800">{resultLabel(resultVal)}</span>
            </div>
          )}

          {/* Evidence fields */}
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1">Finding Details</p>
            <div>
              {ruleName && <Row label="Rule" value={ruleName} />}
              {item.field_name && <Row label="Field" value={item.field_name} />}
              {item.extracted_value && <Row label="Application value" value={item.extracted_value} />}
              {Boolean(expectedVal) && <Row label="Expected value" value={String(expectedVal)} />}
              {item.locator && <Row label="Location" value={item.locator} />}
              {confidence != null && (
                <Row label="Confidence" value={`${(confidence * 100).toFixed(0)}%`} />
              )}
            </div>
          </div>

          {/* Technical details */}
          <details className="group rounded-lg border border-slate-200 bg-slate-50">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5 text-[11px] font-semibold text-slate-500 hover:text-slate-700 select-none">
              <span>Technical Details</span>
              <span className="text-slate-400 group-open:rotate-180 transition-transform inline-block">▾</span>
            </summary>
            <div className="border-t border-slate-200 px-4 py-3 space-y-1">
              <TRow label="Evidence ID" value={item.id} />
              <TRow label="Finding type" value={item.finding_type} />
              <TRow label="Source (raw)" value={item.source} />
              {chunkId && <TRow label="Chunk ID" value={chunkId} />}
              <TRow label="Created" value={item.created_at} />
            </div>
          </details>
        </div>
      </div>
    </>
  );
}
