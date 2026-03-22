"use client";

import {
  Folder,
  FolderOpen,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  FileText,
  Lock,
  MoreHorizontal,
  BookOpen,
  Search,
  SortAsc,
  Upload,
  FolderInput,
  File as FileIcon,
  PlusCircle,
  ChevronRight,
} from "lucide-react";
import { useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLibrary } from "@/lib/libraryContext";
import ArticleCard from "@/components/ArticleCard";
import type { SavedArticle, Notebook, VaultFile } from "@/lib/libraryStore";

type SortOption = "savedAt" | "title" | "credibility";

// ─── PDF Metadata Extractor ──────────────────────────────────────────────────
async function extractPdfMetadata(file: File): Promise<Omit<SavedArticle, "savedAt">> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/pdf-info", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("API extraction failed");

    const data = await res.json();
    const meta = data.metadata;

    // Convert file to Base64 so it can be stored in localStorage (if not too large)
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const authors = Array.isArray(meta.authors) && meta.authors.length > 0 
      ? meta.authors.join(", ") 
      : meta.authors || "Unknown";

    const { saveFile } = await import("@/lib/idb");
    const id = `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await saveFile(id, base64).catch(console.error);

    return {
      id,
      title: meta.title || file.name,
      authors: authors,
      year: meta.year || new Date().getFullYear().toString(),
      journal: meta.journal || "Uploaded PDF",
      credibility: typeof meta.credibilityScore === "number" ? meta.credibilityScore : 85,
      abstract: meta.abstract || "",
      keywords: meta.keywords || [],
      localSource: true,
      url: `idb://${id}`, 
    };
  } catch (err) {
    console.error("PDF Extraction failed, falling back to heuristic:", err);
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const { saveFile } = await import("@/lib/idb");
    const id = `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await saveFile(id, base64).catch(console.error);

    return {
      id,
      title: file.name,
      authors: "Unknown",
      year: new Date().getFullYear().toString(),
      journal: "Uploaded PDF",
      credibility: 75,
      abstract: "",
      keywords: [],
      localSource: true,
      url: `idb://${id}`,
    };
  }
}

