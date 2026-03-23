'use client';

import { useState, useRef, useEffect } from 'react';
import type { VaultSource, CitationFormat, CopilotMessage } from '@/lib/writer.types';

interface Props {
  vaultSources: VaultSource[];
  folderName: string;
  citationFormat: CitationFormat;
  selectedText: string;
  getDocumentText?: () => string;
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
  getDocumentText,
  onApplyEdit,
  onInsertCitation,
}: Props) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useVault, setUseVault] = useState(true);
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
            vaultSources: useVault ? vaultSources : [],
            folderName,
            citationFormat,
            documentContent: getDocumentText ? getDocumentText() : "",
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
    <div className="w-[320px] min-w-[320px] flex flex-col h-full bg-white/80 backdrop-blur-3xl border-l border-[#2b090d]/10 shadow-[-10px_0_30px_rgba(43,9,13,0.03)] overflow-hidden z-20">

      {/* Header */}
      <div className="px-5 py-5 border-b border-[#2b090d]/10 shrink-0 bg-white/50">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#521118] text-lg">✦</span>
            <span className="text-[#2b090d] font-bold text-[16px]" style={{ fontFamily: 'Georgia, serif' }}>
              Vault Co-pilot
            </span>
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer group" title="Toggle Vault Context" aria-label="Toggle Vault Context">
            <div className={`relative w-[34px] h-[18px] rounded-full transition-colors ${useVault ? 'bg-[#521118]' : 'bg-[#e8e4df]'}`}>
              <div className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] bg-white rounded-full transition-transform ${useVault ? 'translate-x-[16px]' : 'translate-x-0'} shadow-sm`} />
            </div>
            <input
              type="checkbox"
              className="hidden"
              checked={useVault}
              onChange={(e) => setUseVault(e.target.checked)}
            />
          </label>
        </div>
        
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 transition-colors ${useVault ? 'bg-[#521118]/5 border border-[#521118]/10' : 'bg-gray-50 border border-gray-200'}`}>
          <span className="text-[12px] opacity-70">{useVault ? '🔒' : '🌐'}</span>
          <span className={`text-[12px] font-semibold leading-tight ${useVault ? 'text-[#521118]' : 'text-gray-500'}`}>
            {useVault 
              ? (folderName ? `Locked to "${folderName}"` : 'No folder selected')
              : 'General AI Assistant'}
          </span>
        </div>
        {useVault && vaultSources.length === 0 && (
          <div className="mt-2 bg-[#521118]/5 border border-[#521118]/10 rounded-xl px-3 py-2 text-[11px] text-[#521118] font-medium">
            ⚠ No vault sources. Save articles to this folder first.
          </div>
        )}
        {selectedText && (
          <div className="mt-2 bg-[#2b090d]/5 border border-[#2b090d]/10 rounded-xl px-3 py-2 text-[11px] text-[#2b090d]/70 truncate font-medium">
            Selected: &ldquo;{selectedText.slice(0, 55)}{selectedText.length > 55 ? '…' : ''}&rdquo;
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="py-2 px-1 text-center mt-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${useVault ? 'bg-[#521118]/5' : 'bg-[#e8e4df]/50'}`}>
               <span className={`text-xl ${useVault ? 'text-[#521118]' : 'text-gray-500'}`}>{useVault ? '✦' : '🌐'}</span>
            </div>
            <p className="text-[#2b090d] font-black text-sm mb-2" style={{ fontFamily: 'Georgia, serif' }}>
              Your intelligent writing partner.
            </p>
            <p className="text-[#2b090d]/60 text-xs leading-relaxed max-w-[240px] mx-auto">
              {useVault ? (
                <>
                  I am strictly locked to your Vault. I will only reference and cite sources from{' '}
                  <strong className="text-[#521118] font-bold">&ldquo;{folderName || 'this folder'}&rdquo;</strong>.
                </>
              ) : (
                <>
                  I am acting as a <strong className="text-gray-600 font-bold">General AI Assistant</strong>. I will use my broad knowledge to help you brainstorm, edit, and write.
                </>
              )}
            </p>
            {useVault && vaultSources.length > 0 && (
              <p className="text-[#521118]/70 text-[11px] mt-3 font-bold bg-[#521118]/5 inline-block px-3 py-1 rounded-full">
                {vaultSources.length} source{vaultSources.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl p-4 shadow-sm ${m.role === 'user' ? 'bg-[#521118] text-white ml-6 rounded-tr-sm' : 'bg-white border border-[#2b090d]/10 mr-6 rounded-tl-sm'}`}
          >
            {m.role === 'assistant' && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[#521118] text-[10px]">✦</span>
                <span className="text-[#521118] text-[10px] font-bold uppercase tracking-widest">
                  Co-pilot
                </span>
              </div>
            )}
            <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'text-white/95' : 'text-[#2b090d]/80'}`}>{m.content}</p>

            {m.documentEdit && (
              <button
                onClick={() => onApplyEdit(m.documentEdit!)}
                className="w-full mt-3 py-2 bg-[#521118]/5 text-[#521118] border border-[#521118]/10 text-[12px] font-bold rounded-xl hover:bg-[#521118] hover:text-white transition-all shadow-sm group"
              >
                <span className="group-hover:-translate-y-0.5 inline-block transition-transform">✎</span> Apply Edit to Document
              </button>
            )}
            {m.inlineCitation && (
              <button
                onClick={() => onInsertCitation(m.inlineCitation!)}
                className="w-full mt-2 py-2 border border-[#2b090d]/20 text-[#2b090d]/70 text-[12px] font-bold rounded-xl hover:bg-[#2b090d]/5 hover:text-[#2b090d] transition-all"
              >
                ↳ Insert Citation
              </button>
            )}
            <p className={`text-[10px] mt-2 text-right ${m.role === 'user' ? 'text-white/50' : 'text-[#2b090d]/40'}`}>{timeStr(m.timestamp)}</p>
          </div>
        ))}

        {loading && (
          <div className="bg-white border border-[#2b090d]/10 mr-6 rounded-2xl rounded-tl-sm p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-[#521118] text-[10px]">✦</span>
              <span className="text-[#521118] text-[10px] font-bold uppercase tracking-widest">Co-pilot</span>
            </div>
            <div className="flex gap-1.5 items-center pl-1">
              {[0, 200, 400].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-[#521118]/60 animate-bounce"
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
        <div className="px-4 pb-2 shrink-0">
          <p className="text-[10px] text-[#2b090d]/40 font-bold uppercase tracking-widest mb-2 px-1">Quick actions</p>
          <div className="flex flex-col gap-1.5">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => send(a.prompt)}
                className="text-left px-3 py-2 bg-white border border-[#2b090d]/10 rounded-xl text-[#2b090d]/70 text-[12px] font-semibold hover:border-[#521118]/30 hover:text-[#521118] hover:shadow-sm transition-all"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-white/50 border-t border-[#2b090d]/10 shrink-0">
        <div className="flex gap-2 items-end bg-white border border-[#2b090d]/15 rounded-2xl p-1.5 shadow-sm focus-within:border-[#521118]/40 focus-within:shadow-md transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask Co-pilot..."
            rows={1}
            disabled={loading}
            className="flex-1 bg-transparent text-[#2b090d] text-[13px] px-2 py-1.5 resize-none outline-none placeholder:text-[#2b090d]/30 min-h-[36px] max-h-[120px]"
            style={{ fontFamily: 'inherit' }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="w-8 h-8 mb-0.5 mr-0.5 shrink-0 rounded-xl flex items-center justify-center font-bold text-base transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-[#521118] text-white hover:bg-[#8B1A1A] shadow-sm"
          >
            ↑
          </button>
        </div>
        <p className="text-[10px] font-semibold text-[#2b090d]/30 text-center mt-2.5">
          Locked to vault · Shift+Enter for newline
        </p>
      </div>
    </div>
  );
}