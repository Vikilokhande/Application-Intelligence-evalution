import { Search, BookOpen, Sparkles, Loader2, FileText } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { api } from "../services/api";

export function KnowledgeSearch({ initialQuery = "Environmental Impact Guidelines" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ document: string; content: string; score?: number; source?: string }> | null>(null);
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
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-[#64748B]" />
          <input
            type="search"
            className="w-full pl-9 pr-3 py-2 text-xs"
            placeholder="Search environmental scheme guidelines, rules, RAG knowledge..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="primary-button text-xs py-2 px-3.5 shrink-0" disabled={loading}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <BookOpen size={14} />} Query
        </button>
      </form>

      {error && <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">{error}</div>}

      {results && results.length > 0 && (
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#0F766E] flex items-center gap-1.5">
            <Sparkles size={12} /> {results.length} Retreived Knowledge Passage(s)
          </div>
          {results.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-sm text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-[#0F172A] gap-2">
                <span className="truncate flex items-center gap-1.5 text-xs">
                  <FileText size={13} className="text-[#0F766E]" /> {item.document || item.source || `Knowledge Source #${idx + 1}`}
                </span>
                {item.score != null && (
                  <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded">
                    Score: {item.score.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="text-[#334155] leading-relaxed text-[11px] font-mono bg-[#F8FAFC] p-2 rounded border border-slate-100">
                {item.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {results && results.length === 0 && !error && (
        <div className="text-xs text-[#64748B] italic p-3 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
          No matching knowledge records found for &quot;{query}&quot;.
        </div>
      )}
    </div>
  );
}