// ─── Modal: New Folder ───────────────────────────────────────────────────────
function NewFolderModal({ onConfirm, onClose }: { onConfirm: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!name.trim()) return;
    onConfirm(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-stone-900/20 p-8 w-full max-w-md mx-4 border border-stone-200/60">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 text-amber-700 p-3 rounded-2xl">
            <FolderInput size={22} />
          </div>
          <div>
            <h2 className="font-bold text-xl text-stone-900 font-serif">New Research Folder</h2>
            <p className="text-stone-500 text-sm">Give your folder a descriptive name.</p>
          </div>
        </div>
        <input
          ref={inputRef}
          autoFocus
          className="w-full border-2 border-stone-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 rounded-2xl px-5 py-3.5 text-stone-900 font-semibold outline-none transition text-lg placeholder:text-stone-300 mb-6"
          placeholder="e.g. Thesis Chapter 2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-5 py-3 rounded-2xl font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex-1 px-5 py-3 rounded-2xl font-bold text-amber-50 bg-rose-900 hover:bg-rose-800 disabled:opacity-50 transition shadow-lg shadow-rose-900/20 text-sm flex items-center justify-center gap-2"
          >
            <Check size={16} /> Create Folder
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: New Notebook ──────────────────────────────────────────────────────
function NewNotebookModal({ onConfirm, onClose }: { onConfirm: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    if (!name.trim()) return;
    onConfirm(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-stone-900/20 p-8 w-full max-w-md mx-4 border border-stone-200/60">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-100 text-amber-700 p-3 rounded-2xl">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="font-bold text-xl text-stone-900 font-serif">Name your Notebook</h2>
            <p className="text-stone-500 text-sm">e.g. Thesis Draft v1</p>
          </div>
        </div>
        <input
          ref={inputRef}
          autoFocus
          className="w-full border-2 border-stone-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 rounded-2xl px-5 py-3.5 text-stone-900 font-semibold outline-none transition text-lg placeholder:text-stone-300 mb-6"
          placeholder="Notebook Title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-5 py-3 rounded-2xl font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition text-sm">
            Cancel
          </button>
          <button onClick={submit} disabled={!name.trim()} className="flex-1 px-5 py-3 rounded-2xl font-bold text-white bg-stone-900 hover:bg-stone-800 transition text-sm disabled:opacity-50">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Library Picker (for Vault) ──────────────────────────────────────
function LibraryPickerModal({
  title,
  description,
  type,
  folders,
  onPick,
  onClose,
}: {
  title: string;
  description: string;
  type: "notebook" | "article";
  folders: ReturnType<typeof useLibrary>["folders"];
  onPick: (item: { folderId: string; id: string; label: string }) => void;
  onClose: () => void;
}) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const grouped = folders.map((f) => ({
    folder: f,
    items: type === "notebook"
      ? f.notebooks.map((nb) => ({ id: nb.id, label: nb.name }))
      : f.articles.map((a) => ({ id: a.id, label: a.title })),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl shadow-stone-900/20 p-7 w-full max-w-lg mx-4 border border-stone-200/60 max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100 transition">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="bg-amber-100 text-amber-700 p-3 rounded-2xl">
            {type === "notebook" ? <FileText size={20} /> : <BookOpen size={20} />}
          </div>
          <div>
            <h2 className="font-bold text-lg text-stone-900 font-serif">{title}</h2>
            <p className="text-stone-500 text-xs">{description}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
          {grouped.length === 0 && (
            <p className="text-stone-400 text-sm italic text-center py-10">
              No {type === "notebook" ? "notebooks" : "articles"} found in any folder.
            </p>
          )}
          {grouped.map(({ folder, items }) => (
            <div key={folder.id}>
              <button
                onClick={() => toggle(folder.id)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-stone-50 transition text-sm font-bold text-stone-700"
              >
                <ChevronRight size={14} className={`transition-transform ${expandedFolders.has(folder.id) ? "rotate-90" : ""}`} />
                <Folder size={14} className="text-amber-600" />
                {folder.name}
                <span className="ml-auto text-stone-400 font-normal text-xs">{items.length}</span>
              </button>
              {expandedFolders.has(folder.id) && (
                <div className="ml-8 pb-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onPick({ folderId: folder.id, id: item.id, label: item.label })}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-amber-50 hover:text-rose-900 rounded-xl transition truncate flex items-center gap-2"
                    >
                      {type === "notebook" ? <FileText size={13} className="text-amber-500 shrink-0" /> : <BookOpen size={13} className="text-emerald-500 shrink-0" />}
                      {item.label}
                    </button>
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

// ─── Main Library Page ───────────────────────────────────────────────────────
export default function LibraryPage() {
  const router = useRouter();
  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    addFolder,
    renameAFolder,
    deleteAFolder,
    removeArticle,
    saveArticle,
    addNotebook,
    removeNotebook,
    addToVault,
    removeFromVault,
  } = useLibrary();

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("savedAt");
  const [folderMenuId, setFolderMenuId] = useState<string | null>(null);
  const [vaultPickerType, setVaultPickerType] = useState<"notebook" | "article" | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const vaultFileInputRef = useRef<HTMLInputElement>(null);

  const activeFolder = folders.find((f) => f.id === activeFolderId) ?? null;

  const filteredArticles = useMemo(() => {
    let arts = activeFolder?.articles ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      arts = arts.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.authors.toLowerCase().includes(q) ||
          a.journal.toLowerCase().includes(q)
      );
    }
    return [...arts].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "credibility") return b.credibility - a.credibility;
      return b.savedAt - a.savedAt;
    });
  }, [activeFolder, search, sort]);

  const handlePdfUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !activeFolderId) return;
      for (const file of Array.from(files)) {
        if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) continue;
        const meta = await extractPdfMetadata(file);
        saveArticle(activeFolderId, meta);
      }
    },
    [activeFolderId, saveArticle]
  );

  const handleVaultUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || !activeFolderId) return;
      for (const file of Array.from(files)) {
        if (file.size > 1024 * 1024) {
          alert(`File "${file.name}" is too large (>1MB). Please use smaller files for Local Library (Storage limits).`);
          continue;
        }

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const { saveFile } = await import("@/lib/idb");
        const id = `vault_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await saveFile(id, base64).catch(console.error);

        const vaultItem: Omit<VaultFile, "addedAt"> = {
          id,
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl: `idb://${id}`,
        };
        addToVault(activeFolderId, vaultItem);
      }
    },
    [activeFolderId, addToVault]
  );

  const handleVaultPickArticle = ({ folderId, id, label }: { folderId: string; id: string; label: string }) => {
    if (!activeFolderId) return;
    addToVault(activeFolderId, {
      id: `vault_art_${id}`,
      name: label,
      type: "article",
      linkedArticleId: id,
      linkedFolderId: folderId,
    });
    setVaultPickerType(null);
  };

  const handleVaultPickNotebook = ({ folderId, id, label }: { folderId: string; id: string; label: string }) => {
    if (!activeFolderId) return;
    addToVault(activeFolderId, {
      id: `vault_nb_${id}`,
      name: label,
      type: "notebook",
      linkedNotebookId: id,
      linkedFolderId: folderId,
    });
    setVaultPickerType(null);
  };

  const handleOpenNotebook = (nb: Notebook) => {
    if (!activeFolderId) return;
    router.push(`/writer?folderId=${activeFolderId}&notebookId=${nb.id}`);
  };

  const handleCreateNotebook = () => {
    setShowNotebookModal(true);
  };

  const handleCreateNotebookSubmit = (name: string) => {
    if (!activeFolderId || !name.trim()) return;
    addNotebook(activeFolderId, name.trim());
    setShowNotebookModal(false);
  };

  return (
    <main className="max-w-7xl w-full px-8 pt-12 pb-24">
      {/* Modals */}
      {showNewFolderModal && (
        <NewFolderModal
          onConfirm={(name) => { addFolder(name); setShowNewFolderModal(false); }}
          onClose={() => setShowNewFolderModal(false)}
        />
      )}
      {showNotebookModal && (
        <NewNotebookModal
          onConfirm={(name) => {
            if (activeFolderId) addNotebook(activeFolderId, name);
            setShowNotebookModal(false);
          }}
          onClose={() => setShowNotebookModal(false)}
        />
      )}
      {vaultPickerType === "article" && (
        <LibraryPickerModal
          title="Add Article to Vault"
          description="Pick an article from your Library to add to this folder's Vault context."
          type="article"
          folders={folders}
          onPick={handleVaultPickArticle}
          onClose={() => setVaultPickerType(null)}
        />
      )}
      {vaultPickerType === "notebook" && (
        <LibraryPickerModal
          title="Add Notebook to Vault"
          description="Pick a notebook from your Library to add to this folder's Vault context."
          type="notebook"
          folders={folders}
          onPick={handleVaultPickNotebook}
          onClose={() => setVaultPickerType(null)}
        />
      )}

      {/* Hidden file inputs */}
      <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" multiple className="hidden" onChange={(e) => handlePdfUpload(e.target.files)} />
      <input ref={vaultFileInputRef} type="file" multiple className="hidden" onChange={(e) => handleVaultUpload(e.target.files)} />

      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight font-serif">Library</h1>
          <p className="text-stone-500 mt-1 font-medium">Organize your saved research into folders, notebooks, and vaults.</p>
        </div>
        <button
          onClick={() => setShowNewFolderModal(true)}
          className="bg-rose-900 text-amber-50 px-5 py-2.5 rounded-xl font-bold hover:bg-rose-800 transition flex items-center gap-2 text-sm shadow-xl shadow-rose-900/20"
        >
          <Plus size={16} /> New Folder
        </button>
      </div>

      <div className="flex gap-6 min-h-[70vh]">
        {/* ── Left Panel: Folder List ── */}
        <div className="w-64 shrink-0 flex flex-col gap-1.5">
          {folders.length === 0 && (
            <div className="text-center py-12 px-4">
              <Folder size={32} className="mx-auto text-stone-300 mb-3" />
              <p className="text-xs text-stone-400 italic">Create a folder to start organizing your research.</p>
            </div>
          )}

          {folders.map((folder) => {
            const isActive = folder.id === activeFolderId;
            return (
              <div key={folder.id} className="relative group/folder">
                {renamingFolderId === folder.id ? (
                  <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-xl px-3 py-2 shadow-sm">
                    <input
                      autoFocus
                      className="flex-1 text-sm outline-none bg-transparent font-semibold text-stone-900"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { renameAFolder(folder.id, renameValue.trim()); setRenamingFolderId(null); }
                        if (e.key === "Escape") setRenamingFolderId(null);
                      }}
                    />
                    <button onClick={() => { renameAFolder(folder.id, renameValue.trim()); setRenamingFolderId(null); }} className="text-emerald-600 hover:text-emerald-800 transition"><Check size={14} strokeWidth={3} /></button>
                    <button onClick={() => setRenamingFolderId(null)} className="text-stone-400 hover:text-stone-700 transition"><X size={14} /></button>
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => { setActiveFolderId(folder.id); setFolderMenuId(null); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveFolderId(folder.id);
                        setFolderMenuId(null);
                      }
                    }}
                    className={`w-full cursor-pointer flex justify-between items-center pl-3 pr-2 py-3 rounded-xl text-sm font-semibold transition-all outline-none focus:ring-2 focus:ring-amber-500/20 ${
                      isActive
                        ? "bg-amber-100/60 shadow-sm border border-amber-200/60 text-rose-900"
                        : "text-stone-600 hover:bg-white/70 border border-transparent hover:border-stone-200 hover:text-stone-900"
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate min-w-0">
                      {isActive ? <FolderOpen size={16} className="text-amber-600 shrink-0" /> : <Folder size={16} className="text-stone-400 shrink-0" />}
                      <span className="truncate">{folder.name}</span>
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded-md text-stone-400 shadow-sm border border-stone-100">
                        {folder.articles.length + folder.notebooks.length}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFolderMenuId(folderMenuId === folder.id ? null : folder.id); }}
                        className="p-1 rounded-lg hover:bg-stone-200/60 transition text-stone-400 opacity-0 group-hover/folder:opacity-100"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Context menu */}
                {folderMenuId === folder.id && (
                  <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-stone-200 rounded-xl shadow-xl p-1 min-w-[140px]">
                    <button onClick={() => { setRenamingFolderId(folder.id); setRenameValue(folder.name); setFolderMenuId(null); }} className="w-full text-left text-sm font-semibold px-3 py-2 rounded-lg hover:bg-stone-100 flex items-center gap-2 text-stone-700">
                      <Edit3 size={14} /> Rename
                    </button>
                    <button onClick={() => { deleteAFolder(folder.id); setFolderMenuId(null); }} className="w-full text-left text-sm font-semibold px-3 py-2 rounded-lg hover:bg-rose-50 flex items-center gap-2 text-rose-700">
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Vault context badge */}
          {activeFolder && (
            <div className="mt-auto pt-4 border-t border-stone-200/60">
              <div className="bg-amber-50 border border-amber-200/50 rounded-xl p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 mb-1">
                  <Lock size={11} strokeWidth={3} className="text-rose-700" /> VAULT ACTIVE
                </div>
                <p className="text-[10px] text-stone-500 leading-snug italic">AI features in this folder are restricted to its vault content only.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Panel: Folder Content (Articles / Notebooks / Vault) ── */}
        {!activeFolder ? (
          <div className="flex-1 bg-white/60 backdrop-blur-md border border-stone-200/60 rounded-[2rem] flex items-center justify-center">
            <div className="text-center py-16 px-8 max-w-xs">
              <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 mx-auto">
                <Folder size={36} className="mx-auto text-amber-400 mb-4" />
                <p className="text-stone-500 text-sm font-medium leading-relaxed">Select a folder from the left to view its content.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white/60 backdrop-blur-md border border-stone-200/60 rounded-[2rem] p-8 shadow-sm flex flex-col gap-8 min-h-[400px]">
            {/* Panel header */}
            <div className="flex items-center gap-3 pb-5 border-b border-stone-200/50">
              <FolderOpen size={22} className="text-amber-600 shrink-0" />
              <h2 className="font-bold text-2xl text-stone-900 font-serif">{activeFolder.name}</h2>
            </div>

            {/* ── SECTION 1: Articles ── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-stone-400 flex items-center gap-2">
                  <BookOpen size={14} /> Articles
                  <span className="bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md text-[10px] font-black ml-1">
                    {filteredArticles.length}
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  {/* Sort */}
                  <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5">
                    <SortAsc size={13} className="text-stone-400" />
                    <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="text-xs font-bold text-stone-600 bg-transparent outline-none cursor-pointer">
                      <option value="savedAt">Recently Saved</option>
                      <option value="title">Title A–Z</option>
                      <option value="credibility">Credibility</option>
                    </select>
                  </div>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" size={13} />
                    <input
                      className="pl-8 pr-3 py-1.5 border border-stone-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500/30 w-44 bg-white/80 transition-all font-medium text-stone-800 placeholder:text-stone-400"
                      placeholder="Search articles..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {/* Upload PDF */}
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-600 bg-white hover:bg-amber-50 hover:text-rose-900 hover:border-amber-200 border border-stone-200 px-3 py-1.5 rounded-xl transition"
                  >
                    <Upload size={13} /> Upload PDF
                  </button>
                </div>
              </div>

              {filteredArticles.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-6 inline-block">
                    <BookOpen size={28} className="mx-auto text-amber-300 mb-2" />
                    <p className="text-stone-400 text-sm font-medium">
                      {search ? `No articles match "${search}".` : "No articles yet. Search for papers or upload a PDF."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredArticles.map((article) => (
                    <div key={article.id} className="relative group/card">
                      <ArticleCard
                        articleId={article.id}
                        title={article.title}
                        authors={article.authors}
                        year={article.year}
                        journal={article.journal}
                        credibility={article.credibility}
                        abstract={article.abstract}
                        localSource={article.localSource}
                        openAccess={article.openAccess}
                        url={article.url}
                        hideActions={true}
                      />
                      <button
                        onClick={() => removeArticle(activeFolder.id, article.id)}
                        title="Remove from folder"
                        className="absolute top-3 right-3 z-10 opacity-0 group-hover/card:opacity-100 transition text-stone-300 hover:text-rose-600 bg-white rounded-lg p-1 border border-stone-200 shadow-sm"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── SECTION 2: Notebooks ── */}
            <section className="border-t border-stone-200/60 pt-7">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-stone-400 flex items-center gap-2">
                  <FileText size={14} /> Notebooks
                  <span className="bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md text-[10px] font-black ml-1">
                    {activeFolder.notebooks.length}
                  </span>
                </h3>
                <button
                  onClick={handleCreateNotebook}
                  className="flex items-center gap-1.5 text-xs font-bold text-stone-600 bg-white hover:bg-amber-50 hover:text-rose-900 hover:border-amber-200 border border-stone-200 px-3 py-1.5 rounded-xl transition"
                >
                  <PlusCircle size={13} /> New Notebook
                </button>
              </div>

              {activeFolder.notebooks.length === 0 ? (
                <p className="text-stone-400 text-sm italic text-center py-6">No notebooks yet. Create one and it will open in AI Writer.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeFolder.notebooks.map((nb) => (
                    <NotebookCard
                      key={nb.id}
                      notebook={nb}
                      onOpen={() => handleOpenNotebook(nb)}
                      onDelete={() => removeNotebook(activeFolder.id, nb.id)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── SECTION 3: Vault ── */}
            <section className="border-t border-stone-200/60 pt-7">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-[0.15em] text-stone-400 flex items-center gap-2">
                  <Lock size={13} /> Vault
                  <span className="bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md text-[10px] font-black ml-1">
                    {(activeFolder.vault ?? []).length}
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => vaultFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-600 bg-white hover:bg-amber-50 hover:text-rose-900 hover:border-amber-200 border border-stone-200 px-3 py-1.5 rounded-xl transition"
                  >
                    <Upload size={13} /> Upload File
                  </button>
                  <button
                    onClick={() => setVaultPickerType("article")}
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-600 bg-white hover:bg-amber-50 hover:text-rose-900 hover:border-amber-200 border border-stone-200 px-3 py-1.5 rounded-xl transition"
                  >
                    <BookOpen size={13} /> Add Article
                  </button>
                  <button
                    onClick={() => setVaultPickerType("notebook")}
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-600 bg-white hover:bg-amber-50 hover:text-rose-900 hover:border-amber-200 border border-stone-200 px-3 py-1.5 rounded-xl transition"
                  >
                    <FileText size={13} /> Add Notebook
                  </button>
                </div>
              </div>

              <p className="text-xs text-stone-400 italic mb-4 leading-relaxed">
                The Vault is the context lock for this folder — AI features (Writer Co-pilot, AI Tools, etc.) will only use content added here.
              </p>

              {(activeFolder.vault ?? []).length === 0 ? (
                <p className="text-stone-400 text-sm italic text-center py-6">
                  No files in this vault yet. Upload files or add articles and notebooks from your Library.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(activeFolder.vault ?? []).map((vf) => (
                    <VaultFileRow 
                      key={vf.id} 
                      file={vf} 
                      onRemove={() => removeFromVault(activeFolder.id, vf.id)}
                      resolveUrl={() => {
                        let url = vf.dataUrl;
                        if (vf.type === "article" && vf.linkedArticleId && vf.linkedFolderId) {
                           const f = folders.find(x => x.id === vf.linkedFolderId);
                           const a = f?.articles.find(x => x.id === vf.linkedArticleId);
                           if (a) url = a.url;
                        }
                        return url;
                      }}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* Click-outside to close folder menu */}
      {folderMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setFolderMenuId(null)} />
      )}
    </main>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NotebookCard({ notebook, onOpen, onDelete }: { notebook: Notebook; onOpen: () => void; onDelete: () => void }) {
  const ts = new Date(notebook.updatedAt);
  const label = ts.toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group/card bg-white border border-stone-200 rounded-2xl p-4 hover:border-amber-300 hover:shadow-md transition text-left flex items-start gap-3 w-full cursor-pointer outline-none focus:ring-2 focus:ring-amber-500/20"
    >
      <div className="bg-amber-100 text-amber-700 p-2.5 rounded-xl shrink-0">
        <FileText size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-stone-900 truncate group-hover/card:text-rose-900 transition">{notebook.name}</p>
        <p className="text-[10px] text-stone-400 font-medium mt-0.5">Last saved {label}</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/card:opacity-100 transition">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 hover:bg-rose-50 rounded-lg text-stone-300 hover:text-rose-500 transition"
        >
          <Trash2 size={13} />
        </button>
        <ChevronRight size={16} className="text-stone-300 group-hover/card:text-rose-400 transition" />
      </div>
    </div>
  );
}

function VaultFileRow({ file, onRemove, resolveUrl }: { file: VaultFile; onRemove: () => void; resolveUrl?: () => string | undefined }) {
  const isLinked = file.type === "article" || file.type === "notebook";
  const sizeLabel = file.size ? `${(file.size / 1024).toFixed(1)} KB` : null;

  const handleClick = async () => {
    let target = resolveUrl ? resolveUrl() : file.dataUrl;
    if (!target) return;
    try {
      if (target.startsWith("idb://")) {
        const { getFile } = await import("@/lib/idb");
        target = await getFile(target.replace("idb://", ""));
      }
      if (target) {
        const w = window.open("");
        if (w) w.document.write(`<iframe width="100%" height="100%" src="${target}"></iframe>`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div 
      className={`flex items-center gap-3 bg-white border border-stone-200 rounded-xl px-4 py-3 group hover:border-amber-200 transition ${isLinked || file.dataUrl ? 'cursor-pointer' : ''}`}
      onClick={isLinked || file.dataUrl ? handleClick : undefined}
    >
      <div className={`p-2 rounded-xl shrink-0 ${isLinked ? "bg-amber-50 text-amber-600" : "bg-stone-50 text-stone-500"}`}>
        {file.type === "notebook" ? <FileText size={15} /> : file.type === "article" ? <BookOpen size={15} /> : <FileIcon size={15} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-stone-800 truncate">{file.name}</p>
        <p className="text-[10px] text-stone-400 font-medium">
          {isLinked ? (file.type === "article" ? "Article link" : "Notebook link") : sizeLabel ?? file.type}
        </p>
      </div>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 transition p-1.5 hover:bg-rose-50 rounded-lg text-stone-300 hover:text-rose-500">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
