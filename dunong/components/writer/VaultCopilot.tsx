'use client';

import { useState, useRef, useEffect } from 'react';
import type { VaultSource, CitationFormat, CopilotMessage } from '@/lib/writer.types';

interface Props {
  vaultSources: VaultSource[];
  folderName: string;
  citationFormat: CitationFormat;
  selectedText: string;
  onApplyEdit: (text: string) => void;
  onInsertCitation: (citation: string) => void;
}

const QUICK_ACTIONS = [
  { label: 'Find a supporting source', prompt: 'Find a vault source that supports the selected claim or sentence.' },
  { label: 'Add an inline citation', prompt: 'Add an inline citation for the selected text using the most relevant vault source.' },
  { label: 'Rephrase this paragraph', prompt: 'Rephrase the selected paragraph to improve clarity. Preserve meaning and pin citations.' },
  { label: 'Expand this section', prompt: 'Expand the selected section using evidence from the vault sources.' },
  { label: 'Check claim for support', prompt: 'Check whether the selected claim is supported or contradicted by vault sources.' },
  { label: 'Summarize this section', prompt: 'Summarize the selected section concisely with source attribution.' },
];

export default function VaultCopilot({
  vaultSources,
  folderName,
  citationFormat,
  selectedText,
  onApplyEdit,
  onInsertCitation,
}: Props) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg: CopilotMessage = { role: 'user', content: msg, timestamp: Date.now() };
    setMessages((p) => [...p, userMsg]);
    setLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: selectedText ? `[Selected text]: "${selectedText}"\n\n${msg}` : msg,
          history,
          context: {
            vaultSources,
            folderName,
            citationFormat,
          },
          action: 'chat',
        }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      const raw: string = data.response || '';

      // Extract document edit and inline citation tags
      const editMatch = raw.match(/<DOCUMENT_EDIT>([\s\S]*?)<\/DOCUMENT_EDIT>/);
      const citationMatch = raw.match(/<INLINE_CITATION>([\s\S]*?)<\/INLINE_CITATION>/);
      const documentEdit = editMatch?.[1]?.trim() ?? null;
      const inlineCitation = citationMatch?.[1]?.trim() ?? null;
      const content = raw
        .replace(/<DOCUMENT_EDIT>[\s\S]*?<\/DOCUMENT_EDIT>/g, '')
        .replace(/<INLINE_CITATION>[\s\S]*?<\/INLINE_CITATION>/g, '')
        .trim();

      setMessages((p) => [
        ...p,
        { role: 'assistant', content, documentEdit, inlineCitation, timestamp: Date.now() },
      ]);
    } catch (e: unknown) {
      setMessages((p) => [
        ...p,
        {
          role: 'assistant',
          content: `⚠ ${e instanceof Error ? e.message : 'Unknown error'}`,
          isError: true,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const timeStr = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="w-[300px] min-w-[300px] flex flex-col h-full bg-[#1A0A00] border-l border-[#2D1500] overflow-hidden">

      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[#2D1500] shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#E8B86D] text-base">✦</span>
          <span className="text-white font-bold text-[15px]" style={{ fontFamily: 'Georgia, serif' }}>
            Vault Co-pilot
          </span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#2D1500] rounded-md px-2.5 py-1.5">
          <span className="text-[11px]">🔒</span>
          <span className="text-[#D4A96A] text-[11px] font-medium leading-tight">
            {folderName ? `Locked to "${folderName}"` : 'No folder selected'}
          </span>
        </div>
        {vaultSources.length === 0 && (
          <div className="mt-2 bg-[#2D1F00] rounded-md px-2.5 py-1.5 text-[10px] text-[#E8B86D]">
            ⚠ No vault sources. Save articles to this folder first.
          </div>
        )}
        {selectedText && (
          <div className="mt-2 bg-[#2D1500] rounded-md px-2.5 py-1.5 text-[10px] text-[#D4A96A] truncate">
            Selected: &ldquo;{selectedText.slice(0, 55)}{selectedText.length > 55 ? '…' : ''}&rdquo;
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5">
        {messages.length === 0 && (
          <div className="py-2 px-1">
            <p className="text-white font-bold text-sm mb-1.5" style={{ fontFamily: 'Georgia, serif' }}>
              Welcome to your writing workspace.
            </p>
            <p className="text-[#B8A090] text-xs leading-relaxed">
              I am strictly locked to your Vault. I can only reference sources in{' '}
              <strong className="text-[#D4A96A]">&ldquo;{folderName || 'this folder'}&rdquo;</strong>.
            </p>
            {vaultSources.length > 0 && (
              <p className="text-[#E8B86D] text-[11px] mt-2 font-medium">
                {vaultSources.length} source{vaultSources.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 ${m.role === 'user' ? 'bg-[#2D1500] ml-4' : 'bg-[#231000] border border-[#3D2000]'
              }`}
          >
            {m.role === 'assistant' && (
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[#E8B86D] text-[10px]">✦</span>
                <span className="text-[#E8B86D] text-[10px] font-semibold uppercase tracking-wide">
                  Vault Co-pilot
                </span>
              </div>
            )}
            <p className="text-[#E8DFD0] text-xs leading-relaxed whitespace-pre-wrap">{m.content}</p>

            {m.documentEdit && (
              <button
                onClick={() => onApplyEdit(m.documentEdit!)}
                className="w-full mt-2 py-1.5 bg-[#8B1A1A] text-white text-[11px] font-semibold rounded-lg hover:bg-[#6B1212] transition-colors"
              >
                ✎ Apply Edit to Document
              </button>
            )}
            {m.inlineCitation && (
              <button
                onClick={() => onInsertCitation(m.inlineCitation!)}
                className="w-full mt-1.5 py-1.5 border border-[#E8B86D] text-[#E8B86D] text-[11px] font-semibold rounded-lg hover:bg-[#E8B86D]/10 transition-colors"
              >
                ↳ Insert Citation
              </button>
            )}
            <p className="text-[#6B5040] text-[10px] mt-1.5 text-right">{timeStr(m.timestamp)}</p>
          </div>
        ))}

        {loading && (
          <div className="bg-[#231000] border border-[#3D2000] rounded-xl p-3">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[#E8B86D] text-[10px]">✦</span>
              <span className="text-[#E8B86D] text-[10px] font-semibold uppercase tracking-wide">Vault Co-pilot</span>
            </div>
            <div className="flex gap-1.5 items-center">
              {[0, 200, 400].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-[#E8B86D] animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Actions */}
      {messages.length === 0 && (
        <div className="px-3 pb-1 shrink-0">
          <p className="text-[10px] text-[#6B5040] font-semibold uppercase tracking-wider mb-1.5">Quick actions</p>
          <div className="flex flex-col gap-1">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => send(a.prompt)}
                className="text-left px-2.5 py-1.5 bg-[#231000] border border-[#3D2000] rounded-lg text-[#D4A96A] text-[11px] font-medium hover:bg-[#2D1500] transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 py-2.5 border-t border-[#2D1500] shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Co-pilot…"
            rows={1}
            disabled={loading}
            className="flex-1 bg-[#2D1500] border border-[#3D2500] rounded-lg text-[#E8DFD0] text-[13px] px-3 py-2 resize-none outline-none placeholder:text-[#6B5040] disabled:opacity-50 min-h-[36px] max-h-[100px]"
            style={{ fontFamily: 'inherit' }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-base transition-colors disabled:opacity-30 disabled:cursor-not-allowed bg-[#8B1A1A] text-white hover:bg-[#6B1212]"
          >
            ↑
          </button>
        </div>
        <p className="text-[10px] text-[#4A3020] text-center mt-1.5">
          Locked to vault · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}