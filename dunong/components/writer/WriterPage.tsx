'use client';

import { useState, useEffect } from 'react';
import type { LibraryFolder, Notebook } from '@/lib/writer.types';
import {
  getFolders, createFolder, createNotebook, deleteNotebook,
  getWriterSettings, saveWriterSettings, formatDate,
} from '@/lib/writerStorage';
import WriterEditor from './WriterEditor';

type View = 'select' | 'editor';

export default function WriterPage() {
  const [view, setView] = useState<View>('select');
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<Notebook | null>(null);
  const [activeFolder, setActiveFolder] = useState<LibraryFolder | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [apiKey, setApiKey] = useState('');
  const [search, setSearch] = useState('');
  // New notebook modal
  const [showNewNb, setShowNewNb] = useState(false);
  const [newNbName, setNewNbName] = useState('');
  const [newNbFolder, setNewNbFolder] = useState('');
  // New folder form
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

  useEffect(() => {
  load();
  const s = getWriterSettings();
  // Use env key if no manually saved key
  setApiKey(s.groqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY || '');
}, []);

  const openNotebook = (nb: Notebook, folder: LibraryFolder) => {
    setActiveNotebook(nb);
    setActiveFolder(folder);
    setView('editor');
  };

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    saveWriterSettings({ groqApiKey: key });
  };

  const toggleFolder = (id: string) =>
    setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleCreateNotebook = () => {
    const fid = newNbFolder || folders[0]?.id;
    if (!fid || !newNbName.trim()) return;
    const result = createNotebook(fid, newNbName);
    if (!result) return;
    setNewNbName('');
    setShowNewNb(false);
    load();
    openNotebook(result.notebook, result.folder);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName);
    setNewFolderName('');
    setShowNewFolder(false);
    load();
  };

  const handleDelete = (e: React.MouseEvent, nbId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this notebook? This cannot be undone.')) return;
    deleteNotebook(nbId);
    load();
  };

  const totalNb = folders.reduce((a, f) => a + f.notebooks.length, 0);

  const displayFolders = search
    ? folders
        .map((f) => ({ ...f, notebooks: f.notebooks.filter((n) => n.name.toLowerCase().includes(search.toLowerCase())) }))
        .filter((f) => f.notebooks.length > 0)
    : folders;

  // ─── Editor view ──────────────────────────────────────────────────────────

  if (view === 'editor' && activeNotebook && activeFolder) {
    return (
      <WriterEditor
        notebook={activeNotebook}
        folder={activeFolder}
        onBack={() => { setView('select'); load(); }}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
      />
    );
  }

  // ─── Selection view ───────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-[#F5F0E8] overflow-hidden">

      {/* ── Sidebar ── */}
      <aside className="w-[270px] min-w-[270px] flex flex-col bg-white border-r border-[#E8DFD0] overflow-hidden">
        <div className="px-5 pt-5 pb-3 shrink-0">
          <h2 className="font-bold text-[#1A0A00] text-base mb-0.5" style={{ fontFamily: 'Georgia, serif' }}>
            My Notebooks
          </h2>
          <p className="text-xs text-gray-400">
            {totalNb} notebook{totalNb !== 1 ? 's' : ''} · {folders.length} folder{folders.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="px-4 pb-3 shrink-0">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notebooks…"
            className="w-full px-3 py-1.5 text-xs border border-[#E0D8CC] rounded-lg outline-none bg-[#FAFAF8] focus:border-[#8B1A1A]"
          />
        </div>

        <button
          onClick={() => setShowNewNb(true)}
          className="mx-4 mb-3 py-2 bg-[#8B1A1A] text-white text-xs font-semibold rounded-lg hover:bg-[#6B1212] transition-colors shrink-0"
        >
          + New Notebook
        </button>

        {/* Folder list */}
        <div className="flex-1 overflow-y-auto">
          {displayFolders.length === 0 && search && (
            <p className="text-center text-xs text-gray-400 py-6">No results for &ldquo;{search}&rdquo;</p>
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
                  <span className="text-[10px] text-[#8B1A1A] shrink-0" title={`${folder.vault.length} vault sources`}>
                    🏛{folder.vault.length}
                  </span>
                )}
                <span className="text-[10px] text-gray-400 bg-gray-100 rounded-full px-1.5 py-0.5 shrink-0">
                  {folder.notebooks.length}
                </span>
              </button>

              {expanded.has(folder.id) && (
                <div className="pl-8 pr-2">
                  {folder.notebooks.length === 0 ? (
                    <p className="text-[11px] text-gray-300 italic py-1.5 pl-2">No notebooks yet.</p>
                  ) : (
                    folder.notebooks.map((nb) => (
                      <button
                        key={nb.id}
                        onClick={() => openNotebook(nb, folder)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[#F5F0E8] transition-colors group mb-0.5"
                      >
                        <span className="text-sm shrink-0">📄</span>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[12px] font-semibold text-[#1A0A00] truncate">{nb.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {nb.wordCount > 0 ? `${nb.wordCount.toLocaleString()}w · ` : ''}
                            {formatDate(nb.lastSaved)}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDelete(e, nb.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-xs px-1 transition-all"
                        >
                          ✕
                        </button>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* New Folder */}
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
      </aside>

      {/* ── Main Area ── */}
      <main className="flex-1 overflow-auto p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[#1A0A00] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            AI Writer
          </h1>
          <p className="text-sm text-gray-500">Select a notebook to open, or create a new one.</p>
        </div>

        {/* Empty state */}
        {totalNb === 0 && (
          <div className="text-center pt-16">
            <div className="text-5xl mb-4">📝</div>
            <h3 className="text-lg font-bold text-[#1A0A00] mb-2" style={{ fontFamily: 'Georgia, serif' }}>No notebooks yet</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
              Create your first notebook to start writing with Vault-locked AI assistance.
            </p>
            <button
              onClick={() => setShowNewNb(true)}
              className="px-6 py-2.5 bg-[#8B1A1A] text-white font-semibold rounded-lg text-sm hover:bg-[#6B1212] transition-colors"
            >
              + Create Your First Notebook
            </button>
          </div>
        )}

        {/* Notebook grid */}
        {totalNb > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {folders.flatMap((folder) =>
              folder.notebooks.map((nb) => (
                <button
                  key={nb.id}
                  onClick={() => openNotebook(nb, folder)}
                  className="text-left bg-white rounded-xl p-5 border border-[#E8DFD0] hover:border-[#8B1A1A] hover:shadow-md transition-all group flex flex-col gap-1.5"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] bg-[#F0EBE3] text-gray-500 font-semibold px-2 py-0.5 rounded-full">
                      {folder.name}
                    </span>
                    {(folder.vault?.length ?? 0) > 0 && (
                      <span className="text-[10px] bg-[#FFF0F0] text-[#8B1A1A] font-semibold px-2 py-0.5 rounded-full">
                        🏛 {folder.vault.length}
                      </span>
                    )}
                  </div>
                  <div className="text-2xl mt-1">📄</div>
                  <h3 className="font-bold text-[#1A0A00] text-sm leading-snug" style={{ fontFamily: 'Georgia, serif' }}>
                    {nb.name}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {nb.wordCount > 0 ? `${nb.wordCount.toLocaleString()} words` : 'Empty'}
                  </p>
                  <p className="text-[10px] text-gray-300">{formatDate(nb.lastSaved)}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0EBE3]">
                    <span className="text-[10px] bg-[#FFF0F0] text-[#8B1A1A] font-bold px-1.5 py-0.5 rounded">
                      {nb.citationFormat}
                    </span>
                    <span className="text-[11px] text-[#8B1A1A] font-semibold group-hover:underline">
                      Open →
                    </span>
                  </div>
                </button>
              ))
            )}

            {/* New notebook card */}
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

      {/* ── New Notebook Modal ── */}
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
                placeholder="e.g. Chapter 1 — Introduction"
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
                Create &amp; Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
