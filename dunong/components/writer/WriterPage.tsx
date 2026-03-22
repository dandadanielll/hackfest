'use client';

<<<<<<< HEAD
import { useState, useEffect } from 'react';
import type { LibraryFolder, Notebook } from '@/lib/writer.types';
import {
  getFolders, createFolder, createNotebook, deleteNotebook, formatDate,
} from '@/lib/writerStorage';
=======
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Notebook } from '@/lib/libraryStore';
import { useLibrary } from '@/lib/libraryContext';
import { deleteNotebook, formatDate } from '@/lib/writerStorage';
>>>>>>> origin/lib-new
import WriterEditor from './WriterEditor';

type View = 'select' | 'editor';

function WriterPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { folders, addNotebook, removeNotebook, addFolder } = useLibrary();

  const [view, setView] = useState<View>('select');
<<<<<<< HEAD
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [activeFolder, setActiveFolder] = useState<LibraryFolder | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [showNewNb, setShowNewNb] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [newNbFolder, setNewNbFolder] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const load = () => {
    const f = getFolders();
    setFolders(f);
    if (f.length > 0) {
      setExpanded(new Set(f.map((x) => x.id)));
      if (!newNbFolder) setNewNbFolder(f[0].id);
    }
  };

  useEffect(() => { load(); }, []);
=======
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
>>>>>>> origin/lib-new

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

<<<<<<< HEAD
=======
  // Resolve active notebook + folder from library data
  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;
  const activeNotebook = activeFolder?.notebooks.find((n) => n.id === activeNotebookId) ?? null;

