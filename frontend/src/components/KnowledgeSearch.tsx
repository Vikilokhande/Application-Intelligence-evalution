// Structural Idea: A dark policy RAG knowledge base search component rendering vector-retrieved passages with control room tokens.

import { BookOpen, FileText, Loader2, Search, Sparkles } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { api } from "../services/api";
import type { KnowledgeResult } from "../types/api";

export function KnowledgeSearch({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KnowledgeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchKnowledge(query);
      setResults(data);
    } catch (err) {
      setError("Knowledge base query returned no matching policy excerpts.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 font-sans text-[#E8EDF1]">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 flex items-center">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8B99A6] z-10" />
          <input
            type="text"
            className="w-full rounded-[6px] border border-[#22303A] bg-[#0B0F14] pl-10 pr-3 py-2 font-sans text-xs text-[#E8EDF1] placeholder-[#8B99A6]/40 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] focus:border-[#3DDC84]"
            style={{ paddingLeft: "36px" }}
            placeholder="Search environmental scheme guidelines, rules, RAG knowledge..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-[6px] border border-[#3DDC84] bg-[#3DDC84] text-[#0B0F14] hover:bg-[#3DDC84]/90 focus:outline-none focus:ring-1 focus:ring-[#3DDC84] disabled:opacity-50 shrink-0 transition-colors"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <BookOpen size={13} />
          )}
          <span>QUERY</span>
        </button>
      </form>

      {error && (
        <div className="rounded-[6px] border border-[#E0A93D] bg-[#E0A93D]/10 p-2.5 font-mono text-xs text-[#E0A93D]">
          {error}
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#3DDC84] flex items-center gap-1.5">
            <Sparkles size={12} /> RETRIEVED {results.length} KNOWLEDGE PASSAGE(S)
          </div>
          {results.map((item, idx) => (
            <div
              key={idx}
              className="rounded-[6px] border border-[#22303A] bg-[#0B0F14] p-2.5 text-xs space-y-1 font-mono"
            >
              <div className="flex items-center justify-between font-bold text-[#E8EDF1] gap-2">
                <span className="truncate flex items-center gap-1.5 text-xs">
                  <FileText size={13} className="text-[#3DDC84] shrink-0" />
                  {item.source || `KNOWLEDGE SOURCE #${idx + 1}`}
                </span>
                {item.score != null && (
                  <span className="text-[9px] bg-[#3DDC84]/10 text-[#3DDC84] border border-[#3DDC84]/30 px-1.5 py-0.5 rounded uppercase">
                    SCORE: {item.score.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-[9px] uppercase tracking-wider text-[#8B99A6]">
                {item.scheme || "SCHEME"} / {item.chunk_id || "CHUNK"}
              </div>
              <p className="text-[#E8EDF1] leading-relaxed text-[11px] bg-[#131A21] p-2 rounded border border-[#22303A] font-sans">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {results && results.length === 0 && !error && (
        <div className="py-4 text-center font-mono text-xs text-[#8B99A6] border border-dashed border-[#22303A] rounded-[6px]">
          NO MATCHING KNOWLEDGE RECORDS FOUND FOR &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
