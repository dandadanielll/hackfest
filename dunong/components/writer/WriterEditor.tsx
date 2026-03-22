'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Notebook, LibraryFolder, CitationFormat } from '@/lib/writer.types';
import {
  saveNotebook, renameNotebook, saveDocumentToVault,
  getVaultSources, countWords, formatLastSaved,
} from '@/lib/writerStorage';
import { exportToDocx } from '@/lib/exportDocx';
import VaultCopilot from './VaultCopilot';
import CitationsPanel from './CitationsPanel';

interface Props {
  notebook: Notebook;
  folder: LibraryFolder;
  onBack: () => void;
}

const FONT_FAMILIES = ['Georgia', 'Times New Roman', 'Arial', 'Helvetica', 'Courier New', 'Verdana'];
const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24', '28', '32'];
const PARA_STYLES = [
  { label: 'Normal text', tag: 'p' },
  { label: 'Heading 1', tag: 'h1' },
  { label: 'Heading 2', tag: 'h2' },
  { label: 'Heading 3', tag: 'h3' },
  { label: 'Heading 4', tag: 'h4' },
];

export default function WriterEditor({ notebook, folder, onBack }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [docName, setDocName] = useState(notebook.name);
  const [editingName, setEditingName] = useState(false);
  const [wordCount, setWordCount] = useState(notebook.wordCount ?? 0);
  const [savedTs, setSavedTs] = useState(notebook.lastSaved);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>(notebook.citationFormat ?? 'APA');
  const [showCitations, setShowCitations] = useState(false);
  const [vaultSources, setVaultSources] = useState(getVaultSources(folder.id));
  const [selectedText, setSelectedText] = useState('');
  const [vaultSaved, setVaultSaved] = useState(false);

  // Toolbar state
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false });
  const [currentFont, setCurrentFont] = useState('Georgia');
  const [currentSize, setCurrentSize] = useState('12');
  const [textColor, setTextColor] = useState('#000000');
  const [hlColor, setHlColor] = useState('#FFFF00');

  // Init editor content once
  useEffect(() => {
    if (editorRef.current && notebook.content) {
      editorRef.current.innerHTML = notebook.content;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh vault if folder changes
  useEffect(() => {
    setVaultSources(getVaultSources(folder.id));
  }, [folder.id]);

  // Track selection for toolbar state
  const onSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    setSelectedText(sel?.toString().trim() ?? '');
    setFmt({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strike: document.queryCommandState('strikeThrough'),
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [onSelectionChange]);

  // Refresh last-saved label every 30s
  useEffect(() => {
    const id = setInterval(() => setSavedTs((t) => t), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-save
  const triggerAutoSave = useCallback(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      const content = editorRef.current?.innerHTML ?? '';
      const wc = countWords(content);
      const saved = saveNotebook(notebook.id, { content, wordCount: wc, citationFormat });
      if (saved) { setSavedTs(saved.lastSaved); setWordCount(wc); }
    }, 800);
  }, [notebook.id, citationFormat]);

  useEffect(() => () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); }, []);

  // Editor commands
  const exec = useCallback((cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    triggerAutoSave();
  }, [triggerAutoSave]);

  const handleInsertTable = () => {
    const rows = parseInt(prompt('Rows:', '3') ?? '3', 10);
    const cols = parseInt(prompt('Columns:', '3') ?? '3', 10);
    if (!rows || !cols) return;
    let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++)
        html += '<td style="border:1px solid #ccc;padding:6px 8px;min-width:60px">&nbsp;</td>';
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    exec('insertHTML', html);
  };

  const handleInsertInlineCitation = (citation: string, _sourceId: string) => {
    exec('insertHTML', `<span style="color:#8B1A1A;font-weight:500">&nbsp;${citation}&nbsp;</span>`);
  };

  const handleInsertBibliography = (formatted: string, _fmt: CitationFormat) => {
    const entries = formatted.split('\n\n').map((e) =>
      `<p style="margin-bottom:12pt;padding-left:40px;text-indent:-40px">${e}</p>`
    ).join('');
    exec('insertHTML',
      `<hr style="margin:24px 0;border-color:#ccc">
       <h2 style="font-size:16pt;font-weight:bold;margin-bottom:12pt">References</h2>
       <div style="font-size:12pt;line-height:1.6">${entries}</div>`
    );
    setShowCitations(false);
  };

  const handleApplyEdit = (text: string) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) exec('insertText', text);
    else exec('insertHTML', `<p>${text}</p>`);
  };

  const handleSaveToVault = () => {
    const content = editorRef.current?.innerHTML ?? '';
    saveNotebook(notebook.id, { content });
    saveDocumentToVault(folder.id, notebook.id);
    setVaultSaved(true);
    setTimeout(() => setVaultSaved(false), 2500);
  };

  const handleRename = (name: string) => {
    if (!name.trim()) return;
    setDocName(name.trim());
    renameNotebook(notebook.id, name.trim());
    setEditingName(false);
  };

  const handleRemoveHighlight = () => {
    exec('hiliteColor', 'transparent');
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F0E8] overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b border-[#E8DFD0] shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="px-3 py-1.5 border border-[#D0C4B8] rounded-md text-xs text-gray-500 hover:bg-gray-50 transition-colors shrink-0"
          >
            ← Back
          </button>
          {editingName ? (
            <input
              autoFocus
              defaultValue={docName}
              className="font-bold text-base text-[#1A0A00] border-0 border-b-2 border-[#8B1A1A] outline-none bg-transparent max-w-xs"
              style={{ fontFamily: 'Georgia, serif' }}
              onBlur={(e) => handleRename(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename((e.target as HTMLInputElement).value)}
            />
          ) : (
            <span
              onClick={() => setEditingName(true)}
              className="font-bold text-base text-[#1A0A00] cursor-pointer truncate max-w-xs hover:border-b hover:border-dashed hover:border-gray-400"
              style={{ fontFamily: 'Georgia, serif' }}
              title="Click to rename"
            >
              {docName}
            </span>
          )}
          <span className="text-[11px] text-gray-400 shrink-0">{formatLastSaved(savedTs)}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">{wordCount.toLocaleString()} words</span>
          <button
            onClick={() => setShowCitations(!showCitations)}
            className="px-3 py-1.5 border border-[#D0C4B8] rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Citations
          </button>
          <button
            onClick={() => exportToDocx(editorRef.current?.innerHTML ?? '', docName)}
            className="px-3 py-1.5 border border-[#D0C4B8] rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Export .docx
          </button>
          <button
            onClick={handleSaveToVault}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors ${vaultSaved ? 'bg-green-600' : 'bg-[#1A0A00] hover:bg-[#2D1500]'
              }`}
          >
            {vaultSaved ? '✓ Saved to Vault' : 'Save to Vault'}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-3 py-1.5 bg-white border-b border-[#E8DFD0] shrink-0">

        {/* Undo / Redo */}
        <Btn onMouseDown={() => exec('undo')} title="Undo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7v6h6" /><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" /></svg>
        </Btn>
        <Btn onMouseDown={() => exec('redo')} title="Redo">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" /></svg>
        </Btn>

        <div className="w-px h-5 bg-[#E0D8CC] mx-1" />

        {/* Paragraph style */}
        <select
          className="h-7 px-1.5 border border-[#D0C4B8] rounded text-[12px] bg-white cursor-pointer outline-none mr-1"
          onChange={(e) => { editorRef.current?.focus(); document.execCommand('formatBlock', false, e.target.value); triggerAutoSave(); }}
          defaultValue="p"
        >
          {PARA_STYLES.map((s) => (
            <option key={s.tag} value={s.tag}>{s.label}</option>
          ))}
        </select>

        <div className="w-px h-5 bg-[#E0D8CC] mx-1" />

        {/* Font family */}
        <select
          className="h-7 px-1.5 border border-[#D0C4B8] rounded text-[12px] bg-white cursor-pointer outline-none w-[130px]"
          value={currentFont}
          onChange={(e) => { setCurrentFont(e.target.value); exec('fontName', e.target.value); }}
        >
          {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>

        {/* Font size */}
        <select
          className="h-7 px-1 border border-[#D0C4B8] rounded text-[12px] bg-white cursor-pointer outline-none w-14 ml-1"
          value={currentSize}
          onChange={(e) => {
            setCurrentSize(e.target.value);
            exec('fontSize', '7');
            editorRef.current?.querySelectorAll('font[size="7"]').forEach((el) => {
              (el as HTMLElement).removeAttribute('size');
              (el as HTMLElement).style.fontSize = `${e.target.value}pt`;
            });
          }}
        >
          {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="w-px h-5 bg-[#E0D8CC] mx-1" />

        {/* Bold / Italic / Underline / Strike */}
        <Btn active={fmt.bold} onMouseDown={() => exec('bold')} title="Bold"><b>B</b></Btn>
        <Btn active={fmt.italic} onMouseDown={() => exec('italic')} title="Italic"><i>I</i></Btn>
        <Btn active={fmt.underline} onMouseDown={() => exec('underline')} title="Underline"><u>U</u></Btn>
        <Btn active={fmt.strike} onMouseDown={() => exec('strikeThrough')} title="Strikethrough"><s>S</s></Btn>

        <div className="w-px h-5 bg-[#E0D8CC] mx-1" />

        {/* Text color */}
        <label className="relative w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 cursor-pointer" title="Text color">
          <span className="text-sm font-bold pointer-events-none" style={{ color: textColor }}>A</span>
          <input
            type="color"
            value={textColor}
            onChange={(e) => { setTextColor(e.target.value); exec('foreColor', e.target.value); }}
            className="absolute opacity-0 inset-0 cursor-pointer w-full h-full"
          />
        </label>

        {/* Highlight color */}
        <label className="relative w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 cursor-pointer" title="Highlight color">
          <span className="text-sm font-bold pointer-events-none px-0.5 rounded-sm" style={{ backgroundColor: hlColor }}>H</span>
          <input
            type="color"
            value={hlColor}
            onChange={(e) => { setHlColor(e.target.value); exec('hiliteColor', e.target.value); }}
            className="absolute opacity-0 inset-0 cursor-pointer w-full h-full"
          />
        </label>

        {/* Remove highlight */}
        <Btn onMouseDown={handleRemoveHighlight} title="Remove highlight">
          <span className="text-[11px] font-bold line-through opacity-60">H</span>
        </Btn>

        <div className="w-px h-5 bg-[#E0D8CC] mx-1" />

        {/* Alignment */}
        <Btn onMouseDown={() => exec('justifyLeft')} title="Align left">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="1" width="14" height="2" />
            <rect x="0" y="5" width="10" height="2" />
            <rect x="0" y="9" width="14" height="2" />
            <rect x="0" y="13" width="8" height="2" />
          </svg>
        </Btn>
        <Btn onMouseDown={() => exec('justifyCenter')} title="Center">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="1" width="14" height="2" />
            <rect x="2" y="5" width="10" height="2" />
            <rect x="0" y="9" width="14" height="2" />
            <rect x="3" y="13" width="8" height="2" />
          </svg>
        </Btn>
        <Btn onMouseDown={() => exec('justifyRight')} title="Align right">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="1" width="14" height="2" />
            <rect x="4" y="5" width="10" height="2" />
            <rect x="0" y="9" width="14" height="2" />
            <rect x="6" y="13" width="8" height="2" />
          </svg>
        </Btn>
        <Btn onMouseDown={() => exec('justifyFull')} title="Justify">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="1" width="14" height="2" />
            <rect x="0" y="5" width="14" height="2" />
            <rect x="0" y="9" width="14" height="2" />
            <rect x="0" y="13" width="14" height="2" />
          </svg>
        </Btn>

        <div className="w-px h-5 bg-[#E0D8CC] mx-1" />

        {/* Lists */}
        <Btn onMouseDown={() => exec('insertUnorderedList')} title="Bullet list">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="1.5" cy="2.5" r="1.5" />
            <rect x="4" y="1.5" width="10" height="2" />
            <circle cx="1.5" cy="7" r="1.5" />
            <rect x="4" y="6" width="10" height="2" />
            <circle cx="1.5" cy="11.5" r="1.5" />
            <rect x="4" y="10.5" width="10" height="2" />
          </svg>
        </Btn>
        <Btn onMouseDown={() => exec('insertOrderedList')} title="Numbered list">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <text x="0" y="4" fontSize="4" fontWeight="bold">1.</text>
            <rect x="4" y="1.5" width="10" height="2" />
            <text x="0" y="8.5" fontSize="4" fontWeight="bold">2.</text>
            <rect x="4" y="6" width="10" height="2" />
            <text x="0" y="13" fontSize="4" fontWeight="bold">3.</text>
            <rect x="4" y="10.5" width="10" height="2" />
          </svg>
        </Btn>

        <div className="w-px h-5 bg-[#E0D8CC] mx-1" />

        {/* Indent / Outdent */}
        <Btn onMouseDown={() => exec('indent')} title="Indent">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="1" width="14" height="1.5" />
            <rect x="4" y="4.5" width="10" height="1.5" />
            <rect x="4" y="8" width="10" height="1.5" />
            <rect x="0" y="11.5" width="14" height="1.5" />
            <path d="M0 4.5l3 3-3 3V4.5z" />
          </svg>
        </Btn>
        <Btn onMouseDown={() => exec('outdent')} title="Outdent">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <rect x="0" y="1" width="14" height="1.5" />
            <rect x="4" y="4.5" width="10" height="1.5" />
            <rect x="4" y="8" width="10" height="1.5" />
            <rect x="0" y="11.5" width="14" height="1.5" />
            <path d="M3.5 4.5l-3 3 3 3V4.5z" />
          </svg>
        </Btn>

        <div className="w-px h-5 bg-[#E0D8CC] mx-1" />

        {/* Insert Table */}
        <Btn onMouseDown={handleInsertTable} title="Insert table">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="1" y="1" width="12" height="12" rx="1" />
            <line x1="1" y1="5" x2="13" y2="5" />
            <line x1="1" y1="9" x2="13" y2="9" />
            <line x1="5" y1="1" x2="5" y2="13" />
            <line x1="9" y1="1" x2="9" y2="13" />
          </svg>
        </Btn>
      </div>

      {/* Body: Editor + Copilot */}
      <div className="flex flex-1 overflow-hidden">

        {/* Editor scroll area */}
        <div className="flex-1 overflow-auto py-10 px-8 bg-[#F5F0E8]">
          <div className="max-w-[760px] mx-auto bg-white rounded shadow-md min-h-[1056px] px-20 py-[72px]">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={triggerAutoSave}
              data-placeholder="Start drafting your research paper here…"
              className="min-h-[900px] text-[#1A0A00] outline-none focus:outline-none"
              style={{ fontFamily: 'Georgia, serif', fontSize: '12pt', lineHeight: '1.6' }}
            />
          </div>
        </div>

        {/* Vault Co-pilot */}
        <VaultCopilot
          vaultSources={vaultSources}
          folderName={folder.name}
          citationFormat={citationFormat}
          selectedText={selectedText}
          onApplyEdit={handleApplyEdit}
          onInsertCitation={(citation) =>
            exec('insertHTML', `<span style="color:#8B1A1A;font-weight:500">&nbsp;${citation}&nbsp;</span>`)
          }
        />
      </div>

      {/* Citations Panel */}
      <CitationsPanel
        isOpen={showCitations}
        onClose={() => setShowCitations(false)}
        vaultSources={vaultSources}
        citationFormat={citationFormat}
        onFormatChange={(f) => { setCitationFormat(f); saveNotebook(notebook.id, { citationFormat: f }); }}
        onInsertInlineCitation={handleInsertInlineCitation}
        onInsertBibliography={handleInsertBibliography}
        notebookId={notebook.id}
      />

      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #C0B8A8;
          pointer-events: none;
        }
        [contenteditable] h1 { font-size: 2em; font-weight: bold; margin: .67em 0; }
        [contenteditable] h2 { font-size: 1.5em; font-weight: bold; margin: .75em 0; }
        [contenteditable] h3 { font-size: 1.17em; font-weight: bold; margin: .83em 0; }
        [contenteditable] h4 { font-size: 1em; font-weight: bold; margin: 1.12em 0; }
        [contenteditable] p  { margin: 0 0 .5em; }
        [contenteditable] ul, [contenteditable] ol { padding-left: 2em; margin: .5em 0; }
        [contenteditable] table { border-collapse: collapse; }
        [contenteditable] td, [contenteditable] th { border: 1px solid #ccc; padding: 6px 8px; min-width: 60px; }
      `}</style>
    </div>
  );
}

function Btn({ children, onMouseDown, active, title }: {
  children: React.ReactNode;
  onMouseDown: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
      className={`w-7 h-7 flex items-center justify-center rounded text-[13px] transition-colors ${active ? 'bg-[#E8DFD0] text-[#8B1A1A]' : 'text-gray-600 hover:bg-gray-100'
        }`}
    >
      {children}
    </button>
  );
}