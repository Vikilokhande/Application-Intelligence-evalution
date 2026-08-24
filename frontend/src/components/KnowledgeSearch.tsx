// KnowledgeSearch.tsx — Policy Knowledge Base Search.
// Palette: Deep Navy Blue (#0A243F), Dark Navy (#071A2B), Mustard Gold (#D5A51A), Slate Gray (#66717C), Soft Gray (#E5E7EB).
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
    } catch {
      setError("Knowledge base query returned no matching policy excerpts.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 font-sans text-[#071A2B]">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 flex items-center">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66717C] z-10" />
          <input
            type="text"
            className="form-input text-xs w-full"
            style={{ paddingLeft: "34px" }}
            placeholder="Search eligibility, required documents, limits…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A243F] px-4 py-2 text-xs font-bold text-white hover:bg-[#0d2f50] transition disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin text-[#D5A51A]" />
          ) : (
            <BookOpen size={13} className="text-[#D5A51A]" />
          )}
          <span>Search</span>
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-2.5 text-xs text-[#92400E]">
          {error}
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0A243F]">
            <Sparkles size={12} className="text-[#D5A51A]" /> Retrieved {results.length} policy passage(s)
          </div>
          {results.map((item, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-[#E5E7EB] bg-white p-3 text-xs space-y-1.5 shadow-2xs"
            >
              <div className="flex items-center justify-between font-bold text-[#0A243F] gap-2">
                <span className="truncate flex items-center gap-1.5 text-xs">
                  <FileText size={13} className="text-[#0A243F] shrink-0" />
                  {item.source || `POLICY RECORD #${idx + 1}`}
                </span>
                {item.score != null && (
                  <span className="rounded-md border border-[#0A243F]/20 bg-[#0A243F]/5 px-1.5 py-0.5 text-[9px] font-bold text-[#0A243F]">
                    Match: {(item.score * 100).toFixed(0)}%
                  </span>
                )}
              </div>
              <p className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] p-2.5 font-sans text-xs leading-relaxed text-[#071A2B]">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {results && results.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-[#E5E7EB] py-4 text-center text-xs text-[#66717C]">
          No matching records found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
