'use client';

import { useEffect, useState } from 'react';

interface OutlineItem {
  id: string;
  title: string;
  type: 'h1' | 'h2' | 'h3' | 'page';
  element: HTMLElement;
}

interface Props {
  editorRef: React.RefObject<HTMLElement | null>;
  pages: { id: string; title: string; content: string }[];
  activePageIndex: number;
  onPageChange: (index: number) => void;
  onDeletePage: (index: number) => void;
  onRenamePage: (index: number, newTitle: string) => void;
  paperSize: string;
  setPaperSize: (size: string) => void;
  onAddPage: () => void;
}

const RESEARCH_OUTLINE = [
  {
    label: 'Preliminary Pages',
    type: 'chapter',
    items: ['Title Page', 'Abstract', 'Table of Contents', 'Acknowledgments'],
  },
  {
    label: 'Chapter 1 — Introduction',
    type: 'chapter',
    items: [
      'Background of the Study',
      'Statement of the Problem',
      'Objectives of the Study',
      'Significance of the Study',
      'Scope and Limitations',
      'Definition of Terms',
    ],
  },
  {
    label: 'Chapter 2 — Review of Related Literature',
    type: 'chapter',
    items: [
      'Related Literature',
      'Related Studies',
      'Conceptual Framework',
      'Theoretical Framework',
    ],
  },
  {
    label: 'Chapter 3 — Methodology',
    type: 'chapter',
    items: [
      'Research Design',
      'Participants / Respondents',
      'Sampling Method',
      'Data Collection Instrument',
      'Data Collection Procedure',
      'Data Analysis',
    ],
  },
  {
    label: 'Chapter 4 — Results & Discussion',
    type: 'chapter',
    items: ['Presentation of Results', 'Analysis & Discussion'],
  },
  {
    label: 'Chapter 5 — Conclusion',
    type: 'chapter',
    items: ['Conclusion', 'Recommendations'],
  },
  {
    label: 'Back Matter',
    type: 'chapter',
    items: ['References / Bibliography', 'Appendices'],
  },
];

