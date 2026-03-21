"use client";

import { Save, Send, Sparkles, FileText, Download, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List } from 'lucide-react';
import { useState } from 'react';

export default function WriterPage() {
  const [content, setContent] = useState('');

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full max-w-7xl mx-auto p-4 gap-4 animate-in fade-in slide-in-from-bottom-4">

      {/* Main Google Docs-style Editor */}
      <div className="flex-1 bg-white border border-stone-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
        <div className="border-b border-stone-100 p-4 bg-stone-50/50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 text-amber-700 p-2 rounded-lg">
              <FileText size={20} />
            </div>
            <input type="text" defaultValue="Untitled Document" className="font-bold text-stone-900 bg-transparent outline-none focus:ring-2 focus:ring-amber-500/20 rounded px-2 py-1 transition" />
          </div>
          <div className="flex items-center gap-2">
            <button className="text-sm font-bold text-stone-500 hover:text-stone-900 px-4 py-2 rounded-xl transition flex items-center gap-2"><Download size={16} /> Export</button>
            <button className="bg-stone-900 text-stone-50 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-stone-800 transition shadow-md flex items-center gap-2">
              <Save size={16} /> Save to Vault
            </button>
          </div>
        </div>

        {/* Rich Text Toolbar */}
        <div className="border-b border-stone-100 px-4 py-2 bg-white flex items-center gap-2 overflow-x-auto text-stone-600 shrink-0">
          <select className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none font-medium">
            <option>Normal text</option>
            <option>Heading 1</option>
            <option>Heading 2</option>
          </select>
          <div className="w-px h-6 bg-stone-200 mx-1"></div>
          <select className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm outline-none font-medium w-32">
            <option>Merriweather</option>
            <option>Inter</option>
          </select>
          <div className="w-px h-6 bg-stone-200 mx-1"></div>
          <button className="p-1.5 hover:bg-stone-100 rounded-lg transition"><Bold size={16} /></button>
          <button className="p-1.5 hover:bg-stone-100 rounded-lg transition"><Italic size={16} /></button>
          <button className="p-1.5 hover:bg-stone-100 rounded-lg transition"><Underline size={16} /></button>
          <div className="w-px h-6 bg-stone-200 mx-1"></div>
          <button className="p-1.5 hover:bg-stone-100 rounded-lg transition"><AlignLeft size={16} /></button>
          <button className="p-1.5 hover:bg-stone-100 rounded-lg transition"><AlignCenter size={16} /></button>
          <button className="p-1.5 hover:bg-stone-100 rounded-lg transition"><AlignRight size={16} /></button>
          <div className="w-px h-6 bg-stone-200 mx-1"></div>
          <button className="p-1.5 hover:bg-stone-100 rounded-lg transition"><List size={16} /></button>
        </div>

        <div className="flex-1 bg-stone-50/30 p-8 overflow-y-auto w-full relative">
          <div className="max-w-3xl mx-auto h-full relative">
            <textarea
              className="w-full h-full resize-none outline-none text-stone-800 leading-relaxed font-serif text-lg bg-transparent drop-shadow-sm min-h-[800px] p-12 py-16 mb-20 shadow-xl shadow-stone-200/50 rounded-lg border border-stone-200/50 bg-white"
              placeholder="Start drafting your research paper here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* AI Co-pilot Side Panel */}
      <div className="w-80 shrink-0 bg-stone-900 border border-stone-800 rounded-3xl flex flex-col shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-900/40 blur-[50px] rounded-full" />
        <div className="p-5 border-b border-stone-800 bg-stone-900/50 backdrop-blur z-10 relative">
          <h3 className="font-bold text-stone-50 flex items-center gap-2 font-serif text-lg"><Sparkles size={18} className="text-amber-500" /> Vault Co-pilot</h3>
          <p className="text-xs text-stone-400 mt-1 font-medium">Locked to references in "Thesis Chapter 2"</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 z-10 relative">
          <div className="bg-amber-950/30 border border-amber-900/50 p-4 rounded-2xl text-stone-300 text-sm leading-relaxed">
            <p className="mb-3 font-medium text-amber-100">Welcome to your writing workspace.</p>
            <p>I am strictly locked to your Vault. Ask me to:</p>
            <ul className="list-disc pl-4 mt-2 space-y-1 text-xs text-amber-200/70">
              <li>Find a supporting source</li>
              <li>Add an inline citation [1]</li>
              <li>Rephrase a paragraph</li>
            </ul>
          </div>
        </div>

        <div className="p-4 bg-stone-900/80 backdrop-blur border-t border-stone-800 z-10 relative">
          <div className="flex gap-2">
            <input className="flex-1 bg-stone-800 text-stone-100 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-rose-900/50 placeholder:text-stone-500 transition-all font-medium" placeholder="Ask Co-pilot..." />
            <button className="bg-rose-900 text-white p-3 rounded-xl hover:bg-rose-800 transition shadow-lg shadow-rose-900/20"><Send size={18} /></button>
          </div>
        </div>
      </div>

    </div>
  );
}
