"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { SessionContent } from "@/lib/types/session";
import { buildSearchIndex, searchContent, type SearchResult } from "@/lib/utils/search";

interface Props {
  content: SessionContent;
  onClose: () => void;
  onNavigate: (sectionId: string) => void;
}

export function SearchOverlay({ content, onClose, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => buildSearchIndex(content), [content]);
  const results = useMemo(() => searchContent(index, query), [index, query]);

  // Group results by section
  const grouped = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    for (const result of results) {
      if (!groups[result.sectionId]) {
        groups[result.sectionId] = [];
      }
      groups[result.sectionId].push(result);
    }
    return groups;
  }, [results]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function highlightMatch(text: string): React.ReactNode {
    if (!query || query.length < 2) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) return text;

    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-amber-500/30 text-amber-200 px-0.5">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/95 backdrop-blur-sm">
      {/* Search header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-3">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-gray-500">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search session content..."
          className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-base outline-none"
        />
        <button
          onClick={onClose}
          className="flex h-8 items-center rounded border border-gray-700 px-2 text-xs text-gray-400"
        >
          ESC
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {query.length < 2 ? (
          <p className="text-center text-sm text-gray-500 mt-8">
            Type at least 2 characters to search
          </p>
        ) : results.length === 0 ? (
          <p className="text-center text-sm text-gray-500 mt-8">
            No results for &ldquo;{query}&rdquo;
          </p>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            <p className="text-xs text-gray-500">{results.length} results</p>
            {Object.entries(grouped).map(([sectionId, sectionResults]) => (
              <div key={sectionId}>
                <button
                  onClick={() => onNavigate(sectionId)}
                  className="mb-1 text-sm font-semibold text-amber-400 hover:text-amber-300"
                >
                  {sectionResults[0].sectionTitle}
                </button>
                <div className="space-y-1 pl-3 border-l border-gray-800">
                  {sectionResults.map((result, i) => (
                    <button
                      key={i}
                      onClick={() => onNavigate(result.sectionId)}
                      className="block w-full text-left"
                    >
                      <span className="text-xs text-gray-500">{result.field}</span>
                      <p className="text-sm text-gray-300">
                        {highlightMatch(result.snippet)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