>>>>>>> origin/lib-new
  if (view === 'editor' && activeNotebook && activeFolder) {
    return (
      <WriterEditor
        notebook={activeNotebook}
        folder={activeFolder}
<<<<<<< HEAD
        onBack={() => { setView('select'); load(); }}
=======
        onBack={handleBack}
>>>>>>> origin/lib-new
      />
    );
  }

  return (
    <div className="flex h-full bg-[#F5F0E8] overflow-hidden">

      {/* Sidebar */}
      <aside className="w-[270px] min-w-[270px] flex flex-col bg-white border-r border-[#E8DFD0] overflow-hidden">
        <div className="px-5 pt-5 pb-3 shrink-0 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#1A0A00] text-base mb-0.5" style={{ fontFamily: 'Georgia, serif' }}>
              My Notebooks
            </h2>
            <p className="text-xs text-gray-400">
              {totalNb} notebook{totalNb !== 1 ? 's' : ''} · {folders.length} folder{folders.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button 
            onClick={() => {
              const name = window.prompt("Enter new folder name:");
              if (name && name.trim()) {
                addFolder(name.trim());
              }
            }}
            className="text-stone-400 hover:text-rose-900 transition p-1 rounded-md hover:bg-stone-100"
            title="New Folder"
          >
            <svg xmlns="http://www.w3.org/0000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
          </button>
        </div>

        <div className="px-4 pb-3 shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notebooks…"
            className="w-full px-3 py-1.5 text-xs border border-[#E0D8CC] rounded-lg outline-none bg-[#FAFAF8] focus:border-[#8B1A1A]"
          />
        </div>

<<<<<<< HEAD
        <button
          onClick={() => setShowNewNb(true)}
          className="mx-4 mb-3 py-2 bg-[#8B1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#6B1212] transition-colors shrink-0"
        >
          + New Notebook
        </button>

=======
>>>>>>> origin/lib-new
        <div className="flex-1 overflow-y-auto">
          {displayFolders.length === 0 && search && (
            <p className="text-center text-xs text-gray-400 py-6">No results for &ldquo;{search}&rdquo;</p>
          )}
          {folders.length === 0 && !search && (
            <p className="text-center text-xs text-gray-400 italic py-8 px-4">
              No folders yet. Create folders and notebooks in the Library.
            </p>
          )}
          {displayFolders.map((folder) => (
            <div key={folder.id}>
              <button
                onClick={() => toggleFolder(folder.id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-[10px] text-gray-400 w-3 shrink-0">
                  {expanded.has(folder.id) ? '▾' : '▸'}
                </span>
                <span className="text-sm shrink-0">📁</span>
                <span className="flex-1 text-[13px] font-semibold text-[#1A0A00] truncate">{folder.name}</span>
                {(folder.vault?.length ?? 0) > 0 && (
<<<<<<< HEAD
                  <span className="text-[10px] text-[#8B1A1A] shrink-0" title={`${folder.vault.length} vault sources`}>
=======
                  <span className="text-[10px] text-[#8B1A1A] shrink-0" title={`${folder.vault.length} vault items`}>
>>>>>>> origin/lib-new
                    🛡{folder.vault.length}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 shrink-0">
                  {folder.notebooks.length}
                </span>
              </button>

              {expanded.has(folder.id) && (
                <div className="pl-8 pr-2">
                  <button
                    onClick={() => handleCreateNotebook(folder.id)}
                    className="w-full text-left px-2 py-1 text-[11px] text-[#8B1A1A] font-semibold hover:bg-[#FFF8F6] rounded-lg transition mb-0.5"
                  >
                    + New notebook here
                  </button>
                  {folder.notebooks.length === 0 ? (
                    <p className="text-[11px] text-gray-300 italic py-1.5 pl-2">No notebooks yet.</p>
                  ) : (
                    folder.notebooks.map((nb) => (
                      <div
                        key={nb.id}
<<<<<<< HEAD
                        onClick={() => openNotebook(nb, folder)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F5F0E8] transition-colors group mb-0.5 cursor-pointer"
=======
                        role="button"
                        tabIndex={0}
                        onClick={() => openNotebook(nb, folder.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') openNotebook(nb, folder.id); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F5F0E8] transition-colors group mb-0.5 cursor-pointer outline-none focus:ring-2 focus:ring-[#8B1A1A]/20"
>>>>>>> origin/lib-new
                      >
                        <span className="text-sm shrink-0">📄</span>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[12px] font-semibold text-[#1A0A00] truncate">{nb.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {nb.wordCount && nb.wordCount > 0 ? `${nb.wordCount.toLocaleString()}w · ` : ''}
                            {formatDate(nb.updatedAt)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, folder.id, nb.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-xs px-1 transition-all"
                          title="Delete Notebook"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
<<<<<<< HEAD

        <div className="px-4 py-3 border-t border-[#E8DFD0] shrink-0">
          {showNewFolder ? (
            <div>
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                placeholder="Folder name"
                className="w-full px-2.5 py-1.5 text-xs border border-[#8B1A1A] rounded-lg outline-none mb-2"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowNewFolder(false)} className="flex-1 py-1 border border-[#D0C4B8] rounded-md text-xs text-gray-500">Cancel</button>
                <button onClick={handleCreateFolder} className="flex-1 py-1 bg-[#1A0A00] text-white rounded-md text-xs font-semibold">Create</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="w-full py-1.5 border border-dashed border-[#D0C4B8] rounded-lg text-xs text-gray-400 hover:border-[#8B1A1A] hover:text-[#8B1A1A] transition-colors"
            >
              + New Folder
            </button>
          )}
        </div>
=======
>>>>>>> origin/lib-new
      </aside>

      {/* Main Area */}
      <main className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A0A00] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            AI Writer
          </h1>
          <p className="text-sm text-gray-500">Select a notebook to open, or create one inside a folder.</p>
        </div>

        {totalNb === 0 && (
          <div className="text-center pt-16">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-bold text-[#1A0A00] mb-2" style={{ fontFamily: 'Georgia, serif' }}>No notebooks yet</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
              {folders.length === 0
                ? 'Create a folder in the Library, then add notebooks here.'
                : 'Click "+ New notebook here" under any folder in the sidebar.'}
            </p>
          </div>
        )}

        {totalNb > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {folders.flatMap((folder) =>
              folder.notebooks.map((nb) => (
                <button
                  key={nb.id}
                  onClick={() => openNotebook(nb, folder.id)}
                  className="text-left bg-white rounded-xl p-5 border border-[#E8DFD0] hover:border-[#8B1A1A] hover:shadow-md transition-all group flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] bg-[#F0EBE3] text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                      {folder.name}
                    </span>
                    {(folder.vault?.length ?? 0) > 0 && (
                      <span className="text-[10px] bg-[#FFF0F0] text-[#8B1A1A] font-semibold px-2 py-0.5 rounded-full">
                        🛡 {folder.vault.length}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl mt-1">📄</div>
                  <h3 className="font-bold text-[#1A0A00] text-sm leading-snug" style={{ fontFamily: 'Georgia, serif' }}>
                    {nb.name}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {nb.wordCount && nb.wordCount > 0 ? `${nb.wordCount.toLocaleString()} words` : 'Empty'}
                  </p>
                  <p className="text-[10px] text-gray-300">{formatDate(nb.updatedAt)}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0EBE3]">
                    <span className="text-[10px] bg-[#FFF0F0] text-[#8B1A1A] font-bold px-1.5 py-0.5 rounded">
                      {nb.citationFormat ?? 'APA'}
                    </span>
                    <span className="text-[11px] text-[#8B1A1A] font-semibold group-hover:underline">
                      Open →
                    </span>
                  </div>
                </button>
              ))
            )}
<<<<<<< HEAD

            <button
              onClick={() => setShowNewNb(true)}
              className="border-2 border-dashed border-[#D0C4B8] rounded-xl min-h-[160px] flex flex-col items-center justify-center gap-2 hover:border-[#8B1A1A] hover:bg-[#FFF8F6] transition-all group"
            >
              <span className="text-3xl text-[#D0C4B8] group-hover:text-[#8B1A1A] transition-colors">+</span>
              <span className="text-xs text-gray-400 font-semibold group-hover:text-[#8B1A1A] transition-colors">New Notebook</span>
            </button>
          </div>
        )}
      </main>

      {/* New Notebook Modal */}
      {showNewNb && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-7 w-[420px] shadow-2xl">
            <h3 className="text-lg font-bold text-[#1A0A00] mb-5" style={{ fontFamily: 'Georgia, serif' }}>
              Create New Notebook
            </h3>
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Document Name
              </label>
              <input
                autoFocus
                value={newNbName}
                onChange={(e) => setNewNbName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNotebook()}
                placeholder="e.g. Chapter 1 – Introduction"
                className="w-full px-3 py-2 border border-[#D0C4B8] rounded-lg text-sm outline-none focus:border-[#8B1A1A]"
              />
            </div>
            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Save to Folder
              </label>
              <select
                value={newNbFolder}
                onChange={(e) => setNewNbFolder(e.target.value)}
                className="w-full px-3 py-2 border border-[#D0C4B8] rounded-lg text-sm outline-none focus:border-[#8B1A1A] bg-white"
              >
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            {folders.length === 0 && (
              <p className="text-xs text-[#8B1A1A] mb-4">Create a folder first (use the sidebar).</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setShowNewNb(false); setNewNbName(''); }}
                className="flex-1 py-2.5 border border-[#D0C4B8] rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNotebook}
                disabled={!newNbName.trim() || folders.length === 0}
                className="flex-[2] py-2.5 bg-[#8B1A1A] text-white rounded-lg text-sm font-semibold hover:bg-[#6B1212] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Create & Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
=======
          </div>
        )}
      </main>
    </div>
  );
}

export default function WriterPage() {
  return (
    <Suspense>
      <WriterPageInner />
    </Suspense>
  );
>>>>>>> origin/lib-new
}