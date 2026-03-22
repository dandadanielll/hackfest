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
  HelpCircle,
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
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#e8e4df] rounded-3xl shadow-2xl shadow-[#2b090d]/20 p-8 w-full max-w-md mx-4 border border-[#2b090d]/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#521118]/40 hover:text-[#521118] p-1 rounded-lg hover:bg-[#521118]/5 transition">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#521118]/10 text-[#521118] p-3 rounded-2xl">
            <FolderInput size={22} />
          </div>
          <div>
            <h2 className="font-bold text-xl text-[#2b090d] font-serif tracking-tight">New Research Folder</h2>
            <p className="text-[#521118]/60 text-sm">Give your folder a descriptive name.</p>
          </div>
        </div>
        <input
          ref={inputRef}
          autoFocus
          className="w-full border-2 border-[#2b090d]/10 bg-white/50 focus:border-[#521118]/30 focus:bg-white focus:ring-4 focus:ring-[#521118]/10 rounded-2xl px-5 py-3.5 text-[#2b090d] font-semibold outline-none transition text-lg placeholder:text-[#2b090d]/20 mb-6"
          placeholder="e.g. Thesis Chapter 2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-5 py-3 rounded-2xl font-bold text-[#521118]/60 bg-[#2b090d]/5 hover:bg-[#2b090d]/10 transition text-sm">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim()}
            className="flex-1 px-5 py-3 rounded-2xl font-bold text-[#f4f2f0] bg-[#521118] hover:bg-[#2b090d] disabled:opacity-50 transition shadow-lg shadow-[#2b090d]/20 text-sm flex items-center justify-center gap-2"
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
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#e8e4df] rounded-3xl shadow-2xl shadow-[#2b090d]/20 p-8 w-full max-w-md mx-4 border border-[#2b090d]/10">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#521118]/40 hover:text-[#521118] p-1 rounded-lg hover:bg-[#521118]/5 transition">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#521118]/10 text-[#521118] p-3 rounded-2xl">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="font-bold text-xl text-[#2b090d] font-serif tracking-tight">Name your Notebook</h2>
            <p className="text-[#521118]/60 text-sm">e.g. Thesis Draft v1</p>
          </div>
        </div>
        <input
          ref={inputRef}
          autoFocus
          className="w-full border-2 border-[#2b090d]/10 bg-white/50 focus:border-[#521118]/30 focus:bg-white focus:ring-4 focus:ring-[#521118]/10 rounded-2xl px-5 py-3.5 text-[#2b090d] font-semibold outline-none transition text-lg placeholder:text-[#2b090d]/20 mb-6"
          placeholder="Notebook Title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") onClose(); }}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-5 py-3 rounded-2xl font-bold text-[#521118]/60 bg-[#2b090d]/5 hover:bg-[#2b090d]/10 transition text-sm">
            Cancel
          </button>
          <button onClick={submit} disabled={!name.trim()} className="flex-1 px-5 py-3 rounded-2xl font-bold text-[#f4f2f0] bg-[#521118] hover:bg-[#2b090d] transition text-sm disabled:opacity-50">
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
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#e8e4df] rounded-3xl shadow-2xl shadow-[#2b090d]/20 p-7 w-full max-w-lg mx-4 border border-[#2b090d]/10 max-h-[80vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-[#521118]/40 hover:text-[#521118] p-1 rounded-lg hover:bg-[#521118]/5 transition">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-5 shrink-0">
          <div className="bg-[#521118]/10 text-[#521118] p-3 rounded-2xl">
            {type === "notebook" ? <FileText size={20} /> : <BookOpen size={20} />}
          </div>
          <div>
            <h2 className="font-bold text-lg text-[#2b090d] font-serif tracking-tight">{title}</h2>
            <p className="text-[#521118]/60 text-xs">{description}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#2b090d]/5">
          {grouped.length === 0 && (
            <p className="text-[#2b090d]/40 text-sm italic text-center py-10 font-medium">
              No {type === "notebook" ? "notebooks" : "articles"} found in any folder.
            </p>
          )}
          {grouped.map(({ folder, items }) => (
            <div key={folder.id}>
              <button
                onClick={() => toggle(folder.id)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-[#521118]/5 transition text-sm font-bold text-[#2b090d]"
              >
                <ChevronRight size={14} className={`transition-transform text-[#521118]/40 ${expandedFolders.has(folder.id) ? "rotate-90" : ""}`} />
                <Folder size={14} className="text-[#521118]/60" />
                {folder.name}
                <span className="ml-auto text-[#521118]/30 font-black text-[10px] bg-white px-1.5 py-0.5 rounded-md border border-[#2b090d]/5 shadow-sm">
                  {items.length}
                </span>
              </button>
              {expandedFolders.has(folder.id) && (
                <div className="ml-8 pb-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onPick({ folderId: folder.id, id: item.id, label: item.label })}
                      className="w-full text-left px-4 py-2.5 text-sm font-bold text-[#2b090d]/60 hover:bg-white hover:text-[#521118] rounded-xl transition truncate flex items-center gap-2"
                    >
                      {type === "notebook" ? <FileText size={13} className="text-[#521118]/30 shrink-0" /> : <BookOpen size={13} className="text-[#521118]/30 shrink-0" />}
                      <span className="truncate">{item.label}</span>
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
  const [showVaultHelp, setShowVaultHelp] = useState(false);
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
    <main className="min-h-screen w-full pb-24 flex flex-col items-center font-sans bg-[#e8e4df]/30 relative">
      <div className="max-w-7xl w-full px-8 pt-12">
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
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-5xl font-black text-[#2b090d] tracking-tight font-serif">Library</h1>
            <p className="text-[#521118]/60 mt-2 font-medium">Organize your research into folders, notebooks, and vaults.</p>
          </div>
          <button
            onClick={() => setShowNewFolderModal(true)}
            className="bg-[#521118] text-[#f4f2f0] px-6 py-3 rounded-2xl font-bold hover:bg-[#2b090d] transition flex items-center gap-2 shadow-xl shadow-[#2b090d]/20 group"
          >
            <Plus size={18} className="group-hover:rotate-90 transition-transform" /> New Research Folder
          </button>
        </div>

        <div className="flex gap-6 min-h-[70vh]">
          {/* ── Left Panel: Folder List ── */}
          <div className="w-64 shrink-0 flex flex-col gap-1.5">
            {folders.length === 0 && (
              <div className="text-center py-16 px-6 bg-[#521118]/5 rounded-3xl border border-[#2b090d]/5">
                <Folder size={32} className="mx-auto text-[#521118]/20 mb-4" />
                <p className="text-xs text-[#521118]/40 italic font-medium">Create a folder to start organizing your research.</p>
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
                      className={`w-full cursor-pointer flex justify-between items-center pl-3 pr-2 py-3.5 rounded-2xl text-sm font-bold transition-all outline-none border ${isActive
                          ? "bg-[#521118]/10 border-[#521118]/20 text-[#2b090d] shadow-sm shadow-[#2b090d]/5"
                          : "text-[#521118]/50 hover:bg-white/70 border-transparent hover:border-[#2b090d]/10 hover:text-[#2b090d]"
                        }`}
                    >
                      <span className="flex items-center gap-3 truncate min-w-0">
                        {isActive ? <FolderOpen size={18} className="text-[#521118] shrink-0" /> : <Folder size={18} className="text-[#521118]/30 shrink-0" />}
                        <span className="truncate">{folder.name}</span>
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-lg text-[#521118]/40 shadow-sm border border-[#2b090d]/5">
                          {folder.articles.length + folder.notebooks.length}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFolderMenuId(folderMenuId === folder.id ? null : folder.id); }}
                          className="p-1 px-1.5 rounded-lg hover:bg-[#521118]/10 transition text-[#521118]/40 opacity-0 group-hover/folder:opacity-100"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Context menu */}
                  {folderMenuId === folder.id && (
                    <div className="absolute right-0 top-full mt-2 z-20 bg-white border border-[#2b090d]/10 rounded-2xl shadow-xl p-1.5 min-w-[160px] shadow-[#2b090d]/10">
                      <button onClick={() => { setRenamingFolderId(folder.id); setRenameValue(folder.name); setFolderMenuId(null); }} className="w-full text-left text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-[#521118]/5 flex items-center gap-2.5 text-[#2b090d]/70 hover:text-[#521118] transition">
                        <Edit3 size={14} /> Rename
                      </button>
                      <button onClick={() => { deleteAFolder(folder.id); setFolderMenuId(null); }} className="w-full text-left text-sm font-bold px-3 py-2.5 rounded-xl hover:bg-rose-50 flex items-center gap-2.5 text-rose-700/70 hover:text-rose-700 transition">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}


          </div>

          {/* ── Right Panel: Folder Content (Articles / Notebooks / Vault) ── */}
          {!activeFolder ? (
            <div className="flex-1 bg-white/20 backdrop-blur-xl border border-[#2b090d]/10 rounded-[2.5rem] flex items-center justify-center">
              <div className="text-center py-20 px-10 max-w-sm">
                <div className="bg-[#521118]/5 border border-[#521118]/10 rounded-[2rem] p-10 mx-auto shadow-sm">
                  <Folder size={40} className="mx-auto text-[#521118]/20 mb-6" />
                  <p className="text-[#2b090d]/40 text-sm font-bold leading-relaxed">Select a folder from the left to explore your collection.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-white/40 backdrop-blur-xl border border-[#2b090d]/10 rounded-3xl p-10 shadow-sm flex flex-col gap-10 min-h-[400px]">
              {/* Panel header */}
              <div className="flex items-end justify-between pb-6 border-b border-[#2b090d]/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#521118]/10 rounded-2xl flex items-center justify-center text-[#521118]">
                    <FolderOpen size={24} />
                  </div>
                  <div>
                    <h2 className="font-black text-3xl text-[#2b090d] font-serif tracking-tight">{activeFolder.name}</h2>
                    <p className="text-[#521118]/40 text-xs font-bold uppercase tracking-widest mt-0.5">FOLDER CONTENTS</p>
                  </div>
                </div>
              </div>

              {/* ── SECTION 1: Articles ── */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#521118]/40 flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-[#521118]/10 rounded-lg flex items-center justify-center text-[#521118]">
                      <BookOpen size={14} />
                    </div>
                    Articles
                    <span className="bg-white text-[#521118]/60 px-2 py-0.5 rounded-md text-[10px] font-black border border-[#2b090d]/5 shadow-sm">
                      {filteredArticles.length}
                    </span>
                  </h3>
                  <div className="flex items-center gap-2.5">
                    {/* Sort */}
                    <div className="flex items-center gap-2 bg-white border border-[#2b090d]/10 rounded-xl px-3.5 py-1.5 shadow-sm">
                      <SortAsc size={13} className="text-[#521118]/40" />
                      <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="text-xs font-bold text-[#2b090d]/70 bg-transparent outline-none cursor-pointer">
                        <option value="savedAt">Recently Saved</option>
                        <option value="title">Title A–Z</option>
                        <option value="credibility">Credibility</option>
                      </select>
                    </div>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#521118]/40" size={13} />
                      <input
                        className="pl-9 pr-4 py-1.5 border border-[#2b090d]/10 rounded-xl text-xs outline-none focus:ring-4 focus:ring-[#521118]/5 w-44 bg-white transition-all font-bold text-[#2b090d] placeholder:text-[#521118]/20 shadow-sm"
                        placeholder="Search articles..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    {/* Upload PDF */}
                    <button
                      onClick={() => pdfInputRef.current?.click()}
                      className="flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-fr">
                    {filteredArticles.map((article) => (
                      <div key={article.id} className="relative group/article">
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
                          className="absolute top-3 right-3 z-[60] opacity-0 group-hover/article:opacity-100 transition text-stone-300 hover:text-rose-600 bg-white rounded-lg p-1 border border-stone-200 shadow-sm"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── SECTION 2: Notebooks ── */}
              <section className="border-t border-[#2b090d]/10 pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#521118]/40 flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-[#521118]/10 rounded-lg flex items-center justify-center text-[#521118]">
                      <FileText size={14} />
                    </div>
                    Notebooks
                    <span className="bg-white text-[#521118]/60 px-2 py-0.5 rounded-md text-[10px] font-black border border-[#2b090d]/5 shadow-sm">
                      {activeFolder.notebooks.length}
                    </span>
                  </h3>
                  <button
                    onClick={handleCreateNotebook}
                    className="flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
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
              <section className="border-t border-[#2b090d]/10 pt-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#521118]/40 flex items-center gap-2.5">
                    <div className="w-6 h-6 bg-[#521118]/10 rounded-lg flex items-center justify-center text-[#521118]">
                      <Lock size={13} />
                    </div>
                    Vault
                    <span className="bg-white text-[#521118]/60 px-2 py-0.5 rounded-md text-[10px] font-black border border-[#2b090d]/5 shadow-sm">
                      {(activeFolder.vault ?? []).length}
                    </span>
                    <div className="relative">
                      <button 
                        onClick={() => setShowVaultHelp(!showVaultHelp)}
                        className={`transition-colors p-1 rounded-full -ml-1 ${showVaultHelp ? 'text-[#521118] bg-[#521118]/5 scale-110' : 'text-[#521118]/20 hover:text-[#521118]/60'}`}
                        title="What is the Vault?"
                      >
                        <HelpCircle size={14} strokeWidth={2.5} />
                      </button>
                      
                      {showVaultHelp && (
                        <>
                          <div className="fixed inset-0 z-[55]" onClick={() => setShowVaultHelp(false)} />
                          <div className="absolute left-0 bottom-full mb-2 w-72 p-5 bg-white/95 backdrop-blur-md border border-[#521118]/20 rounded-2xl shadow-[0_-20px_50px_rgba(82,17,24,0.15)] z-[60] animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                            <div className="relative">
                              <div className="absolute -bottom-7 left-2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white/95" />
                              <p className="text-[10px] text-[#2b090d]/60 leading-relaxed italic max-w-sm mx-auto">
                                The Vault is the context lock for this folder — AI features (Writer Co-pilot, AI Tools, etc.) will only use content added here.
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </h3>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => vaultFileInputRef.current?.click()}
                      className="flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      <Upload size={13} /> Upload File
                    </button>
                    <button
                      onClick={() => setVaultPickerType("article")}
                      className="flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      <BookOpen size={13} /> Add Article
                    </button>
                    <button
                      onClick={() => setVaultPickerType("notebook")}
                      className="flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      <FileText size={13} /> Add Notebook
                    </button>
                  </div>
                </div>

                {(activeFolder.vault ?? []).length === 0 ? (
                  <div className="py-10 text-center bg-[#521118]/5 rounded-2xl border border-[#2b090d]/5">
                    <p className="text-[#521118]/40 text-[11px] sm:text-[12px] italic font-medium px-4 leading-relaxed max-w-2xl mx-auto">
                      The Vault is the context lock for this folder —<br />
                      AI features (Writer Co-pilot, AI Tools, etc.) will only use content added here.
                    </p>
                    <p className="text-[10px] text-[#521118]/30 italic px-6 mt-1.5">
                      No files in this vault yet. Upload files or add articles and notebooks from your Library.
                    </p>
                  </div>
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
      </div>
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
      className="group/card bg-white border border-[#2b090d]/10 rounded-2xl p-4 hover:border-[#521118]/40 hover:shadow-lg transition-all text-left flex items-start gap-4 w-full cursor-pointer outline-none focus:ring-4 focus:ring-[#521118]/5"
    >
      <div className="bg-[#521118]/10 text-[#521118] p-3 rounded-xl shrink-0">
        <FileText size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-[#2b090d] truncate group-hover/card:text-[#521118] transition">{notebook.name}</p>
        <p className="text-[10px] text-[#521118]/40 font-bold uppercase tracking-wider mt-1">Last edited {label}</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/card:opacity-100 transition">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1.5 hover:bg-[#521118]/10 rounded-lg text-[#521118]/20 hover:text-[#521118]/80 transition"
        >
          <Trash2 size={13} />
        </button>
        <ChevronRight size={16} className="text-[#521118]/20 group-hover/card:text-[#521118]/40 transition" />
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
      className={`flex items-center gap-3 bg-white border border-[#2b090d]/10 rounded-2xl px-4 py-3 group hover:border-[#521118]/40 hover:shadow-md transition-all ${isLinked || file.dataUrl ? 'cursor-pointer' : ''}`}
      onClick={isLinked || file.dataUrl ? handleClick : undefined}
    >
      <div className={`p-2.5 rounded-xl shrink-0 ${isLinked ? "bg-[#521118]/10 text-[#521118]" : "bg-[#2b090d]/5 text-[#521118]/40"}`}>
        {file.type === "notebook" ? <FileText size={16} /> : file.type === "article" ? <BookOpen size={16} /> : <FileIcon size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[#2b090d] truncate">{file.name}</p>
        <p className="text-[10px] text-[#521118]/40 font-bold uppercase tracking-wider">
          {isLinked ? (file.type === "article" ? "Article link" : "Notebook link") : sizeLabel ?? file.type}
        </p>
      </div>
      <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 transition p-1.5 hover:bg-[#521118]/10 rounded-lg text-[#521118]/20 hover:text-[#521118]/80">
        <Trash2 size={13} />
      </button>
    </div>
  );
}
