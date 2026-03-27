'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Folder, Notebook } from '@/lib/libraryStore';
import { useLibrary } from '@/lib/libraryContext';
import { deleteNotebook, formatDate, countWords } from '@/lib/writerStorage';
import { 
  Plus, 
  Search, 
  Folder as FolderIcon, 
  FolderOpen,
  ChevronRight, 
  FileText, 
  Trash2, 
  Shield, 
  ArrowRight,
  PlusCircle,
  BookOpen,
  Mic,
  Sparkles,
  Zap,
  Clock,
  ChevronDown,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import WriterEditor from './WriterEditor';

type View = 'select' | 'editor';

function WriterPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { folders, addNotebook, removeNotebook, addFolder, activeFolderId, setActiveFolderId } = useLibrary();

  const [view, setView] = useState<View>('select');
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('New Chapter');

  // Handle deep-link
  useEffect(() => {
    const fid = searchParams.get('folderId');
    const nid = searchParams.get('notebookId');
    if (fid && nid) {
      setActiveFolderId(fid);
      setActiveNotebookId(nid);
      setView('editor');
    }
  }, [searchParams, setActiveFolderId]);

  const openNotebook = (nb: Notebook, folderId: string) => {
    setActiveNotebookId(nb.id);
    setActiveFolderId(folderId);
    setView('editor');
  };

  const handleCreateNotebook = (folderId: string) => {
    if (!folderId) return;
    setNewNotebookName('New Chapter');
    setIsCreateModalOpen(true);
  };

  const submitCreateNotebook = () => {
    if (!activeFolderId || !newNotebookName.trim()) return;
    const id = addNotebook(activeFolderId, newNotebookName.trim());
    setActiveNotebookId(id);
    setView('editor');
    setIsCreateModalOpen(false);
    setNewNotebookName('New Chapter');
  };

  const handleDelete = (e: React.MouseEvent, folderId: string, nbId: string) => {
    e.stopPropagation();
    if (!confirm('Archive this notebook?')) return;
    removeNotebook(folderId, nbId);
    if (activeNotebookId === nbId) {
      setView('select');
      setActiveNotebookId(null);
    }
  };

  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;
  const activeNotebook = activeFolder?.notebooks.find((n) => n.id === activeNotebookId) ?? null;

  const currentFolderNbCount = activeFolder?.notebooks.length || 0;

  const filteredNotebooks = useMemo(() => {
    if (!activeFolder) return [];
    let nbs = activeFolder.notebooks;
    if (search.trim()) {
      const q = search.toLowerCase();
      nbs = nbs.filter((n) => n.name.toLowerCase().includes(q));
    }
    return [...nbs].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [activeFolder, search]);

  if (view === 'editor' && activeNotebook && activeFolder) {
    return (
      <WriterEditor
        notebook={activeNotebook as any}
        folder={activeFolder as any}
        onBack={() => { setView('select'); setActiveNotebookId(null); router.replace('/writer'); }}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#fcfaf7] overflow-hidden font-sans text-[#1a1a1a]">
      
      {/* ── Studio Sidebar ── */}
      <aside className="relative flex flex-col bg-white border-r border-[#2b090d]/5 w-80 shrink-0 z-20">
        <div className="p-8 flex items-center justify-between shrink-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4">
             <div className="bg-[#521118]/10 text-[#521118] border border-[#521118]/10 p-2.5 rounded-[1.25rem] shadow-sm shrink-0 flex items-center justify-center">
               <BookOpen size={24} />
             </div>
             <span className="font-black text-xl uppercase tracking-wider text-[#521118] font-serif">Writer</span>
          </motion.div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2 py-4">
          <div className="mb-4">
           <p className="text-[10px] font-black text-[#521118]/30 uppercase tracking-widest ml-4 mb-2">Collections</p>
            {folders.map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFolderId(f.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${activeFolderId === f.id ? 'bg-[#521118] text-white shadow-lg shadow-[#521118]/20' : 'hover:bg-[#521118]/5 text-[#521118]/60'}`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${activeFolderId === f.id ? 'bg-white/10' : 'bg-[#521118]/5'}`}>
                  {activeFolderId === f.id ? <FolderOpen size={18} /> : <FolderIcon size={18} />}
                </div>
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-bold truncate">{f.name}</p>
                  <p className={`text-[10px] font-medium opacity-60 ${activeFolderId === f.id ? 'text-white' : 'text-[#521118]'}`}>{f.notebooks.length} Notebooks</p>
                </div>
              </button>
            ))}
          </div>
          
          <button 
            onClick={() => { const n = window.prompt("Folder name:"); if(n) addFolder(n); }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl border-2 border-dashed border-[#521118]/10 text-[#521118]/40 hover:border-[#521118]/30 hover:text-[#521118]/60 transition"
          >
            <Plus size={20} />
            <span className="text-xs font-black uppercase tracking-widest">New Collection</span>
          </button>
        </div>

        <div className="p-6 border-t border-[#2b090d]/5">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-stone-200" />
             <div className="flex-1 overflow-hidden">
               <p className="text-xs font-bold truncate text-[#2b090d]">Francis</p>
               <p className="text-[10px] font-medium text-stone-400">Standard Access</p>
             </div>
          </div>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className="flex-1 overflow-y-auto relative bg-[#fcfaf7]">
        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#521118 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        
        <div className="max-w-6xl mx-auto px-8 md:px-12 py-16 relative z-10">
          
          <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="text-6xl font-black text-[#2b090d] font-serif tracking-tight">
                {activeFolder ? activeFolder.name : "Writer's Desk"}
              </h1>
              <p className="text-xl text-[#521118]/40 mt-4 font-medium italic">
                {activeFolder ? `Organizing thoughts for ${activeFolder.name}` : "What are we creating today?"}
              </p>
            </div>

            <div className="flex gap-4">
               {activeFolder && (
                 <div className="bg-white border border-[#2b090d]/5 px-6 py-4 rounded-[2rem] shadow-sm flex items-center gap-4">
                   <div className="bg-amber-50 text-amber-600 p-2.5 rounded-xl">
                     <Clock size={20} />
                   </div>
                   <div>
                     <p className="text-2xl font-black text-[#2b090d] leading-none">{currentFolderNbCount}</p>
                     <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">Notebooks</p>
                   </div>
                 </div>
               )}
            </div>
          </header>

          {!activeFolder ? (
            <div className="flex items-center justify-center min-h-[400px]">
               <div className="text-center space-y-6">
                 <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mx-auto text-[#521118]/20 rotate-3">
                    <BookOpen size={48} />
                 </div>
                 <div className="space-y-2">
                   <h2 className="text-2xl font-bold text-[#2b090d] font-serif">Welcome to your studio</h2>
                   <p className="text-stone-400 max-w-xs mx-auto text-sm leading-relaxed">Select a collection from the sidebar to begin drafting your next masterpiece.</p>
                 </div>
               </div>
            </div>
          ) : (
            <section>
              <div className="flex items-center justify-between mb-10">
                <div className="relative group">
                   <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#521118]/20 group-focus-within:text-[#521118] transition-colors" />
                   <input 
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     placeholder="Search notebooks..."
                     className="pl-12 pr-6 py-4 bg-white border border-[#2b090d]/10 rounded-2xl w-64 md:w-80 outline-none focus:ring-4 focus:ring-[#521118]/5 transition-all font-bold text-sm text-[#2b090d] shadow-sm"
                   />
                </div>
                <button 
                  onClick={() => handleCreateNotebook(activeFolder.id)}
                  className="bg-[#521118] text-white px-8 py-4 rounded-3xl font-black uppercase tracking-widest text-[11px] hover:bg-[#2b090d] transition shadow-xl shadow-[#521118]/20 flex items-center gap-2 group"
                >
                  <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Start New Draft
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                <AnimatePresence mode="popLayout">
                  {filteredNotebooks.map(nb => (
                    <StudioNotebookCard 
                      key={nb.id} 
                      notebook={nb} 
                      onOpen={() => openNotebook(nb, activeFolder.id)}
                      onDelete={(e) => handleDelete(e, activeFolder.id, nb.id)}
                    />
                  ))}
                  {filteredNotebooks.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-20 text-center rounded-[3rem] border-2 border-dashed border-[#521118]/10 bg-white/40">
                      <p className="text-[#521118]/30 font-bold uppercase tracking-widest text-sm italic">Nothing found in this collection.</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          )}

        </div>
      </main>

      {/* ── New Notebook Modal ── */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-[#fcfaf7] w-full max-w-md rounded-[2.5rem] shadow-2xl border border-[#2b090d]/10 overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="bg-[#521118]/10 text-[#521118] p-3 rounded-2xl">
                    <PlusCircle size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-[#2b090d] font-serif tracking-tight">New Notebook</h3>
                    <p className="text-stone-400 text-xs font-medium uppercase tracking-widest">Collection: {activeFolder?.name}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#521118]/40 ml-1">Notebook Name</label>
                    <input 
                      autoFocus
                      value={newNotebookName}
                      onChange={(e) => setNewNotebookName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && submitCreateNotebook()}
                      className="w-full bg-white border border-[#2b090d]/5 px-6 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-[#521118]/5 transition-all font-bold text-[#2b090d]"
                      placeholder="e.g. Thesis Draft 01"
                    />
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 py-4 text-sm font-black uppercase tracking-widest text-stone-400 hover:text-stone-600 transition"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={submitCreateNotebook}
                    className="flex-[2] bg-[#521118] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-[#521118]/20 hover:bg-[#2b090d] transition flex items-center justify-center gap-2"
                  >
                    <Check size={16} /> Create Draft
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StudioNotebookCard({ notebook, onOpen, onDelete }: { notebook: Notebook; onOpen: () => void; onDelete: (e: React.MouseEvent) => void }) {
  const words = notebook.wordCount || 0;
  
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -8 }}
      onClick={onOpen}
      className="relative flex flex-col items-start w-full group text-left outline-none"
    >
      {/* Physical Notebook Aesthetic */}
      <div className="w-full aspect-[4/5] bg-white rounded-l-md rounded-r-[2.5rem] shadow-lg border border-[#2b090d]/5 overflow-hidden transition-all group-hover:shadow-2xl group-hover:border-[#521118]/20 flex flex-col relative">
        
        {/* Spine Detail */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-[#521118]/10 border-r border-black/5" />
        <div className="absolute left-1 top-4 flex flex-col gap-4 opacity-40">
           {[...Array(6)].map((_, i) => <div key={i} className="w-2 h-0.5 bg-[#521118] rounded-full" />)}
        </div>

        <div className="p-10 pl-12 flex-1 flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div className="w-12 h-12 bg-[#521118]/5 rounded-2xl flex items-center justify-center text-[#521118]/40 group-hover:bg-[#521118]/10 group-hover:text-[#521118] transition-colors">
              <FileText size={20} />
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(e); }}
              className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition text-stone-300"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <h3 className="text-2xl font-black text-[#2b090d] font-serif leading-tight mb-4 group-hover:text-[#521118] transition-colors">
             {notebook.name}
          </h3>

          <div className="mt-auto space-y-4">
             <div className="flex items-center gap-3">
                <div className="h-1 flex-1 bg-stone-100 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }} 
                     animate={{ width: `${Math.min(100, (words / 1000) * 100)}%` }} 
                     className="h-full bg-emerald-500" 
                   />
                </div>
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{words} WDS</span>
             </div>
             
             <div className="flex items-center justify-between text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">
                <span>{formatDate(notebook.updatedAt)}</span>
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg">{notebook.citationFormat || 'APA'}</span>
             </div>
          </div>
        </div>

        {/* Gloss Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="mt-4 ml-12 flex items-center gap-2 text-[#521118] font-black text-[11px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
         Continue Draft <ArrowRight size={14} />
      </div>
    </motion.button>
  );
}

export default function WriterPage() {
  return (
    <Suspense>
      <WriterPageInner />
    </Suspense>
  );
}