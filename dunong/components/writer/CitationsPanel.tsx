'use client';

import { useState, useEffect } from 'react';
import type { VaultSource, CitationFormat } from '@/lib/writer.types';
import { generateInlineCitation, generateBibliographyEntry } from '@/lib/groqService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vaultSources: VaultSource[];
  citationFormat: CitationFormat;
  onFormatChange: (f: CitationFormat) => void;
  onInsertInlineCitation: (citation: string, sourceId: string) => void;
  onInsertBibliography: (text: string, format: CitationFormat) => void;
  apiKey: string;
  notebookId: string;
}

const FORMATS: CitationFormat[] = ['APA', 'MLA', 'Chicago'];

export default function CitationsPanel({
  isOpen,
  onClose,
  vaultSources,
  citationFormat,
  onFormatChange,
  onInsertInlineCitation,
  onInsertBibliography,
  apiKey,
  notebookId,
}: Props) {
  const [tab, setTab] = useState<'sources' | 'bibliography'>('sources');
  const [bibliography, setBibliography] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [citedIds, setCitedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!notebookId) return;
    try {
      const raw = localStorage.getItem(`dunong_cited_${notebookId}`);
      if (raw) setCitedIds(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [notebookId]);

  useEffect(() => {
    if (!notebookId) return;
    localStorage.setItem(`dunong_cited_${notebookId}`, JSON.stringify(citedIds));
  }, [citedIds, notebookId]);

  if (!isOpen) return null;

  const handleCite = (source: VaultSource) => {
    const citation = generateInlineCitation(source, citationFormat);
    const id = source.id || source.title;
    onInsertInlineCitation(citation, id);
    if (!citedIds.includes(id)) setCitedIds((p) => [...p, id]);
  };

  const handleGenerateBibliography = async () => {
    setGenerating(true);
    try {
      const toProcess =
        citedIds.length > 0
          ? vaultSources.filter((s) => citedIds.includes(s.id || s.title))
          : vaultSources;

      if (toProcess.length === 0) {
        alert("No sources available to generate bibliography from.");
        return;
      }

      const res = await fetch("/api/bibliography", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources: toProcess, format: citationFormat })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate bibliography");
      }

      const data = await res.json();
      setBibliography(data.entries.filter(Boolean));
      setTab('bibliography');
    } catch (e: unknown) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setGenerating(false);
    }
  };

  const handleInsertBibliography = () => {
    if (bibliography.length === 0) return;
    onInsertBibliography(bibliography.join('\n\n'), citationFormat);
  };

  const firstAuthor = (s: VaultSource) => {
    const a = Array.isArray(s.authors) ? s.authors[0] : null;
    if (!a) return 'Unknown';
    // If it's already an Author object (has firstName/lastName)
    if (typeof a === 'object' && ('lastName' in a || 'firstName' in a)) {
      return a.lastName || a.firstName || 'Unknown';
    }
    // Fallback for any lingering string authors (though they should be objects now)
    return String(a).split(',')[0]?.trim() ?? 'Unknown';
  };

  return (
    /* Full-height overlay panel pinned to the right side of the editor */
    <div className="fixed inset-y-0 right-0 w-80 z-50 flex flex-col bg-[#FEFCF8] border-l border-[#E8DFD0] shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DFD0] bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <span className="font-bold text-[#1A0A00] text-[15px]" style={{ fontFamily: 'Georgia, serif' }}>
            Citations
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-sm px-1 rounded transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Format Selector */}
      <div className="px-5 py-3 border-b border-[#E8DFD0] bg-white shrink-0">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Format</p>
        <div className="flex gap-2">
          {FORMATS.map((fmt) => (
            <button
              key={fmt}
              onClick={() => onFormatChange(fmt)}
              className={`px-3 py-1 rounded-md text-xs font-bold border transition-all ${
                citationFormat === fmt
                  ? 'bg-[#8B1A1A] border-[#8B1A1A] text-white'
                  : 'border-[#D0C4B8] text-gray-500 bg-transparent hover:border-[#8B1A1A]'
              }`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E8DFD0] bg-white shrink-0">
        {(['sources', 'bibliography'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-all border-b-2 ${
              tab === t
                ? 'text-[#8B1A1A] border-[#8B1A1A]'
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {t === 'sources' ? `Articles (${vaultSources.length})` : 'Bibliography'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Sources Tab */}
        {tab === 'sources' && (
          <>
            {vaultSources.length === 0 ? (
              <div className="text-center pt-10 px-4">
                <p className="text-sm font-semibold text-gray-600 mb-2">No vault sources</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Save articles to this folder&apos;s vault from the Library to cite them here.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-gray-400 mb-3">
                  Click <strong>Cite</strong> to insert an in-text citation at the cursor.
                </p>
                <div className="flex flex-col gap-2 mb-4">
                  {vaultSources.map((source) => {
                    const id = source.id || source.title;
                    const isCited = citedIds.includes(id);
                    return (
                      <div
                        key={id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isCited
                            ? 'border-[#8B1A1A] bg-[#FFF8F6]'
                            : 'border-[#E8DFD0] bg-white'
                        }`}
                      >
                        <p className="text-xs font-semibold text-[#1A0A00] leading-snug mb-1 line-clamp-2">
                          {source.title ?? 'Untitled'}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {firstAuthor(source)} · {source.year ?? 'n.d.'}
                        </p>
                        {source.journal && (
                          <p className="text-[10px] text-gray-300 italic mt-0.5 truncate">
                            {source.journal}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          {isCited && (
                            <span className="text-[10px] text-[#8B1A1A] font-semibold">✓ Cited</span>
                          )}
                          <button
                            onClick={() => handleCite(source)}
                            className="ml-auto px-2.5 py-1 bg-[#8B1A1A] text-white text-[11px] font-semibold rounded-md hover:bg-[#6B1212] transition-colors"
                          >
                            Cite
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={handleGenerateBibliography}
                  disabled={generating}
                  className="group relative w-full py-3.5 bg-[#1A0A00] text-[#e8e4df] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#2D1500] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-stone-900/10 overflow-hidden active:scale-95"
                >
                  <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                  {generating ? '⏳ Generating…' : `📄 Generate ${citationFormat} Bibliography`}
                </button>
              </>
            )}
          </>
        )}

        {/* Bibliography Tab */}
        {tab === 'bibliography' && (
          <>
            {bibliography.length === 0 ? (
              <div className="text-center pt-10 px-4">
                <p className="text-sm font-semibold text-gray-600 mb-2">No bibliography yet</p>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Cite sources then generate your bibliography from the Sources tab.
                </p>
                <button
                  onClick={handleGenerateBibliography}
                  disabled={generating || vaultSources.length === 0}
                  className="w-full py-2.5 bg-[#1A0A00] text-white text-sm font-semibold rounded-lg hover:bg-[#2D1500] transition-colors disabled:opacity-50"
                >
                  {generating ? '⏳ Generating…' : 'Generate Bibliography'}
                </button>
              </div>
            ) : (
              <>
                <p className="text-[10px] text-gray-400 mb-3">
                  {bibliography.length} reference{bibliography.length !== 1 ? 's' : ''} · {citationFormat}
                </p>
                <div className="flex flex-col gap-2 mb-4">
                  {bibliography.map((entry, i) => (
                    <div key={i} className="p-3 bg-white border border-[#E8DFD0] rounded-lg">
                      <p className="text-xs text-gray-700 leading-relaxed">{entry}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleInsertBibliography}
                    className="group relative flex-1 py-3 bg-[#8B1A1A] text-[#e8e4df] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#6B1212] transition-all duration-300 shadow-xl shadow-rose-900/10 overflow-hidden active:scale-95"
                  >
                    <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                    ↳ Insert
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(bibliography.join('\n\n'));
                      alert('Bibliography copied to clipboard!');
                    }}
                    className="flex-1 py-2.5 bg-stone-100 text-[#1A0A00] border border-stone-200 text-xs font-semibold rounded-lg hover:bg-stone-200 transition-colors"
                  >
                    ⎘ Copy
                  </button>
                  <button
                    onClick={handleGenerateBibliography}
                    disabled={generating}
                    className="px-3 py-2.5 border border-[#D0C4B8] text-gray-500 text-xs font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {generating ? '⏳' : '↻'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
