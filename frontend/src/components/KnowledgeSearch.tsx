// Light policy RAG knowledge base search component.

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
    <div className="space-y-3 font-sans text-slate-700">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 flex items-center">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
          <input
            type="text"
            className="form-input pl-10 text-xs"
            style={{ paddingLeft: "36px" }}
            placeholder="Search environmental scheme guidelines, rules, RAG knowledge..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="primary-button h-auto shrink-0 px-3.5 py-2 text-xs disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <BookOpen size={13} />
          )}
          <span>Search</span>
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
          {error}
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
            <Sparkles size={12} /> Retrieved {results.length} knowledge passage(s)
          </div>
          {results.map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs space-y-1 shadow-sm"
            >
              <div className="flex items-center justify-between font-bold text-slate-800 gap-2">
                <span className="truncate flex items-center gap-1.5 text-xs">
                  <FileText size={13} className="text-teal-600 shrink-0" />
                  {item.source || `KNOWLEDGE SOURCE #${idx + 1}`}
                </span>
                {item.score != null && (
                  <span className="rounded border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[9px] uppercase text-teal-700">
                    Score: {item.score.toFixed(2)}
                  </span>
                )}
              </div>
              <div className="text-[9px] uppercase tracking-wide text-slate-400">
                {item.scheme || "SCHEME"} / {item.chunk_id || "CHUNK"}
              </div>
              <p className="rounded border border-slate-100 bg-slate-50 p-2 font-sans text-[11px] leading-relaxed text-slate-700">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {results && results.length === 0 && !error && (
        <div className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-500">
          No matching knowledge records found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
