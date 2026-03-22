'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Notebook } from '@/lib/libraryStore';
import { useLibrary } from '@/lib/libraryContext';
import { deleteNotebook, formatDate } from '@/lib/writerStorage';
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
                  <span className="text-[10px] text-[#8B1A1A] shrink-0" title={`${folder.vault.length} vault items`}>
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
                        role="button"
                        tabIndex={0}
                        onClick={() => openNotebook(nb, folder.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter') openNotebook(nb, folder.id); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F5F0E8] transition-colors group mb-0.5 cursor-pointer outline-none focus:ring-2 focus:ring-[#8B1A1A]/20"
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
}