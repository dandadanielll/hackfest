'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Notebook } from '@/lib/libraryStore';
import type { LibraryFolder } from '@/lib/writer.types';
import type { CitationFormat } from '@/lib/writer.types';
import {
  saveNotebook, getVaultSources, countWords, formatLastSaved,
} from '@/lib/writerStorage';
import { useLibrary } from '@/lib/libraryContext';
import { exportToDocxFormat, exportToPDF } from '@/lib/exportDocx';
import VaultCopilot from './VaultCopilot';
import CitationsPanel from './CitationsPanel';
import DocumentNavigator from './DocumentNavigator';
import { RiGeminiLine } from 'react-icons/ri';

interface Props {
  notebook: Notebook;
  folder: LibraryFolder;
  onBack: () => void;
}

const FONT_FAMILIES = ['Georgia', 'Times New Roman', 'Arial', 'Helvetica', 'Courier New', 'Verdana'];
const FONT_SIZES = ['10', '11', '12', '14', '16', '18', '20', '24', '28', '32'];
const PAPER_SIZES: Record<string, { label: string; width: number; height: number }> = {
  Letter: { label: 'Letter (8.5" x 11")', width: 816, height: 1056 },
  Legal: { label: 'Legal (8.5" x 14")', width: 816, height: 1344 },
  A4: { label: 'A4 (210 x 297mm)', width: 816, height: 1123 },
};

const PARA_STYLES = [
  { label: 'Normal text', tag: 'p' },
  { label: 'Heading 1', tag: 'h1' },
  { label: 'Heading 2', tag: 'h2' },
  { label: 'Heading 3', tag: 'h3' },
  { label: 'Heading 4', tag: 'h4' },
];

const Btn = ({ children, onMouseDown, title, active }: { children: React.ReactNode; onMouseDown: () => void; title: string, active?: boolean }) => (
  <button
    onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
    title={title}
    className={`p-2 rounded-lg transition-all hover:scale-105 active:scale-95 ${active ? 'bg-[#521118]/10 text-[#521118]' : 'text-[#2b090d]/60 hover:bg-[#2b090d]/5'}`}
  >
    {children}
  </button>
);

// --- PageSheet component to prevent cursor reset ---
const PageSheet = ({ 
  page, idx, activePageIndex, proposals, acceptProposal, rejectProposal, 
  onPageFocus, onInput, onKeyDown, onKeyUp, currentFont, currentSize, 
  paperSize, headerContent, footerContent, onHeaderChange, onFooterChange 
}: any) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const size = PAPER_SIZES[paperSize] || PAPER_SIZES.Letter;

  // Load content only once or when ID changes fundamentally
  useEffect(() => {
    if (editorRef.current && (!initialized.current || editorRef.current.innerHTML === "")) {
      editorRef.current.innerHTML = page.content;
      initialized.current = true;
    }
    // Only update headers/footers if NOT focused to preserve cursor position
    if (headerRef.current && document.activeElement !== headerRef.current) {
      headerRef.current.innerHTML = headerContent;
    }
    if (footerRef.current && document.activeElement !== footerRef.current) {
      footerRef.current.innerHTML = footerContent;
    }
  }, [page.id, headerContent, footerContent]);

  return (
    <div
      id={`page-sheet-${idx}`}
      className={`bg-white shadow-[0_20px_60px_rgba(43,9,13,0.08)] relative transition-all duration-300 border border-[#2b090d]/5 flex flex-col
        ${activePageIndex === idx ? 'ring-1 ring-[#521118]/10' : 'opacity-98'}
      `}
      style={{ width: '100%', maxWidth: `${size.width}px`, minHeight: `${size.height}px` }}
      onMouseDown={onPageFocus}
    >
      {/* Universal Header (Editable) */}
      <div 
        ref={headerRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e: any) => onHeaderChange(e.target.innerHTML)}
        className="h-24 px-4 md:px-[96px] pt-8 flex items-center justify-between text-[11px] text-[#2b090d] outline-none border-b border-transparent focus:border-[#521118]/20 transition-colors group relative"
      >
        <div className="absolute right-8 top-8 text-[9px] font-bold text-[#5a1a1a]/20 uppercase tracking-[0.2em] opacity-0 group-focus:opacity-100 transition-opacity">HEADER</div>
      </div>

      {proposals.map((p: any) => (
        <div
          key={p.id}
          className="absolute z-[100] flex flex-col gap-1.5 bg-white/95 backdrop-blur-xl border border-[#521118]/20 p-2 rounded-2xl shadow-[0_12px_40px_rgba(43,9,13,0.15)] ring-1 ring-[#521118]/5 origin-top-left animate-in fade-in zoom-in-95 duration-200"
          style={{ top: p.top - 10, left: Math.min(p.left + 10, size.width - 150) }}
        >
          <div className="px-1 flex items-center justify-between gap-4">
            <span className="text-[10px] font-black text-[#521118] uppercase tracking-widest flex items-center gap-1.5">
              <RiGeminiLine className="text-[#8B1A1A] w-[14px] h-[14px]" />
              AI PROPOSAL
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-[#f9f7f4] p-1 rounded-xl border border-[#2b090d]/5">
            <button 
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); acceptProposal(p.id); }} 
              className="group relative flex-1 px-4 h-9 flex items-center justify-center gap-1.5 bg-[#521118] text-white hover:bg-[#8B1A1A] rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#521118]/20 overflow-hidden active:scale-95"
              title="Accept Edit"
            >
              <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:scale-110"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ACCEPT
            </button>
            <button 
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); rejectProposal(p.id); }} 
              className="flex-1 px-3 h-7 flex items-center justify-center gap-1 bg-white text-[#2b090d]/60 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border border-[#2b090d]/10 hover:scale-105 active:scale-95 rounded-lg transition-all font-bold text-[11px] shadow-sm"
              title="Reject Edit"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              REJECT
            </button>
          </div>
        </div>
      ))}

      <div
        id={`page-editor-${idx}`}
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={onInput}
        onKeyDown={(e) => { onPageFocus(); onKeyDown(e, idx); }}
        onKeyUp={onKeyUp}
        onFocus={onPageFocus}
        data-placeholder="Start drafting your research paper here..."
        className="flex-1 px-4 md:px-[96px] py-4 md:py-[32px] text-[#2b090d] outline-none focus:outline-none placeholder-shown:text-gray-300 relative z-10"
        style={{ fontFamily: `${currentFont}, serif`, fontSize: `${currentSize}pt`, lineHeight: '1.8' }}
      />

      {/* Universal Footer (Editable) */}
      <div 
        ref={footerRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(e: any) => onFooterChange(e.target.innerHTML)}
        className="h-24 px-4 md:px-[96px] pb-8 flex items-end justify-between text-[11px] text-[#2b090d] outline-none border-t border-transparent focus:border-[#521118]/20 transition-colors group relative"
      >
        <div className="absolute right-8 bottom-8 flex items-center gap-4 text-[9px] font-bold text-[#5a1a1a]/20 uppercase tracking-[0.2em]">
          <span className="opacity-0 group-focus:opacity-100 transition-opacity">FOOTER</span>
          <span className="text-[#5a1a1a]/40">PAGE {idx + 1}</span>
        </div>
      </div>
    </div>
  );
};

