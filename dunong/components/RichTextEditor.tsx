"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';
import { 
  Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Table as TableIcon, Type, Palette, Highlighter, ChevronDown, Quote,
  Undo, Redo, Strikethrough
} from 'lucide-react';
import { useEffect } from 'react';

type Props = {
  content: string;
  onChange: (html: string) => void;
  onWordCountChange?: (count: number) => void;
};

export default function RichTextEditor({ content, onChange, onWordCountChange }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      if (onWordCountChange) {
        onWordCountChange(editor.storage.characterCount.words());
      }
    },
    editorProps: {
      attributes: {
        class: 'prose prose-stone max-w-none focus:outline-none min-h-[800px] p-12 py-16 shadow-xl shadow-stone-200/50 rounded-lg border border-stone-200/50 bg-white leading-relaxed font-serif text-lg',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) return null;

  const ToolbarButton = ({ onClick, isActive, children }: any) => (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-lg transition ${isActive ? 'bg-amber-100 text-amber-900' : 'hover:bg-stone-100 text-stone-600'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col w-full h-full">
      {/* Toolbar */}
      <div className="border-b border-stone-100 px-4 py-2 bg-white flex items-center gap-1 overflow-x-auto text-stone-600 shrink-0 sticky top-0 z-20">
        <select 
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(val) as any }).run();
          }}
          className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs outline-none font-medium"
          value={editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : 'p'}
        >
          <option value="p">Normal text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <div className="w-px h-6 bg-stone-200 mx-1"></div>

        <select 
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
          className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs outline-none font-medium w-28"
          value={editor.getAttributes('textStyle').fontFamily || 'serif'}
        >
          <option value="serif">Merriweather</option>
          <option value="sans-serif">Inter</option>
          <option value="monospace">Monospace</option>
        </select>

        <div className="w-px h-6 bg-stone-200 mx-1"></div>

        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>
          <UnderlineIcon size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>
          <Strikethrough size={16} />
        </ToolbarButton>

        <div className="w-px h-6 bg-stone-200 mx-1"></div>

        <input 
          type="color" 
          onInput={(e: any) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-6 h-6 p-0 border-0 cursor-pointer rounded overflow-hidden"
          title="Text Color"
        />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')}>
          <Highlighter size={16} />
        </ToolbarButton>

        <div className="w-px h-6 bg-stone-200 mx-1"></div>

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}>
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}>
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}>
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })}>
          <AlignJustify size={16} />
        </ToolbarButton>

        <div className="w-px h-6 bg-stone-200 mx-1"></div>

        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
          <ListOrdered size={16} />
        </ToolbarButton>

        <div className="w-px h-6 bg-stone-200 mx-1"></div>

        <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon size={16} />
        </ToolbarButton>

        <div className="w-px h-6 bg-stone-200 mx-1 flex-1"></div>
        
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()}>
          <Undo size={16} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()}>
          <Redo size={16} />
        </ToolbarButton>
      </div>

      {/* Editor Area */}
      <div className="flex-1 bg-stone-50/30 p-8 overflow-y-auto w-full">
        <div className="max-w-3xl mx-auto h-full relative">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
