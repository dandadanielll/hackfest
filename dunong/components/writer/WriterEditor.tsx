'use client';

import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent, Extension } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image as BaseImage } from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { 
  Undo, Redo, Printer, SpellCheck, PaintRoller, 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Image as ImageIcon, Baseline, Highlighter,
  ArrowUpDown, ImagePlay, Menu
} from 'lucide-react';

import type { Notebook, LibraryFolder, CitationFormat } from '@/lib/writer.types';
import { saveNotebook, renameNotebook, saveDocumentToVault, getVaultSources, countWords, formatLastSaved } from '@/lib/writerStorage';
import { exportToDocx } from '@/lib/exportDocx';
import VaultCopilot from './VaultCopilot';
import CitationsPanel from './CitationsPanel';

interface Props {
  notebook: Notebook;
  folder: LibraryFolder;
  onBack: () => void;
}

// --- CUSTOM IMAGE EXTENSION (GOOGLE DOCS LAYOUT STYLE) ---
const CustomImage = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      layout: {
        default: 'inline', // 'inline', 'wrap', or 'break'
        parseHTML: element => element.getAttribute('data-layout') || 'inline',
        renderHTML: attributes => {
          // 1. Wrap Text (Floats left so text wraps around the right side)
          if (attributes.layout === 'wrap') {
            return {
              'data-layout': 'wrap',
              style: 'float: left; margin: 0.5rem 1.5rem 0.5rem 0; max-width: 50%; cursor: default; border-radius: 0.5rem; border: 1px solid #E5E7EB; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);',
            };
          }
          // 2. Break Text (Forces image onto its own line, centered)
          if (attributes.layout === 'break') {
            return {
              'data-layout': 'break',
              style: 'display: block; margin: 1.5rem auto; max-width: 100%; cursor: default; border-radius: 0.5rem; border: 1px solid #E5E7EB; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); clear: both;',
            };
          }
          // 3. In Line (Acts like a giant piece of text)
          return {
            'data-layout': 'inline',
            style: 'display: inline-block; vertical-align: baseline; margin: 0 0.5rem; max-width: 100%; cursor: default; border-radius: 0.5rem; border: 1px solid #E5E7EB; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);',
          };
        },
      },
    };
  },
});

// --- CUSTOM LINE SPACING EXTENSION ---
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
  }
}
const LineHeightExtension = Extension.create({
  name: 'lineHeight',
  addOptions() { return { types: ['paragraph', 'heading'] }; },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: element => element.style.lineHeight || null,
            renderHTML: attributes => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            }
          }
        }
      }
    ];
  },
  addCommands() {
    return {
      setLineHeight: (lineHeight) => ({ commands }) => {
        return this.options.types.every(type => commands.updateAttributes(type, { lineHeight }));
      },
      unsetLineHeight: () => ({ commands }) => {
        return this.options.types.every(type => commands.resetAttributes(type, 'lineHeight'));
      }
    };
  }
});

// --- SMART GHOST TEXT PLUGIN ---
const GhostPluginKey = new PluginKey('ghost');
const GhostExtension = Extension.create({
  name: 'ghostText',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: GhostPluginKey,
        state: {
          init() { return DecorationSet.empty },
          apply(tr, oldState) {
            const text = tr.getMeta('ghostText');
            if (text !== undefined) {
              if (text === null) return DecorationSet.empty;
              const widget = document.createElement('span');
              widget.className = 'text-gray-400 pointer-events-none opacity-60 font-serif';
              widget.textContent = text;
              const deco = Decoration.widget(tr.selection.to, widget, { side: 1 });
              return DecorationSet.create(tr.doc, [deco]);
            }
            return tr.docChanged ? DecorationSet.empty : oldState;
          }
        },
        props: {
          decorations(state) { return this.getState(state) },
          handleKeyDown(view, event) {
            const state = this.getState(view.state);
            const decos = state.find();
            if (decos.length > 0) {
              if (event.key === 'Tab') {
                event.preventDefault();
                const text = (decos[0].type as any).toDOM.textContent;
                view.dispatch(view.state.tr.insertText(text).setMeta('ghostText', null));
                return true;
              }
              if (event.key !== 'Shift' && event.key !== 'Control' && event.key !== 'Alt') {
                view.dispatch(view.state.tr.setMeta('ghostText', null));
              }
            }
            return false;
          }
        }
      })
    ];
  }
});

const FONT_FAMILIES = ['Georgia', 'Times New Roman', 'Courier New', 'Arial', 'Verdana', 'Inter', 'Merriweather'];
const PARA_STYLES = [
  { label: 'Normal text', tag: 0 },
  { label: 'Heading 1', tag: 1 },
  { label: 'Heading 2', tag: 2 },
  { label: 'Heading 3', tag: 3 },
];