export default function WriterEditor({ notebook, folder, onBack }: Props) {
  const { editNotebook } = useLibrary();
  const viewportRef = useRef<HTMLDivElement>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const proposalsObserverRef = useRef<MutationObserver | null>(null);
  const [docName, setDocName] = useState(notebook.name);
  const [editingName, setEditingName] = useState(false);
  const [wordCount, setWordCount] = useState(notebook.wordCount ?? 0);
  const [savedTs, setSavedTs] = useState(notebook.updatedAt);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>(notebook.citationFormat ?? 'APA');
  const [showCitations, setShowCitations] = useState(false);
  const [vaultSources, setVaultSources] = useState(() => getVaultSources(folder.id));
  const [selectedText, setSelectedText] = useState('');

  // Multi-Page state — default research template for new notebooks
  const [pages, setPages] = useState<any[]>(() => {
    if (notebook.pages && notebook.pages.length > 0) return notebook.pages;
    // Default research paper template
    return [
      {
        id: 'p1', title: 'Title Page',
        content: `<h1 style="text-align:center;margin-top:120px;">Research Title</h1><p style="text-align:center;"><br/></p><p style="text-align:center;">Author Name(s)</p><p style="text-align:center;">Institution / University</p><p style="text-align:center;">Course Code &amp; Section</p><p style="text-align:center;">Instructor / Adviser</p><p style="text-align:center;">Date Submitted</p>`
      },
      {
        id: 'p2', title: 'Chapter 1 — Introduction',
        content: `<h1>Chapter 1</h1><h2>Introduction</h2><p></p><h3>Background of the Study</h3><p></p><h3>Statement of the Problem</h3><p></p><h3>Objectives of the Study</h3><p></p><h3>Significance of the Study</h3><p></p><h3>Scope and Limitations</h3><p></p><h3>Definition of Terms</h3><p></p>`
      },
      {
        id: 'p3', title: 'Chapter 2 — Review of Related Literature',
        content: `<h1>Chapter 2</h1><h2>Review of Related Literature</h2><p></p><h3>Related Literature</h3><p></p><h3>Related Studies</h3><p></p><h3>Conceptual Framework</h3><p></p><h3>Theoretical Framework</h3><p></p>`
      },
      {
        id: 'p4', title: 'Chapter 3 — Methodology',
        content: `<h1>Chapter 3</h1><h2>Methodology</h2><p></p><h3>Research Design</h3><p></p><h3>Participants / Respondents</h3><p></p><h3>Sampling Method</h3><p></p><h3>Data Collection Instrument</h3><p></p><h3>Data Collection Procedure</h3><p></p><h3>Data Analysis</h3><p></p>`
      },
      {
        id: 'p5', title: 'Chapter 4 — Results & Discussion',
        content: `<h1>Chapter 4</h1><h2>Results and Discussion</h2><p></p><h3>Presentation of Results</h3><p></p><h3>Analysis and Discussion</h3><p></p><h2>Chapter 5: Conclusion</h2><h3>Conclusion</h3><p></p><h3>Recommendations</h3><p></p><h2>References</h2><p></p>`
      },
    ];
  });
  const [activePageIndex, setActivePageIndex] = useState(0);

  // AI Proposals state
  const [proposals, setProposals] = useState<{ id: string; top: number; left: number; text: string; pageId: string }[]>([]);

  // Toolbar state
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false });
  const [currentFont, setCurrentFont] = useState('Georgia');
  const [currentSize, setCurrentSize] = useState('12');
  const [textColor, setTextColor] = useState('#000000');
  const [hlColor, setHlColor] = useState('#FFFF00');

  // Page Setup state
  const [paperSize, setPaperSize] = useState<'Letter' | 'Legal' | 'A4'>((notebook as any).paperSize || 'Letter');
  const [headerContent, setHeaderContent] = useState((notebook as any).header || '');
  const [footerContent, setFooterContent] = useState((notebook as any).footer || '');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHeaderModal, setShowHeaderModal] = useState<'header' | 'footer' | null>(null);



  // Refresh vault sources when folder changes
  useEffect(() => {
    setVaultSources(getVaultSources(folder.id));
  }, [folder.id, folder.vault]);

  // Track selection for toolbar state
  const onSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text !== selectedText) {
      setSelectedText(text);
    }

    // Probe styles at cursor
    if (sel && sel.rangeCount > 0) {
      const parent = sel.getRangeAt(0).commonAncestorContainer;
      const element = parent.nodeType === 1 ? (parent as HTMLElement) : parent.parentElement;
      if (element) {
        const style = window.getComputedStyle(element);
        
        // Clean font family
        const font = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
        if (font && FONT_FAMILIES.includes(font)) {
          setCurrentFont(font);
        }

        // Convert px to approximate pt (px * 0.75)
        const px = parseFloat(style.fontSize);
        const pt = Math.round(px * 0.75).toString();
        if (FONT_SIZES.includes(pt)) {
          setCurrentSize(pt);
        }
      }
    }

    setFmt(prev => {
      const next = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
      };
      if (prev.bold === next.bold && prev.italic === next.italic && prev.underline === next.underline && prev.strike === next.strike) {
        return prev;
      }
      return next;
    });
  }, [selectedText]);

  useEffect(() => {
    document.addEventListener('selectionchange', onSelectionChange);
    // Use CSS for styling instead of <font> tags for better reliability
    document.execCommand('styleWithCSS', false, 'true');
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [onSelectionChange]);

  // Refresh last-saved label every 30s
  useEffect(() => {
    const id = setInterval(() => setSavedTs((t) => t), 30_000);
    return () => clearInterval(id);
  }, []);

  // Auto-save: write to unified library store via editNotebook
  const triggerAutoSave = useCallback((instantFlow = false) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);

    const run = () => {
      // 1. Collect content and BALANCE FLOW
      const limit = PAPER_SIZES[paperSize].height - 192; // Subtract header/footer padding
      let notebookPages = [...pages];
      let needsRerender = false;
      let focusedPageIdx = -1;

      // Simple balancing logic: move overflowing content to next page
      for (let i = 0; i < notebookPages.length; i++) {
        const el = document.getElementById(`page-editor-${i}`);
        if (el && el.scrollHeight > limit) {
          const lastNode = el.lastElementChild;
          if (lastNode && lastNode.innerHTML.trim() !== "" && lastNode.innerHTML !== "<br>") {
             const nextIdx = i + 1;
             const nodeHtml = lastNode.outerHTML;
             
             // If cursor is inside this node, we'll want to move focus
             const selection = window.getSelection();
             const isCursorInside = el.contains(selection?.anchorNode || null) && lastNode.contains(selection?.anchorNode || null);

             lastNode.remove();
             
             if (nextIdx < notebookPages.length) {
                notebookPages[nextIdx] = { ...notebookPages[nextIdx], content: nodeHtml + (notebookPages[nextIdx].content || "") };
             } else {
                notebookPages.push({ id: `p-${Date.now()}`, title: `Page ${nextIdx + 1}`, content: nodeHtml });
             }
             
             if (isCursorInside) focusedPageIdx = nextIdx;
             needsRerender = true;
          }
        }
      }

      const updatedPages = notebookPages.map((page, idx) => {
        const el = document.getElementById(`page-editor-${idx}`);
        return { ...page, content: el ? el.innerHTML : page.content };
      });

      const totalContent = updatedPages.map(p => p.content).join(' ');
      const wc = countWords(totalContent);

      const notebookData = { 
        pages: updatedPages, 
        wordCount: wc, 
        citationFormat,
        paperSize,
        header: headerContent,
        footer: footerContent
      };

      editNotebook(folder.id, notebook.id, notebookData);
      saveNotebook(notebook.id, notebookData);
      setWordCount(wc);
      if (needsRerender) {
         setPages(updatedPages);
         if (focusedPageIdx !== -1) {
            setActivePageIndex(focusedPageIdx);
            setTimeout(() => {
                const nextEditor = document.getElementById(`page-editor-${focusedPageIdx}`);
                nextEditor?.focus();
            }, 50);
         }
      }
      setSavedTs(Date.now());
    };

    if (instantFlow) run();
    else autoSaveRef.current = setTimeout(run, 1000);
  }, [notebook.id, folder.id, citationFormat, editNotebook, pages, paperSize, headerContent, footerContent]);

  useEffect(() => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);
    if (proposalsObserverRef.current) proposalsObserverRef.current.disconnect();
  }, []);

  // Update proposals position — coordinates relative to the page-sheet
  const updateProposals = useCallback(() => {
    const nextProposals: any[] = [];
    pages.forEach((page, idx) => {
      const sheetEl = document.getElementById(`page-sheet-${idx}`);
      const editorEl = document.getElementById(`page-editor-${idx}`);
      if (!sheetEl || !editorEl) return;

      const sheetRect = sheetEl.getBoundingClientRect();

      editorEl.querySelectorAll('.ai-proposal').forEach((el) => {
        const rect = el.getBoundingClientRect();
        nextProposals.push({
          id: (el as HTMLElement).dataset.proposalId || '',
          top: rect.top - sheetRect.top,
          left: rect.right - sheetRect.left + 8,
          text: el.textContent || '',
          pageId: page.id
        });
      });
    });
    setProposals(prev => {
      if (prev.length !== nextProposals.length) return nextProposals;
      let isDifferent = false;
      for (let i = 0; i < prev.length; i++) {
        if (
          prev[i].id !== nextProposals[i].id ||
          Math.abs(prev[i].top - nextProposals[i].top) > 2 ||
          Math.abs(prev[i].left - nextProposals[i].left) > 2 ||
          prev[i].text !== nextProposals[i].text ||
          prev[i].pageId !== nextProposals[i].pageId
        ) {
          isDifferent = true;
          break;
        }
      }
      return isDifferent ? nextProposals : prev;
    });
  }, [pages]);

  // Scroll-Sync: Track which page is visible
  useEffect(() => {
    const container = document.getElementById('editor-viewport');
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the page with the largest intersection ratio
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          // Sort by intersection ratio to get the most "prominent" page
          visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          const idx = parseInt(visible[0].target.id.split('-').pop() || '0');
          setActivePageIndex(idx);
        }
      },
      {
        root: container,
        threshold: [0.1, 0.5, 0.9], // Multiple thresholds for better detection
        rootMargin: '-20% 0px -20% 0px' // Focus on the middle-upper part
      }
    );

    pages.forEach((_, idx) => {
      const el = document.getElementById(`page-sheet-${idx}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pages.length]);

  // Attach observer to constantly track proposals
  useEffect(() => {
    const container = document.getElementById('editor-viewport');
    proposalsObserverRef.current = new MutationObserver(() => updateProposals());

    pages.forEach((_, idx) => {
      const el = document.getElementById(`page-editor-${idx}`);
      if (el) proposalsObserverRef.current?.observe(el, { childList: true, subtree: true, characterData: true });
    });

    if (container) {
      container.addEventListener('scroll', updateProposals);
      window.addEventListener('resize', updateProposals);
    }
    updateProposals();

    return () => {
      proposalsObserverRef.current?.disconnect();
      if (container) container.removeEventListener('scroll', updateProposals);
      window.removeEventListener('resize', updateProposals);
    };
  }, [updateProposals, pages.length]);



  const acceptProposal = useCallback((id: string) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    for (let idx = 0; idx < pages.length; idx++) {
      const el = document.getElementById(`page-editor-${idx}`);
      const span = el?.querySelector(`.ai-proposal[data-proposal-id="${id}"]`) as HTMLElement | null;
      if (span && el) {
        const parent = span.parentNode;
        if (parent) {
          while (span.firstChild) parent.insertBefore(span.firstChild, span);
          parent.removeChild(span);
        }
        const updatedHTML = el.innerHTML;
        setPages(prev => prev.map((p, i) => i === idx ? { ...p, content: updatedHTML } : p));
        setProposals(prev => prev.filter(p => p.id !== id));
        
        // Immediate save
        saveNotebook(notebook.id, { 
          pages: pages.map((p, i) => i === idx ? { ...p, content: updatedHTML } : p),
          updatedAt: Date.now() 
        });
        return;
      }
    }
  }, [pages, notebook.id]);

  const rejectProposal = useCallback((id: string) => {
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    for (let idx = 0; idx < pages.length; idx++) {
      const el = document.getElementById(`page-editor-${idx}`);
      const span = el?.querySelector(`.ai-proposal[data-proposal-id="${id}"]`) as HTMLElement | null;
      if (span && el) {
        const originalHtml = span.getAttribute('data-original-html');
        if (originalHtml) {
          // Restore original content
          const deco = decodeURIComponent(originalHtml);
          span.outerHTML = deco;
        } else {
          // Just remove (it was an insertion)
          span.remove();
        }
        
        const updatedHTML = el.innerHTML;
        setPages(prev => prev.map((p, i) => i === idx ? { ...p, content: updatedHTML } : p));
        setProposals(prev => prev.filter(p => p.id !== id));
        
        // Immediate save
        saveNotebook(notebook.id, { 
          pages: pages.map((p, i) => i === idx ? { ...p, content: updatedHTML } : p),
          updatedAt: Date.now() 
        });
        return;
      }
    }
  }, [pages, notebook.id]);

  // Editor commands
  const exec = useCallback((cmd: string, value?: string) => {
    const el = document.getElementById(`page-editor-${activePageIndex}`);
    el?.focus();
    document.execCommand(cmd, false, value);
    triggerAutoSave();
  }, [triggerAutoSave, activePageIndex]);

  // --------------- Smart Ghost Autocomplete ---------------
  const cleanupGhostText = useCallback(() => {
    pages.forEach((_, idx) => {
      const ghost = document.getElementById(`page-editor-${idx}`)?.querySelector('#saliksi-ghost-text');
      if (ghost) ghost.remove();
    });
  }, [pages.length]);

  const requestAutocomplete = useCallback(async () => {
    const editor = document.getElementById(`page-editor-${activePageIndex}`);
    if (!editor) return;

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return;

    const range = sel.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.endContainer, range.endOffset);
    let textBefore = preRange.toString();

    const contextText = textBefore.slice(-800);
    if (contextText.trim().length < 10) return;

    try {
      const res = await fetch('/api/writer/autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: contextText }),
      });
      if (!res.ok) return;

      const data = await res.json();
      if (!data.suggestion) return;

      const currentSel = window.getSelection();
      if (!currentSel || currentSel.rangeCount === 0) return;
      const currentRange = currentSel.getRangeAt(0);

      // Abort if cursor moved
      if (currentRange.startContainer !== range.startContainer || currentRange.startOffset !== range.startOffset) {
        return;
      }

      cleanupGhostText();

      const span = document.createElement('span');
      span.id = 'saliksi-ghost-text';
      span.className = 'text-gray-400 select-none pointer-events-none opacity-60';
      span.contentEditable = 'false';
      let suggestion = data.suggestion;

      // Pad with space if missing
      if (textBefore && !textBefore.endsWith(' ') && !suggestion.startsWith(' ')) {
        suggestion = ' ' + suggestion;
      }
      span.textContent = suggestion;

      currentRange.insertNode(span);
      currentRange.setStartBefore(span);
      currentRange.collapse(true);
      currentSel.removeAllRanges();
      currentSel.addRange(currentRange);

    } catch (e) {
      console.error('Autocomplete error:', e);
    }
  }, [cleanupGhostText, activePageIndex]);

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const editor = document.getElementById(`page-editor-${idx}`);
    if (!editor) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const ghost = editor.querySelector('#saliksi-ghost-text');
      if (ghost) {
        // Accept ghost text
        const text = ghost.textContent || '';
        ghost.remove();
        exec('insertText', text);
      } else {
        exec('insertHTML', '&nbsp;&nbsp;&nbsp;&nbsp;');
      }
    }

    // Ctrl+S override
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      triggerAutoSave();
    }

    // Ghost text cleanup on any other key
    if (e.key !== 'Tab') {
      if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current);
      autocompleteTimeoutRef.current = setTimeout(requestAutocomplete, 2000);
      cleanupGhostText();
    }
  };

  const handleKeyUp = () => {
    onSelectionChange();
  };
  // ------------------------------------------------------

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

  const handleInsertInlineCitation = (sourceIdx: number) => {
    const s = vaultSources[sourceIdx];
    if (!s) return;
    
    // Extract Last Name reliably
    const getLastName = (name: any): string => {
      if (typeof name !== 'string') return name?.lastName || "Unknown";
      const parts = name.trim().split(/\s+/);
      if (parts.length === 0) return "Unknown";
      // Handle "Last, First" or "First Last"
      if (name.includes(',')) return parts[0].replace(',', '');
      return parts[parts.length - 1];
    };

    const author = Array.isArray(s.authors) ? getLastName(s.authors[0]) : getLastName(s.authors);
    const year = s.year || "n.d.";
    
    let citation = `(${author}, ${year})`;
    if (citationFormat === 'MLA') citation = `(${author})`;
    else if (citationFormat === 'Chicago') citation = `(${author}, ${year})`;
    
    exec('insertHTML', `<span style="color:inherit;font-family:${currentFont},serif;font-size:${currentSize}pt;">&nbsp;${citation}&nbsp;</span>`);
  };

  const handleInsertBibliography = (formatted: string, _fmt: CitationFormat) => {
    const entries = formatted.split('\n\n').map((e) =>
      `<p style="margin-bottom:12pt;padding-left:40px;text-indent:-40px;font-family:${currentFont},serif;font-size:${currentSize}pt;">${e}</p>`
    ).join('');
    exec('insertHTML',
      `<hr style="margin:24px 0;border-color:#ccc">
       <h2 style="font-family:${currentFont},serif;font-size:calc(${currentSize}pt + 4pt);font-weight:bold;margin-bottom:12pt">References</h2>
       <div style="font-family:${currentFont},serif;font-size:${currentSize}pt;line-height:1.6">${entries}</div>`
    );
    setShowCitations(false);
  };

  const handleApplyEdit = (text: string) => {
    const activeEditor = document.getElementById(`page-editor-${activePageIndex}`) as HTMLDivElement;
    if (!activeEditor) return;

    // Check for smart replacement/insertion tags
    const replaceMatch = text.match(/<REPLACE_TEXT>([\s\S]*?)<\/REPLACE_TEXT>/i);
    const targetMatch = text.match(/<INSERT_AFTER>([\s\S]*?)<\/INSERT_AFTER>/i);
    const newTextMatch = text.match(/<NEW_TEXT>([\s\S]*?)<\/NEW_TEXT>/i);

    const proposalId = `prop-${Date.now()}`;
    const newTextContent = newTextMatch ? newTextMatch[1].trim() : text.trim();
    
    // Create the proposal span with font matching and brand styling
    const style = `font-family:${currentFont},serif;font-size:${currentSize}pt;line-height:1.8;color:inherit;background:rgba(82,17,24,0.08);border-bottom:2px dashed rgba(82,17,24,0.4);border-radius:4px;`;
    let injectedHtml = `<span class="ai-proposal" data-proposal-id="${proposalId}" style="${style}">${newTextContent}</span>`;

    activeEditor.focus();
    const sel = window.getSelection();
    if (!sel) return;

    // Helper to wrap injectedHtml with original content for restoration
    const getInjectedWithOriginal = (original: string) => {
      const encoded = encodeURIComponent(original);
      return `<span class="ai-proposal" data-proposal-id="${proposalId}" data-original-html="${encoded}" style="${style}">${newTextContent}</span>`;
    };

    // SCENARIO 1: User has an active selection - Priority #1 (Direct replacement)
    if (sel.rangeCount > 0 && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const div = document.createElement('div');
      div.appendChild(range.cloneContents());
      const originalHtml = div.innerHTML;
      
      exec('insertHTML', getInjectedWithOriginal(originalHtml));
      return;
    }

    // SCENARIO 2: AI specified a text block to replace
    if (replaceMatch) {
      const replaceText = replaceMatch[1].trim();
      sel.collapse(activeEditor, 0);
      const found = (window as any).find(replaceText, false, false, true, false, false, false);
      if (found) {
        // After toggle selection, we get the HTML
        const range = sel.getRangeAt(0);
        const div = document.createElement('div');
        div.appendChild(range.cloneContents());
        const originalHtml = div.innerHTML;
        
        exec('insertHTML', getInjectedWithOriginal(originalHtml));
        return;
      }
    }

    // SCENARIO 3: AI specified where to insert after
    if (targetMatch) {
      const targetSentence = targetMatch[1].trim();
      if (targetSentence.toUpperCase() === 'START') {
        sel.collapse(activeEditor, 0);
        exec('insertHTML', `<p>${injectedHtml}</p>`);
        return;
      }

      sel.collapse(activeEditor, 0);
      const found = (window as any).find(targetSentence, false, false, true, false, false, false);
      if (found) {
        sel.collapseToEnd();
        exec('insertHTML', `&nbsp;${injectedHtml}&nbsp;`);
        return;
      }
    }

    // SCENARIO 4: Fallback - append to end
    sel.selectAllChildren(activeEditor);
    sel.collapseToEnd();
    exec('insertHTML', `<br/><br/>${injectedHtml}`);
  };

  const handleAddPage = () => {
    const newPage = {
      id: `p-${Date.now()}`,
      title: `Page ${pages.length + 1}`,
      content: '<p><br/></p>'
    };
    const nextPages = [...pages, newPage];
    setPages(nextPages);
    setActivePageIndex(nextPages.length - 1);
    editNotebook(folder.id, notebook.id, { pages: nextPages });
    saveNotebook(notebook.id, { pages: nextPages });
  };

  const handleDeletePage = (idx: number) => {
    if (pages.length <= 1) return;
    const nextPages = pages.filter((_, i) => i !== idx);
    const nextActive = idx >= nextPages.length ? nextPages.length - 1 : idx;
    setPages(nextPages);
    setActivePageIndex(nextActive);
    editNotebook(folder.id, notebook.id, { pages: nextPages });
    saveNotebook(notebook.id, { pages: nextPages });
  };

  const handleRenamePage = (idx: number, newTitle: string) => {
    const nextPages = [...pages];
    nextPages[idx] = { ...nextPages[idx], title: newTitle.trim() || `Page ${idx + 1}` };
    setPages(nextPages);
    editNotebook(folder.id, notebook.id, { pages: nextPages });
    saveNotebook(notebook.id, { pages: nextPages });
  };

  const handleRename = (name: string) => {
    if (!name.trim()) return;
    setDocName(name.trim());
    editNotebook(folder.id, notebook.id, { name: name.trim() });
    saveNotebook(notebook.id, { name: name.trim() });
    setEditingName(false);
  };

  const handleRemoveHighlight = () => {
    exec('hiliteColor', 'transparent');
  };

  return (
    <div className="flex flex-col md:flex-row absolute inset-0 bg-[#e8e4df]/40 overflow-hidden font-sans">

      <DocumentNavigator
        editorRef={viewportRef}
        pages={pages}
        activePageIndex={activePageIndex}
        onPageChange={(idx) => {
          const currentContent = document.getElementById(`page-editor-${activePageIndex}`)?.innerHTML || '';
          setPages(prev => {
            const next = [...prev];
            next[activePageIndex] = { ...next[activePageIndex], content: currentContent };
            return next;
          });
          setActivePageIndex(idx);
          const sheet = document.getElementById(`page-sheet-${idx}`);
          sheet?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        paperSize={paperSize}
        setPaperSize={(size: any) => { setPaperSize(size); triggerAutoSave(true); }}
        onAddPage={handleAddPage}
        onDeletePage={handleDeletePage}
        onRenamePage={handleRenamePage}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#f9f7f4]">

        {/* Header Bar (Title & Actions) - Now in flow */}
        <div className="shrink-0 relative z-40 px-6 py-3 flex items-start justify-between bg-white/50 backdrop-blur-sm border-b border-[#2b090d]/5">
          {/* Left: Branding & Title */}
          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md pl-2 pr-5 py-2 rounded-2xl shadow-sm border border-[#2b090d]/5">
            <button
              onClick={onBack}
              className="p-2 text-[#521118]/60 hover:text-[#521118] hover:bg-[#521118]/5 rounded-xl transition-all"
              title="Back to Library"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </button>
            <div className="w-px h-5 bg-[#2b090d]/10" />
            <div className="flex flex-col">
              {editingName ? (
                <input
                  autoFocus
                  defaultValue={docName}
                  className="font-bold text-[15px] text-[#2b090d] bg-transparent outline-none min-w-[200px]"
                  onBlur={(e) => handleRename(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRename((e.target as HTMLInputElement).value)}
                />
              ) : (
                <span
                  onClick={() => setEditingName(true)}
                  className="font-bold text-[15px] text-[#2b090d] cursor-pointer hover:text-[#521118] transition-colors"
                  title="Click to rename"
                >
                  {docName}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#2b090d]/40">
                {formatLastSaved(savedTs)}
              </span>
            </div>
          </div>

          {/* Right: Stats & Actions */}
          {/* Right: Stats & Actions */}
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-[#2b090d]/5">
            <span className="text-xs font-bold text-[#2b090d]/40 px-3">{wordCount.toLocaleString()} words</span>
            <div className="w-px h-4 bg-[#2b090d]/10 mr-1" />
            <button
              onClick={() => setShowCitations(!showCitations)}
              className="text-xs font-bold text-[#521118] bg-[#521118]/5 px-3 py-2 rounded-xl hover:bg-[#521118]/10 transition-colors"
            >
              Citations
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="group relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#e8e4df] bg-[#8B1A1A] px-5 py-2.5 rounded-xl hover:bg-[#6B1212] shadow-xl shadow-[#8B1A1A]/20 transition-all duration-300 overflow-hidden active:scale-95"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                Export
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              
              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute top-[calc(100%+8px)] right-0 z-50 w-40 bg-white border border-[#2b090d]/10 rounded-xl shadow-[0_12px_40px_rgba(43,9,13,0.15)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <button
                      onClick={() => {
                        exportToPDF(pages, docName, currentFont, parseInt(currentSize));
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#2b090d]/80 hover:bg-[#521118]/5 hover:text-[#521118] transition-colors flex items-center justify-between group"
                    >
                      Export as PDF
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                    <div className="h-px w-full bg-[#2b090d]/5" />
                    <button
                      onClick={() => {
                        exportToDocxFormat(pages, docName, currentFont, parseInt(currentSize));
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#2b090d]/80 hover:bg-[#521118]/5 hover:text-[#521118] transition-colors flex items-center justify-between group"
                    >
                      Export as .docx
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Editor Toolbar Area (Pill Ribbon) */}
        <div className="shrink-0 flex flex-col items-center relative z-30 pt-4 pb-2 px-4 shadow-sm bg-white/20">

          <div className="z-30 pointer-events-none w-full max-w-[900px] flex justify-center">
            <div className="pointer-events-auto flex items-center gap-0.5 px-3 py-1.5 bg-white/90 backdrop-blur-xl border border-[#2b090d]/10 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-x-auto no-scrollbar">

              <Btn onMouseDown={() => exec('undo')} title="Undo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" /></svg>
              </Btn>
              <Btn onMouseDown={() => exec('redo')} title="Redo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13" /></svg>
              </Btn>

              <div className="w-px h-4 bg-[#2b090d]/10 mx-1" />

              <select
                className="h-7 px-1.5 border-none bg-transparent text-[#2b090d] text-[13px] font-bold cursor-pointer outline-none hover:bg-black/5 rounded-lg transition-colors"
                onChange={(e) => { document.getElementById(`page-editor-${activePageIndex}`)?.focus(); document.execCommand('formatBlock', false, e.target.value); triggerAutoSave(); }}
                defaultValue="p"
              >
                {PARA_STYLES.map((s) => (
                  <option key={s.tag} value={s.tag}>{s.label}</option>
                ))}
              </select>

              <div className="w-px h-4 bg-[#2b090d]/10 mx-1" />

              <select
                className="h-7 px-1.5 border-none bg-transparent text-[#2b090d] text-[13px] font-bold cursor-pointer outline-none hover:bg-black/5 rounded-lg transition-colors w-24"
                value={currentFont}
                onChange={(e) => { setCurrentFont(e.target.value); exec('fontName', e.target.value); }}
              >
                {FONT_FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>

              <select
                value={currentSize}
                onChange={(e) => {
                  setCurrentSize(e.target.value);
                  exec('fontSize', '7');
                  document.getElementById(`page-editor-${activePageIndex}`)?.querySelectorAll('font[size="7"]').forEach((el) => {
                    (el as HTMLElement).removeAttribute('size');
                    (el as HTMLElement).style.fontSize = `${e.target.value}pt`;
                  });
                }}
                className="h-7 px-1 border-none bg-transparent text-[#2b090d] text-[13px] font-bold cursor-pointer outline-none hover:bg-black/5 rounded-lg transition-colors"
                title="Font Size"
              >
                {FONT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <div className="w-px h-4 bg-[#2b090d]/10 mx-1" />

              <Btn active={fmt.bold} onMouseDown={() => exec('bold')} title="Bold"><b className="font-serif text-[14px]">B</b></Btn>
              <Btn active={fmt.italic} onMouseDown={() => exec('italic')} title="Italic"><i className="font-serif text-[14px]">I</i></Btn>
              <Btn active={fmt.underline} onMouseDown={() => exec('underline')} title="Underline"><u className="font-serif text-[14px]">U</u></Btn>
              <Btn active={fmt.strike} onMouseDown={() => exec('strikeThrough')} title="Strikethrough"><s className="font-serif text-[14px]">S</s></Btn>

              <div className="w-px h-4 bg-[#2b090d]/10 mx-1" />

              <div className="relative group/color">
                <Btn onMouseDown={() => { }} title="Text color">
                  <span className="text-[14px] font-black font-serif" style={{ color: textColor }}>A</span>
                </Btn>
                <input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); exec('foreColor', e.target.value); }} className="absolute opacity-0 inset-0 cursor-pointer w-full h-full" />
              </div>

              <div className="relative group/hl">
                <Btn onMouseDown={() => { }} title="Highlight color">
                  <div className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: hlColor }} />
                </Btn>
                <input type="color" value={hlColor} onChange={(e) => { setHlColor(e.target.value); exec('hiliteColor', e.target.value); }} className="absolute opacity-0 inset-0 cursor-pointer w-full h-full" />
              </div>

              <Btn onMouseDown={handleRemoveHighlight} title="Remove highlight">
                <span className="text-[12px] font-bold line-through opacity-40">H</span>
              </Btn>

              <div className="w-px h-4 bg-[#2b090d]/10 mx-1" />

              <Btn onMouseDown={() => exec('justifyLeft')} title="Align left">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="0.5" /><rect x="0" y="4.5" width="10" height="1.5" rx="0.5" /><rect x="0" y="8" width="14" height="1.5" rx="0.5" /><rect x="0" y="11.5" width="8" height="1.5" rx="0.5" /></svg>
              </Btn>
              <Btn onMouseDown={() => exec('justifyCenter')} title="Center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="0.5" /><rect x="2" y="4.5" width="10" height="1.5" rx="0.5" /><rect x="0" y="8" width="14" height="1.5" rx="0.5" /><rect x="3" y="11.5" width="8" height="1.5" rx="0.5" /></svg>
              </Btn>
              <Btn onMouseDown={() => exec('justifyRight')} title="Align right">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="0.5" /><rect x="4" y="4.5" width="10" height="1.5" rx="0.5" /><rect x="0" y="8" width="14" height="1.5" rx="0.5" /><rect x="6" y="11.5" width="8" height="1.5" rx="0.5" /></svg>
              </Btn>
              <Btn onMouseDown={() => exec('justifyFull')} title="Justify">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="1.5" rx="0.5" /><rect x="0" y="4.5" width="14" height="1.5" rx="0.5" /><rect x="0" y="8" width="14" height="1.5" rx="0.5" /><rect x="0" y="11.5" width="14" height="1.5" rx="0.5" /></svg>
              </Btn>

              <div className="w-px h-4 bg-[#2b090d]/10 mx-1" />

              <Btn onMouseDown={() => exec('insertUnorderedList')} title="Bullet list">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><circle cx="1.5" cy="2" r="1.5" /><rect x="4" y="1" width="10" height="1.5" rx="0.5" /><circle cx="1.5" cy="7" r="1.5" /><rect x="4" y="6" width="10" height="1.5" rx="0.5" /><circle cx="1.5" cy="12" r="1.5" /><rect x="4" y="11" width="10" height="1.5" rx="0.5" /></svg>
              </Btn>
              <Btn onMouseDown={() => exec('insertOrderedList')} title="Numbered list">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><text x="0" y="4" fontSize="4.5" fontWeight="bold">1.</text><rect x="4" y="1" width="10" height="1.5" rx="0.5" /><circle cx="1.5" cy="7" r="1.5" /><rect x="4" y="6" width="10" height="1.5" rx="0.5" /></svg>
              </Btn>

              <div className="w-px h-4 bg-[#2b090d]/10 mx-1" />
              <Btn onMouseDown={handleInsertTable} title="Insert table">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="1" width="12" height="12" rx="1.5" /><line x1="1" y1="5.5" x2="13" y2="5.5" /><line x1="5.5" y1="1" x2="5.5" y2="13" /></svg>
              </Btn>
            </div>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div
          ref={viewportRef}
          id="editor-viewport"
          className="flex-1 overflow-y-auto px-2 md:px-8 pt-0 pb-16 flex flex-col items-center gap-12 editor-scrollbar select-text overflow-x-hidden relative z-0"
        >
          {pages.map((page, idx) => (
            <PageSheet
              key={page.id}
              page={page}
              idx={idx}
              activePageIndex={activePageIndex}
              proposals={proposals.filter(p => p.pageId === page.id)}
              acceptProposal={acceptProposal}
              rejectProposal={rejectProposal}
              onPageFocus={() => { if (activePageIndex !== idx) setActivePageIndex(idx); }}
              onInput={(e: any) => {
                const el = document.getElementById(`page-editor-${idx}`);
                const limit = PAPER_SIZES[paperSize].height - 192;
                const isEnter = e.nativeEvent?.inputType === "insertParagraph" || e.nativeEvent?.inputType === "insertLineBreak";
                const isOverflow = !!(el && el.scrollHeight > limit);
                
                triggerAutoSave(isEnter || isOverflow);
              }}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              currentFont={currentFont}
              currentSize={currentSize}
              paperSize={paperSize}
              headerContent={headerContent}
              footerContent={footerContent}
              onHeaderChange={(val: string) => { setHeaderContent(val); triggerAutoSave(); }}
              onFooterChange={(val: string) => { setFooterContent(val); triggerAutoSave(); }}
            />
          ))}
        </div>

        {/* Removed Header/Footer Modal */}
      </div>

      {/* Vault Co-pilot Sidebar */}
      <VaultCopilot
        vaultSources={vaultSources}
        folderName={folder.name}
        citationFormat={citationFormat}
        selectedText={selectedText}
        getDocumentText={() => pages.map(p => {
          const el = document.getElementById(`page-editor-${pages.indexOf(p)}`);
          return el?.innerText || p.content;
        }).join('\n\n')}
        onApplyEdit={handleApplyEdit}
        onInsertCitation={(citation) =>
          exec('insertHTML', `<span style="color:#8B1A1A;font-weight:600">&nbsp;${citation}&nbsp;</span>`)
        }
      />

      <CitationsPanel
        isOpen={showCitations}
        onClose={() => setShowCitations(false)}
        vaultSources={vaultSources}
        citationFormat={citationFormat}
        onFormatChange={(f) => { setCitationFormat(f); saveNotebook(notebook.id, { citationFormat: f }); }}
        onInsertInlineCitation={(citation) => exec('insertHTML', `<span style="color:inherit;font-family:${currentFont},serif;font-size:${currentSize}pt;">&nbsp;${citation}&nbsp;</span>`)}
        onInsertBibliography={handleInsertBibliography}
        notebookId={notebook.id}
        apiKey={""}
      />

      <style>{`
        [contenteditable][data-placeholder]:empty::before {
          content: attr(data-placeholder);
          color: #d1d5db;
          pointer-events: none;
          font-style: italic;
        }
        .ai-proposal {
          background-color: #dcfce7;
          color: #166534;
          border-radius: 4px;
          border-bottom: 2px dashed #22c55e;
          font-family: inherit !important;
          font-size: inherit !important;
          line-height: inherit !important;
          padding: 0 2px;
        }
        [contenteditable] h1 { font-size: 2.2em; font-weight: 800; margin: .8em 0; line-height: 1.2; letter-spacing: -0.02em; }
        [contenteditable] h2 { font-size: 1.6em; font-weight: 700; margin: .8em 0; line-height: 1.3; }
        [contenteditable] h3 { font-size: 1.3em; font-weight: 700; margin: .8em 0; line-height: 1.4; color: #521118; }
        [contenteditable] h4 { font-size: 1.1em; font-weight: 700; margin: 1em 0; line-height: 1.5; }
        [contenteditable] p  { margin: 0 0 .8em; text-align: justify; }
        [contenteditable] ul { list-style-type: disc; padding-left: 2em; margin: .8em 0; }
        [contenteditable] ol { list-style-type: decimal; padding-left: 2em; margin: .8em 0; }
        [contenteditable] table { border-collapse: collapse; margin: 1.5em 0; width: 100%; }
        [contenteditable] td, [contenteditable] th { border: 1px solid #e5e7eb; padding: 12px 16px; min-width: 60px; text-align: left; }
        [contenteditable] th { background-color: #f9fafb; font-weight: 600; }
        
        .flex-1.overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        .flex-1.overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .flex-1.overflow-y-auto::-webkit-scrollbar-thumb {
          background-color: rgba(43,9,13,0.1);
          border-radius: 4px;
        }
        .flex-1.overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background-color: rgba(43,9,13,0.2);
        }
      `}</style>
    </div>
  );
}

