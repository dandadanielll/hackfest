'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Notebook } from '@/lib/libraryStore';
import { useLibrary } from '@/lib/libraryContext';
import { deleteNotebook, formatDate } from '@/lib/writerStorage';
import { 
  Plus, 
  Search, 
  Folder, 
  FolderOpen,
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Trash2, 
  Shield, 
  ArrowRight,
  PlusCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import WriterEditor from './WriterEditor';

type View = 'select' | 'editor';

function WriterPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { folders, addNotebook, removeNotebook, addFolder } = useLibrary();

  const [view, setView] = useState<View>('select');
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Expand all folders on load
  useEffect(() => {
    if (folders.length > 0) {
      setExpanded(new Set(folders.map((f) => f.id)));
    }
  }, [folders.length]);

  // Handle deep-link from Library: ?folderId=...&notebookId=...
  useEffect(() => {
    const fid = searchParams.get('folderId');
    const nid = searchParams.get('notebookId');
    if (fid && nid) {
      setActiveFolderId(fid);
      setActiveNotebookId(nid);
      setView('editor');
    }
  }, [searchParams]);

  const openNotebook = (nb: Notebook, folderId: string) => {
    setActiveNotebookId(nb.id);
    setActiveFolderId(folderId);
    setView('editor');
  };

  const toggleFolder = (id: string) =>
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleCreateNotebook = (folderId: string) => {
    if (!folderId) return;
    const id = addNotebook(folderId, 'Untitled Notebook');
    setActiveNotebookId(id);
    setActiveFolderId(folderId);
    setView('editor');
  };

  const handleDelete = (e: React.MouseEvent, folderId: string, nbId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this notebook? This cannot be undone.')) return;
    removeNotebook(folderId, nbId);
    if (activeNotebookId === nbId) {
      setView('select');
      setActiveNotebookId(null);
    }
  };

  const handleBack = () => {
    setView('select');
    setActiveNotebookId(null);
    // Clear URL params
    router.replace('/writer');
  };

  const allNotebooks = folders.flatMap((f) => f.notebooks.map((nb) => ({ nb, folder: f })));
  const totalNb = allNotebooks.length;

  const displayFolders = search
    ? folders
      .map((f) => ({ ...f, notebooks: f.notebooks.filter((n) => n.name.toLowerCase().includes(search.toLowerCase())) }))
      .filter((f) => f.notebooks.length > 0)
    : folders;

  // Resolve active notebook + folder from library data
  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;
  const activeNotebook = activeFolder?.notebooks.find((n) => n.id === activeNotebookId) ?? null;

  if (view === 'editor' && activeNotebook && activeFolder) {
    return (
      <WriterEditor
        notebook={activeNotebook as any}
        folder={activeFolder as any}
        onBack={handleBack}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex h-full bg-transparent overflow-hidden relative font-sans"
    >


      {/* Sidebar */}
      <aside className="w-[300px] min-w-[300px] flex flex-col bg-white/50 backdrop-blur-sm border-r border-[#2b090d]/10 overflow-hidden">
        <div className="px-6 pt-8 pb-4 shrink-0 flex items-center justify-between">
          <div>
            <h2 className="font-black text-[#2b090d] text-lg mb-0.5 font-serif uppercase tracking-tight">
              My Notebooks
            </h2>
            <p className="text-[10px] font-bold text-[#521118]/40 uppercase tracking-widest">
              {totalNb} {totalNb === 1 ? 'notebook' : 'notebooks'} · {folders.length} {folders.length === 1 ? 'folder' : 'folders'}
            </p>
          </div>
          <button 
            onClick={() => {
              const name = window.prompt("Enter new folder name:");
              if (name && name.trim()) {
                addFolder(name.trim());
              }
            }}
            className="text-[#521118]/40 hover:text-[#521118] transition p-1.5 rounded-lg hover:bg-[#521118]/5"
            title="New Folder"
          >
            <PlusCircle size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="px-5 pb-6 shrink-0">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#521118]/30 group-focus-within:text-[#521118]/60 transition-colors" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notebooks..."
              className="w-full pl-9 pr-4 py-2.5 text-xs bg-[#f5f2ed]/50 border border-[#2b090d]/5 rounded-xl outline-none focus:border-[#521118]/20 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-8 custom-scrollbar">
          {displayFolders.length === 0 && search && (
            <div className="text-center py-12">
              <Search className="mx-auto text-[#521118]/10 mb-2" size={32} />
              <p className="text-xs text-[#521118]/40 font-medium">No results for &ldquo;{search}&rdquo;</p>
            </div>
          )}
          {folders.length === 0 && !search && (
            <div className="text-center py-12 px-6">
              <Folder className="mx-auto text-[#521118]/10 mb-3" size={32} />
              <p className="text-[11px] text-[#521118]/40 font-medium leading-relaxed italic">
                No folders yet. Create folders and notebooks in the Library or click the plus icon.
              </p>
            </div>
          )}
          {displayFolders.map((folder) => (
            <div key={folder.id} className="mb-2">
              <button
                onClick={() => toggleFolder(folder.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all group ${expanded.has(folder.id) ? 'bg-[#521118]/5' : 'hover:bg-[#521118]/5'}`}
              >
                <span className="text-[#521118]/30 group-hover:text-[#521118]/60 transition-colors">
                  {expanded.has(folder.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
                {expanded.has(folder.id) ? (
                  <FolderOpen size={16} className="text-[#D97706]/80 shrink-0" />
                ) : (
                  <Folder size={16} className="text-[#521118]/30 shrink-0" />
                )}
                <span className={`flex-1 text-[13px] font-bold truncate ${expanded.has(folder.id) ? 'text-[#2b090d]' : 'text-[#521118]/70'}`}>
                  {folder.name}
                </span>
                {(folder.vault?.length ?? 0) > 0 && (
                  <Shield size={12} className="text-[#D97706]/60 shrink-0" />
                )}
                <span className="text-[10px] font-black text-[#521118]/30 bg-[#521118]/5 px-1.5 py-0.5 rounded-md min-w-[20px] text-center">
                  {folder.notebooks.length}
                </span>
              </button>

              {expanded.has(folder.id) && (
                <div className="mt-1 space-y-1 ml-4 border-l border-[#521118]/10 pl-2">
                  <button
                    onClick={() => handleCreateNotebook(folder.id)}
                    className="w-full text-left px-3 py-2 text-[11px] text-[#521118] font-black uppercase tracking-wider hover:bg-[#521118]/5 rounded-lg transition mb-1 flex items-center gap-2"
                  >
                    <Plus size={12} />
                    New notebook
                  </button>
                  {folder.notebooks.length === 0 ? (
                    <p className="text-[10px] text-stone-400 italic py-1 pl-3">No notebooks yet.</p>
                  ) : (
                    folder.notebooks.map((nb) => (
                      <div
                        key={nb.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openNotebook(nb, folder.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') openNotebook(nb, folder.id); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#521118]/5 transition-all group cursor-pointer outline-none border border-transparent hover:border-[#521118]/10"
                      >
                        <FileText size={14} className="text-[#521118]/30 group-hover:text-[#521118]/60 transition-colors shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className={`text-[12px] font-bold truncate ${activeNotebookId === nb.id ? 'text-[#2b090d]' : 'text-[#521118]/80'}`}>
                            {nb.name}
                          </p>
                          <p className="text-[10px] font-medium text-stone-400">
                            {nb.wordCount && nb.wordCount > 0 ? `${nb.wordCount.toLocaleString()}w` : 'Empty'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, folder.id, nb.id)}
                          className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 overflow-auto p-12 custom-scrollbar">
        <div className="mb-12 flex items-center gap-5">
          <div className="bg-[#521118]/10 text-[#521118] border border-[#521118]/10 p-4 rounded-3xl shadow-sm shrink-0">
            <FileText size={32} />
          </div>
          <div>
            <h1 className="text-4xl font-black text-[#2b090d] mb-1 font-serif tracking-tight">
              AI Writer
            </h1>
            <p className="text-sm font-medium text-[#521118]/50">Select a notebook to open, or create one inside a folder.</p>
          </div>
        </div>

        {totalNb === 0 && (
          <div className="text-center pt-24">
            <div className="w-20 h-20 bg-[#521118]/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileText className="text-[#521118]/20" size={40} />
            </div>
            <h3 className="text-xl font-bold text-[#2b090d] mb-2 font-serif">No notebooks yet</h3>
            <p className="text-sm text-[#521118]/40 max-w-sm mx-auto mb-8 leading-relaxed font-medium">
              {folders.length === 0
                ? 'Create a folder in the Library to start organizing your research.'
                : 'Choose a folder from the sidebar and click "+ New notebook" to begin writing.'}
            </p>
          </div>
        )}

        {totalNb > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6">
            {folders.flatMap((folder) =>
              folder.notebooks.map((nb) => (
                <button
                  key={nb.id}
                  onClick={() => openNotebook(nb, folder.id)}
                  className="group text-left bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-[#2b090d]/10 hover:border-[#521118]/30 hover:shadow-xl hover:shadow-[#2b090d]/5 transition-all flex flex-col gap-4 relative overflow-hidden"
                >
                  {/* Card Gloss Effect */}
                  <div className="absolute inset-0 w-1/2 h-full bg-white/20 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-[#521118]/5 text-[#521118]/60 px-2.5 py-1 rounded-lg">
                      {folder.name}
                    </span>
                    {(folder.vault?.length ?? 0) > 0 && (
                      <Shield size={14} className="text-[#D97706]/40" />
                    )}
                  </div>

                  <div className="relative z-10">
                    <div className="w-12 h-12 bg-[#521118]/5 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#521118]/10 transition-colors">
                      <FileText className="text-[#521118]/40 group-hover:text-[#521118]/60 transition-colors" size={24} />
                    </div>
                    
                    <h3 className="font-bold text-[#2b090d] text-lg leading-tight mb-1 mb-1 font-serif group-hover:text-[#521118] transition-colors">
                      {nb.name}
                    </h3>
                    
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[12px] font-bold text-[#521118]/40">
                        {nb.wordCount && nb.wordCount > 0 ? `${nb.wordCount.toLocaleString()} words` : 'Empty'}
                      </p>
                      <p className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">{formatDate(nb.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#2b090d]/5 relative z-10">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-amber-100/50 text-amber-700 px-2 py-0.5 rounded">
                      {nb.citationFormat ?? 'APA'}
                    </span>
                    <span className="text-[11px] text-[#521118] font-black uppercase tracking-widest flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                      Open <ArrowRight size={14} />
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </main>
    </motion.div>
  );
}

export default function WriterPage() {
  return (
    <Suspense>
      <WriterPageInner />
    </Suspense>
  );
}