export default function WriterEditor({ notebook, folder, onBack }: Props) {
  const [docName, setDocName] = useState(notebook.name);
  const [savedTs, setSavedTs] = useState(notebook.lastSaved);
  const [wordCount, setWordCount] = useState(notebook.wordCount ?? 0);
  const [citationFormat, setCitationFormat] = useState<CitationFormat>(notebook.citationFormat ?? 'APA');
  const [spellCheckEnabled, setSpellCheckEnabled] = useState(true);
  
  const [showCitations, setShowCitations] = useState(false);
  const [vaultSources, setVaultSources] = useState(getVaultSources(folder.id));
  const [selectedText, setSelectedText] = useState('');
  
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRequestingAIRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiStatus, setAiStatus] = useState<'idle' | 'thinking'>('idle');

  const [, setForceUpdate] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TextStyle, Color, Highlight.configure({ multicolor: true }),
      FontFamily, TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, 
      CustomImage.configure({ allowBase64: true }), // Using our new layout-based image
      LineHeightExtension, GhostExtension,
    ],
    content: notebook.content || '',
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const words = countWords(editor.getText());
      setWordCount(words);
      const saved = saveNotebook(notebook.id, { content: html, wordCount: words });
      if (saved) setSavedTs(saved.lastSaved);

      const { from, to } = editor.state.selection;
      setSelectedText(editor.state.doc.textBetween(from, to, ' '));

      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      editor.view.dispatch(editor.state.tr.setMeta('ghostText', null));
      setAiStatus('idle');
      
      typingTimerRef.current = setTimeout(async () => {
        if (isRequestingAIRef.current || !editor.state.selection.empty) return;
        const textBeforeCursor = editor.state.doc.textBetween(Math.max(0, editor.state.selection.to - 800), editor.state.selection.to, '\n');
        if (textBeforeCursor.trim().length < 10) return;

        isRequestingAIRef.current = true;
        setAiStatus('thinking');
        try {
          const res = await fetch('/api/autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textBeforeCursor })
          });
          const data = await res.json();
          if (data.completion && !editor.isDestroyed) {
            const pad = textBeforeCursor.endsWith(' ') || textBeforeCursor.endsWith('\n') ? '' : ' ';
            editor.view.dispatch(editor.state.tr.setMeta('ghostText', pad + data.completion));
          }
        } catch (e) {
          console.error(e);
        } finally {
          isRequestingAIRef.current = false;
          setAiStatus('idle');
        }
      }, 1000);
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      setSelectedText(editor.state.doc.textBetween(from, to, ' '));
      setForceUpdate(prev => prev + 1); 
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none min-h-[900px] text-gray-800 outline-none',
        style: 'font-family: Georgia, serif; font-size: 11pt;',
        spellcheck: spellCheckEnabled ? 'true' : 'false',
      },
    },
  });

  useEffect(() => setVaultSources(getVaultSources(folder.id)), [folder.id]);

  if (!editor) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new globalThis.Image(); 
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800; 

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

        // Insert custom image with default 'inline' alignment
        editor.chain().focus().insertContent([
          { type: 'image', attrs: { src: compressedBase64, layout: 'inline' } },
        ]).run();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentLineHeight = editor.getAttributes('paragraph').lineHeight || '1.5';

  return (
    <div className="flex flex-col h-screen bg-[#F9FBFD] overflow-hidden text-sm">
      
      {/* Header Area */}
      <div className="flex flex-col bg-white border-b border-gray-200 shrink-0 px-4 pt-3 pb-3 gap-2">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#8B1A1A]" title="Back to Dashboard">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-3">
              <input
                defaultValue={docName}
                onBlur={(e) => { setDocName(e.target.value); renameNotebook(notebook.id, e.target.value); }}
                className="font-medium text-[18px] text-gray-800 border border-transparent hover:border-gray-300 focus:border-blue-500 rounded px-1.5 outline-none bg-transparent max-w-lg transition-colors"
              />
              <span className="text-[12px] text-gray-500 mt-1 flex items-center gap-1">
                {aiStatus === 'thinking' ? 'AI is thinking...' : formatLastSaved(savedTs)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{wordCount.toLocaleString()} words</span>
            <button onClick={() => setShowCitations(!showCitations)} className="px-3 py-1.5 border border-[#D0C4B8] rounded-md text-xs font-semibold text-gray-600 hover:bg-gray-50">
              Citations
            </button>
            <button onClick={() => exportToDocx(editor.getHTML(), docName)} className="flex items-center gap-2 px-4 py-2 bg-[#8B1A1A] hover:bg-[#6b1414] text-white rounded-full font-medium transition-colors">
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Ribbon */}
      <div className="flex items-center flex-wrap gap-1 px-4 py-1.5 bg-[#EDF2FA] rounded-full mx-4 my-2 border border-gray-200 shrink-0 shadow-sm relative z-20 transition-all">
        
        {/* Conditional Image Tools: Only appear when an image is clicked! */}
        {editor.isActive('image') ? (
          <div className="flex items-center gap-1 bg-[#D6E2F8] px-2 py-0.5 rounded-full border border-blue-200 mr-2 shadow-inner">
             <ImagePlay size={14} className="text-blue-700 ml-1" />
             <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider px-1 mr-1">Image Options:</span>
             <TextBtn 
               label="In line" 
               onClick={() => editor.chain().focus().updateAttributes('image', { layout: 'inline' }).run()} 
               active={editor.getAttributes('image').layout === 'inline' || !editor.getAttributes('image').layout} 
             />
             <TextBtn 
               label="Wrap text" 
               onClick={() => editor.chain().focus().updateAttributes('image', { layout: 'wrap' }).run()} 
               active={editor.getAttributes('image').layout === 'wrap'} 
             />
             <TextBtn 
               label="Break text" 
               onClick={() => editor.chain().focus().updateAttributes('image', { layout: 'break' }).run()} 
               active={editor.getAttributes('image').layout === 'break'} 
             />
          </div>
        ) : null}

        <RibbonBtn icon={<Undo size={16}/>} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo" />
        <RibbonBtn icon={<Redo size={16}/>} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo" />
        <RibbonBtn icon={<Printer size={16}/>} onClick={() => window.print()} title="Print" />
        <RibbonBtn icon={<SpellCheck size={16}/>} onClick={() => setSpellCheckEnabled(!spellCheckEnabled)} active={spellCheckEnabled} title="Toggle Spell Check" />
        <RibbonBtn icon={<PaintRoller size={16}/>} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting" />
        
        <Divider />

        <select 
          className="h-7 px-2 bg-transparent hover:bg-gray-200 rounded cursor-pointer outline-none font-medium w-28 text-[13px]"
          value={editor.isActive('heading', { level: 1 }) ? 1 : editor.isActive('heading', { level: 2 }) ? 2 : editor.isActive('heading', { level: 3 }) ? 3 : 0}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (val === 0) editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: val as any }).run();
          }}
        >
          {PARA_STYLES.map(s => <option key={s.tag} value={s.tag}>{s.label}</option>)}
        </select>

        <Divider />

        <select 
          className="h-7 px-2 bg-transparent hover:bg-gray-200 rounded cursor-pointer outline-none w-36 text-[13px]"
          value={editor.getAttributes('textStyle').fontFamily || 'Georgia'}
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        >
          {FONT_FAMILIES.map(f => <option key={f} value={f}>{f}</option>)}
        </select>

        <Divider />

        <RibbonBtn icon={<Bold size={16}/>} onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold" />
        <RibbonBtn icon={<Italic size={16}/>} onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic" />
        <RibbonBtn icon={<UnderlineIcon size={16}/>} onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline" />
        
        <ColorDropdown 
          icon={<Baseline size={16} className="text-gray-700"/>} 
          title="Text color" 
          onSelect={(c) => c === 'transparent' ? editor.chain().focus().unsetColor().run() : editor.chain().focus().setColor(c).run()} 
        />
        <ColorDropdown 
          icon={<Highlighter size={16} className="text-gray-700"/>} 
          title="Highlight color" 
          onSelect={(c) => c === 'transparent' ? editor.chain().focus().unsetHighlight().run() : editor.chain().focus().toggleHighlight({ color: c }).run()} 
        />

        <Divider />

        <div className="flex items-center gap-1">
          <ArrowUpDown size={14} className="text-gray-500 ml-1" />
          <select 
            className="h-7 px-1 bg-transparent hover:bg-gray-200 rounded cursor-pointer outline-none w-[75px] text-[13px]"
            value={currentLineHeight}
            onChange={(e) => editor.chain().focus().setLineHeight(e.target.value).run()}
            title="Line & Paragraph Spacing"
          >
            <option value="1">Single</option>
            <option value="1.15">1.15</option>
            <option value="1.5">1.5</option>
            <option value="2">Double</option>
          </select>
        </div>

        <Divider />

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
        <RibbonBtn icon={<ImageIcon size={16}/>} onClick={() => fileInputRef.current?.click()} title="Insert Image (Local)" />

        <Divider />

        <RibbonBtn icon={<AlignLeft size={16}/>} onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' }) && !editor.isActive('image')} title="Align Left" />
        <RibbonBtn icon={<AlignCenter size={16}/>} onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' }) && !editor.isActive('image')} title="Align Center" />
        <RibbonBtn icon={<AlignRight size={16}/>} onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' }) && !editor.isActive('image')} title="Align Right" />
        <RibbonBtn icon={<AlignJustify size={16}/>} onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' }) && !editor.isActive('image')} title="Justify" />

        <Divider />

        <RibbonBtn icon={<List size={16}/>} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List" />
        <RibbonBtn icon={<ListOrdered size={16}/>} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List" />
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden bg-[#F4F5F7]">
        
        {/* Document Area */}
        <div className="flex-1 overflow-auto flex justify-center py-6" onClick={() => editor?.commands.focus()}>
          <div className="w-[816px] bg-white shadow-md border border-gray-200 min-h-[1056px] relative group px-[96px] py-[96px] clearfix">
             <div className="absolute top-0 bottom-0 left-[96px] border-l border-transparent group-hover:border-gray-100 pointer-events-none" />
             <div className="absolute top-0 bottom-0 right-[96px] border-r border-transparent group-hover:border-gray-100 pointer-events-none" />
             <EditorContent editor={editor} />
          </div>
        </div>

        {/* Vault Copilot Sidebar */}
        <div className="w-[300px] border-l border-gray-200 bg-white shrink-0 shadow-lg z-10">
          <VaultCopilot
            vaultSources={vaultSources}
            folderName={folder.name}
            citationFormat={citationFormat}
            selectedText={selectedText}
            onApplyEdit={(text) => editor.chain().focus().insertContent(text).run()}
            onInsertCitation={(citation) => editor.chain().focus().setColor('#8B1A1A').insertContent(` ${citation} `).unsetColor().run()}
          />
        </div>
      </div>

      {/* Citations Panel Overlay */}
      <CitationsPanel
        isOpen={showCitations}
        onClose={() => setShowCitations(false)}
        vaultSources={vaultSources}
        citationFormat={citationFormat}
        onFormatChange={(f) => { setCitationFormat(f); saveNotebook(notebook.id, { citationFormat: f }); }}
        onInsertInlineCitation={(citation) => editor.chain().focus().setColor('#8B1A1A').insertContent(` ${citation} `).unsetColor().run()}
        onInsertBibliography={(formatted) => editor.chain().focus().insertContent(`<hr/><h2>References</h2><p>${formatted.replace(/\n\n/g, '</p><p>')}</p>`).run()}
        notebookId={notebook.id}
      />
      
      {/* Global overrides for TipTap styling */}
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: "Start drafting your research paper here...";
          float: left;
          color: #9CA3AF;
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
        /* Default line-height set to 1.5, overrideable by inline styles */
        .ProseMirror p { margin-bottom: 0.5em; line-height: 1.5; }
        .ProseMirror h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; line-height: 1.2; }
        .ProseMirror h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; line-height: 1.2; }
        .ProseMirror h3 { font-size: 1.17em; font-weight: bold; margin-bottom: 0.5em; line-height: 1.3; }
        .ProseMirror ul { list-style-type: disc; padding-left: 2em; margin-bottom: 1em; }
        .ProseMirror ol { list-style-type: decimal; padding-left: 2em; margin-bottom: 1em; }
        /* Image selection outlines */
        .ProseMirror img.ProseMirror-selectednode {
          outline: 3px solid #3B82F6;
        }
        /* Clearfix hack for floating images */
        .ProseMirror::after {
          content: "";
          display: table;
          clear: both;
        }
      `}</style>
    </div>
  );
}

// Subcomponents
function RibbonBtn({ icon, onClick, active, disabled, title }: any) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
        disabled ? 'opacity-30 cursor-not-allowed' : ''
      } ${active ? 'bg-[#D6E2F8] text-blue-700' : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'}`}
    >
      {icon}
    </button>
  );
}