export default function DocumentNavigator({
  editorRef, pages, activePageIndex, onPageChange, onDeletePage, onRenamePage,
  paperSize, setPaperSize, onAddPage
}: Props) {
  const [headings, setHeadings] = useState<OutlineItem[]>([]);
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set([0, 1]));
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    let timeout: ReturnType<typeof setTimeout>;

    const parseOutline = () => {
      if (!editorRef.current) return;
      const nodes = Array.from(editorRef.current.querySelectorAll('h1, h2, h3'));
      const newHeadings: OutlineItem[] = nodes.map((node, i) => ({
        id: `nav-item-${i}`,
        title: node.textContent?.trim() || 'Untitled Section',
        type: node.tagName.toLowerCase() as any,
        element: node as HTMLElement,
      }));
      setHeadings(newHeadings);
    };

    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(parseOutline, 1000);
    });

    observer.observe(editorRef.current, { childList: true, subtree: true, characterData: true });
    setTimeout(parseOutline, 200);

    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [editorRef, activePageIndex]);

  const scrollTo = (element: HTMLElement) => {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const toggleChapter = (idx: number) => {
    setOpenChapters(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <div className="hidden lg:flex w-72 min-w-[18rem] h-full bg-white/80 backdrop-blur-3xl border-r border-[#2b090d]/10 flex-col pt-3 z-10 shadow-[10px_0_30px_rgba(43,9,13,0.02)]">
      {/* Document Setup Header */}
      <div className="px-5 py-4 border-b border-[#2b090d]/5 bg-[#521118]/[0.02]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-[#521118]">Document Setup</h3>
          <button
            onClick={onAddPage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#521118] text-white rounded-lg text-[10px] font-bold shadow-lg shadow-[#521118]/20 hover:scale-105 active:scale-95 transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            ADD PAGE
          </button>
        </div>

        <div className="flex items-center justify-between bg-white border border-[#2b090d]/5 p-2 rounded-xl">
          <span className="text-[10px] font-bold text-[#2b090d]/40 ml-1">PAPER SIZE</span>
          <select
            value={paperSize}
            onChange={(e) => setPaperSize(e.target.value)}
            className="bg-transparent border-none text-[11px] font-black text-[#521118] outline-none cursor-pointer p-0"
          >
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
            <option value="A4">A4</option>
          </select>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto editor-scrollbar flex flex-col">

        {/* Page Navigator */}
        <div className="px-5 py-3 border-b border-[#2b090d]/5 bg-gray-50/50">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-[#2b090d]/30">Page Navigator</h3>
        </div>
        <div className="p-3 flex flex-col gap-1 border-b border-[#2b090d]/5">
          {pages.map((page, idx) => (
            <div
              key={page.id}
              className="group flex items-center gap-1"
            >
              <button
                onClick={() => onPageChange(idx)}
                className={`flex-1 text-left px-3 py-2 rounded-lg transition-all text-[13px] flex items-center justify-between
                  ${activePageIndex === idx
                    ? 'bg-[#521118] text-white font-bold shadow-md shadow-[#521118]/20'
                    : 'text-[#2b090d]/70 hover:bg-[#521118]/5 hover:text-[#521118]'
                  }`}
              >
                <div 
                  className="flex items-center gap-2 flex-1 min-w-0" 
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingPageId(page.id); }}
                >
                  <span className="opacity-50 text-[10px] font-mono w-4 shrink-0">{idx + 1}</span>
                  {editingPageId === page.id ? (
                    <input 
                      autoFocus 
                      defaultValue={page.title} 
                      className="flex-1 bg-white text-black px-1.5 py-0.5 rounded-md text-[13px] w-full outline-none shadow-inner border border-[#2b090d]/20"
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        onRenamePage(idx, e.target.value || page.title);
                        setEditingPageId(null);
                      }}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') {
                          onRenamePage(idx, e.currentTarget.value || page.title);
                          setEditingPageId(null);
                        } else if (e.key === 'Escape') {
                          setEditingPageId(null);
                        }
                      }}
                    />
                  ) : (
                    <span className="truncate flex-1 max-w-[110px]" title="Double-click to rename">{page.title}</span>
                  )}
                </div>
                {activePageIndex === idx && <span className="text-[10px] animate-pulse">●</span>}
              </button>
              {/* Trash icon — visible on hover, disabled if only 1 page */}
              {pages.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeletePage(idx); }}
                  title="Delete page"
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[#2b090d]/30 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              )}
            </div>
          ))}
          {pages.length === 0 && (
            <div className="px-4 py-6 text-center">
              <p className="text-[11px] text-[#2b090d]/40 italic">Add pages to start your paper.</p>
            </div>
          )}
        </div>

        {/* Document Headings (current page) */}
        {headings.length > 0 && (
          <div className="p-3 border-b border-[#2b090d]/5">
            <h4 className="px-3 py-2 text-[10px] font-bold text-[#2b090d]/40 uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2b090d]/20" />
              On This Page
            </h4>
            <div className="flex flex-col gap-0.5">
              {headings.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollTo(item.element)}
                  className={`text-left rounded-lg transition-all truncate py-1.5
                    ${item.type === 'h1' ? 'font-bold text-[#2b090d] text-[12px] px-3 hover:bg-[#2b090d]/5' : ''}
                    ${item.type === 'h2' ? 'font-semibold text-[#2b090d]/70 text-[11.5px] pl-6 pr-3 hover:bg-[#2b090d]/5' : ''}
                    ${item.type === 'h3' ? 'font-medium text-[#2b090d]/50 text-[11px] pl-9 pr-3 hover:bg-[#2b090d]/5' : ''}
                  `}
                  title={item.title}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Research Paper Outline */}
        <div className="px-5 py-3 border-b border-[#2b090d]/5 bg-gray-50/50">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-[#2b090d]/30">Research Outline</h3>
        </div>
        <div className="p-3 flex flex-col gap-0.5">
          {RESEARCH_OUTLINE.map((chapter, chIdx) => (
            <div key={chIdx}>
              {/* Chapter header (collapsible) */}
              <button
                onClick={() => toggleChapter(chIdx)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#521118]/5 text-left transition-all group"
              >
                <span className="text-[11px] font-black text-[#521118] truncate pr-2">{chapter.label}</span>
                <svg
                  width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round"
                  className={`flex-shrink-0 text-[#521118]/40 transition-transform duration-200 ${openChapters.has(chIdx) ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {/* Sub-items */}
              {openChapters.has(chIdx) && (
                <div className="flex flex-col gap-0.5 mb-1">
                  {chapter.items.map((item, iIdx) => (
                    <div
                      key={iIdx}
                      className="pl-7 pr-3 py-1 text-[11px] text-[#2b090d]/50 flex items-center gap-2 rounded-lg hover:bg-[#2b090d]/5 hover:text-[#2b090d]/70 cursor-default transition-colors"
                    >
                      <span className="w-1 h-1 rounded-full bg-[#521118]/20 flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