function TextBtn({ label, onClick, active }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors ${
        active ? 'bg-blue-600 text-white shadow' : 'text-blue-800 hover:bg-blue-200/50'
      }`}
    >
      {label}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-gray-300 mx-1" />;
}

// Custom Preset Color Dropdown
function ColorDropdown({ icon, title, onSelect }: { icon: React.ReactNode, title: string, onSelect: (color: string) => void }) {
  const [open, setOpen] = useState(false);
  const presets = ['#000000', '#434343', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B1A1A', 'transparent'];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} title={title} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-200 cursor-pointer text-gray-700">
        {icon}
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 shadow-lg rounded-md p-2 flex gap-1 z-50 w-max">
          {presets.map(c => (
            <button
              key={c}
              onClick={() => { onSelect(c); setOpen(false); }}
              className="w-5 h-5 rounded border border-gray-300 flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: c === 'transparent' ? '#fff' : c }}
              title={c === 'transparent' ? 'None' : c}
            >
              {c === 'transparent' && <span className="text-[10px] text-red-500 font-bold block leading-none">/</span>}
            </button>
          ))}
          <input 
            type="color" 
            onInput={(e: any) => { onSelect(e.target.value); setOpen(false); }} 
            className="w-5 h-5 p-0 border border-gray-300 rounded cursor-pointer ml-1" 
            title="Custom Color"
          />
        </div>
      )}
    </div>
  );
}