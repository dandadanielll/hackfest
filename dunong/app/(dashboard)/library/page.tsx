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
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "@/lib/libraryContext";
import ArticleCard from "@/components/ArticleCard";
import type { SavedArticle, Notebook, VaultFile, Author } from "@/lib/libraryStore";

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

    const authorString = Array.isArray(meta.authors) && meta.authors.length > 0
      ? meta.authors.join(", ")
      : meta.authors || "Unknown";
    const parsedAuthors = authorString.split(",").map((name: string) => {
      const parts = name.trim().split(/\s+/);
      if (parts.length <= 1) return { firstName: "", lastName: parts[0] || "Unknown" };
      return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
    });

    const { saveFile } = await import("@/lib/idb");
    const id = `pdf_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await saveFile(id, base64).catch(console.error);

    return {
      id,
      title: meta.title || file.name,
      authors: parsedAuthors,
      year: meta.year || new Date().getFullYear().toString(),
      month: "",
      day: "",
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
      authors: [{ firstName: "", lastName: "Unknown" }],
      year: new Date().getFullYear().toString(),
      month: "",
      day: "",
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

// ─── Modal: Edit Article ─────────────────────────────────────────────────────
function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  label,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  label: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-1.5 relative" ref={containerRef}>
      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">{label}</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 flex justify-between items-center focus:ring-2 focus:ring-amber-500 outline-none transition-all"
      >
        <span>{value || placeholder}</span>
        <ChevronRight size={14} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute z-[60] mt-2 w-full bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-stone-100 bg-stone-50">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                autoFocus
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <div className="p-4 text-center text-xs text-stone-400 italic">No matches</div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                  setSearch("");
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${value === opt ? "bg-amber-100 text-amber-900 font-bold" : "hover:bg-stone-50 text-stone-700"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditArticleModal({
  article,
  onConfirm,
  onClose,
}: {
  article: SavedArticle;
  onConfirm: (updates: Partial<SavedArticle>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    title: article.title,
    authors: Array.isArray(article.authors) ? article.authors : [{ firstName: "", lastName: article.authors || "Unknown" }],
    year: article.year || new Date().getFullYear().toString(),
    month: article.month || "",
    day: article.day || "",
    journal: article.journal,
    abstract: article.abstract,
    url: article.url,
  });

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 150 }, (_, i) => (current + 5 - i).toString());
  }, []);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const days = useMemo(() => {
    let count = 31;
    if (formData.month === "February") {
      const yearNum = parseInt(formData.year);
      const isLeap = (yearNum % 4 === 0 && yearNum % 100 !== 0) || (yearNum % 400 === 0);
      count = isLeap ? 29 : 28;
    } else if (["April", "June", "September", "November"].includes(formData.month)) {
      count = 30;
    }
    return Array.from({ length: count }, (_, i) => (i + 1).toString());
  }, [formData.year, formData.month]);

  const addAuthor = () => {
    setFormData({
      ...formData,
      authors: [...formData.authors, { firstName: "", lastName: "" }]
    });
  };

  const updateAuthor = (index: number, field: keyof Author, val: string) => {
    const newAuthors = [...formData.authors];
    newAuthors[index] = { ...newAuthors[index], [field]: val };
    setFormData({ ...formData, authors: newAuthors });
  };

  const removeAuthor = (index: number) => {
    if (formData.authors.length <= 1) return;
    setFormData({
      ...formData,
      authors: formData.authors.filter((_, i) => i !== index)
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-stone-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Edit3 size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-stone-900">Edit Article Details</h2>
              <p className="text-xs text-stone-500">Update metadata for citations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-200/50 rounded-full transition-colors text-stone-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Title</label>
            <textarea
              required
              rows={2}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Authors</label>
              <button
                type="button"
                onClick={addAuthor}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 transition-colors"
              >
                <PlusCircle size={14} /> Add Author
              </button>
            </div>
            <div className="space-y-3">
              {formData.authors.map((author, idx) => (
                <div key={idx} className="flex gap-3 items-end bg-stone-50/50 p-3 rounded-2xl border border-stone-100 relative group">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-stone-400 uppercase ml-1">First Name</label>
                    <input
                      type="text"
                      placeholder="First Name"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                      value={author.firstName}
                      onChange={(e) => updateAuthor(idx, "firstName", e.target.value)}
                    />
                  </div>
                  <div className="w-16 space-y-1">
                    <label className="text-[9px] font-bold text-stone-400 uppercase ml-1">M.I.</label>
                    <input
                      type="text"
                      placeholder="M.I."
                      maxLength={2}
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                      value={author.middleName || ""}
                      onChange={(e) => updateAuthor(idx, "middleName", e.target.value)}
                    />
                  </div>
                  <div className="flex-[1.5] space-y-1">
                    <label className="text-[9px] font-bold text-stone-400 uppercase ml-1">Last Name</label>
                    <input
                      type="text"
                      placeholder="Last Name"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none"
                      value={author.lastName}
                      onChange={(e) => updateAuthor(idx, "lastName", e.target.value)}
                    />
                  </div>
                  {formData.authors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAuthor(idx)}
                      className="p-2 text-stone-300 hover:text-rose-600 transition-colors mb-0.5"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <SearchableSelect
              label="Year"
              value={formData.year}
              options={years}
              placeholder="Year"
              onChange={(val) => setFormData({ ...formData, year: val })}
            />
            <SearchableSelect
              label="Month"
              value={formData.month}
              options={months}
              placeholder="Optional"
              onChange={(val) => setFormData({ ...formData, month: val })}
            />
            <SearchableSelect
              label="Day"
              value={formData.day}
              options={days}
              placeholder="Optional"
              onChange={(val) => setFormData({ ...formData, day: val })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Publication/Journal</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              value={formData.journal}
              onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">URL / DOI Link</label>
            <input
              type="text"
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold text-stone-900 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Abstract / Verdict</label>
            <textarea
              rows={4}
              className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none leading-relaxed"
              value={formData.abstract}
              onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
            />
          </div>
        </form>

        <div className="p-6 bg-stone-50 border-t border-stone-100 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-stone-500 hover:text-stone-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={submit}
            className="flex-[2] py-3 bg-rose-900 text-white rounded-2xl text-sm font-bold hover:bg-rose-800 transition-all shadow-lg shadow-rose-900/20"
          >
            Save Changes
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
    editArticle,
    addNotebook,
    removeNotebook,
    addToVault,
    removeFromVault,
  } = useLibrary();

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<SavedArticle | null>(null);
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
          a.authors.some(auth =>
            auth.firstName.toLowerCase().includes(q) ||
            (auth.middleName || "").toLowerCase().includes(q) ||
            auth.lastName.toLowerCase().includes(q)
          ) ||
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
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="min-h-screen w-full pb-24 relative flex flex-col items-center font-sans bg-[#e8e4df]/30 overflow-x-hidden"
    >

      <div className="max-w-7xl w-full px-8 pt-16 relative">
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
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-5">
            <div className="bg-[#521118]/10 text-[#521118] border border-[#521118]/10 p-4 rounded-3xl shadow-sm shrink-0">
              <BookOpen size={32} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#2b090d] tracking-tight font-serif">
                Library
              </h1>
              <p className="text-[#521118]/60 text-lg mt-1 font-medium">
                Organize your research into folders, notebooks, and vaults.
              </p>
            </div>
          </div>
          
          {/* Library Global Statistics */}
          <div className="hidden lg:flex items-center gap-8 bg-white/40 backdrop-blur-md border border-[#2b090d]/10 px-8 py-4 rounded-3xl shadow-sm">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-[#2b090d] font-serif tracking-tight">
                {folders.length}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#521118]/50 mt-0.5">
                Folders
              </span>
            </div>
            <div className="w-px h-8 bg-[#2b090d]/10" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-[#2b090d] font-serif tracking-tight">
                {folders.reduce((acc, f) => acc + f.articles.length, 0)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#521118]/50 mt-0.5">
                Articles
              </span>
            </div>
            <div className="w-px h-8 bg-[#2b090d]/10" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-[#2b090d] font-serif tracking-tight">
                {folders.reduce((acc, f) => acc + f.notebooks.length, 0)}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#521118]/50 mt-0.5">
                Notebooks
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-6 min-h-[70vh]">
          {/* ── Left Panel: Folder List ── */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
            className="w-64 shrink-0 flex flex-col gap-1.5"
          >
            {folders.length === 0 && (
              <div className="text-center py-16 px-6 bg-[#521118]/5 rounded-3xl border border-[#2b090d]/5">
                <Folder size={32} className="mx-auto text-[#521118]/20 mb-4" />
                <p className="text-xs text-[#521118]/40 italic font-medium mb-4">Create a folder to start organizing your research.</p>
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="w-full bg-white text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl font-bold hover:bg-[#521118]/5 transition flex items-center justify-center gap-2 shadow-sm text-xs"
                >
                  <Plus size={14} /> New Folder
                </button>
              </div>
            )}

            {folders.map((folder) => {
              const isActive = folder.id === activeFolderId;
              return (
                <motion.div
                  key={folder.id}
                  variants={{
                    hidden: { opacity: 0, x: -10 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  className="relative group/folder"
                >
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
                </motion.div>
              );
            })}
          </motion.div>

          {/* ── Right Panel: Folder Content (Articles / Notebooks / Vault) ── */}
          <AnimatePresence mode="wait">
            {!activeFolder ? (
              <motion.div
                key="empty-library"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="flex-1 bg-white/20 backdrop-blur-xl border border-[#2b090d]/10 rounded-[2.5rem] flex items-center justify-center"
              >
              <div className="text-center py-20 px-10 max-w-sm">
                <div className="bg-[#521118]/5 border border-[#521118]/10 rounded-[2rem] p-10 mx-auto shadow-sm">
                  <Folder size={40} className="mx-auto text-[#521118]/20 mb-6" />
                  <p className="text-[#2b090d]/40 text-sm font-bold leading-relaxed mb-6">Select a folder from the left or create a new one to start your collection.</p>
                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="w-full bg-[#521118] text-[#f4f2f0] px-5 py-3 rounded-2xl font-bold hover:bg-[#2b090d] transition flex items-center justify-center gap-2 shadow-md shadow-[#2b090d]/20 group text-sm"
                  >
                    <Plus size={16} className="group-hover:rotate-90 transition-transform" /> New Research Folder
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeFolder.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex-1 bg-white/40 backdrop-blur-xl border border-[#2b090d]/10 rounded-3xl p-10 shadow-sm flex flex-col gap-10 min-h-[400px]"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between pb-6 border-b border-[#2b090d]/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#521118]/10 rounded-2xl flex items-center justify-center text-[#521118]">
                    <FolderOpen size={24} />
                  </div>
                  <div>
                    <h2 className="font-black text-3xl text-[#2b090d] font-serif tracking-tight">{activeFolder.name}</h2>
                    <p className="text-[#521118]/40 text-xs font-bold uppercase tracking-widest mt-0.5">FOLDER CONTENTS</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="bg-[#521118] text-[#f4f2f0] px-5 py-2.5 rounded-2xl font-bold hover:bg-[#2b090d] transition flex items-center gap-2 shadow-md shadow-[#2b090d]/20 group text-sm"
                >
                  <Plus size={16} className="group-hover:rotate-90 transition-transform" /> New Research Folder
                </button>
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
                      className="group flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      <Upload size={13} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" /> Upload PDF
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
                    <AnimatePresence>
                      {filteredArticles.map((article) => (
                    <motion.div
                      key={article.id}
                      whileHover={{ scale: 1.01, y: -2, zIndex: 50 }}
                      whileTap={{ scale: 0.99 }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ArticleCard
                        key={article.id}
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
                        onDelete={() => removeArticle(activeFolder.id, article.id)}
                      />
                    </motion.div>
                    ))}
                    </AnimatePresence>
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
                    className="group flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
                  >
                    <PlusCircle size={13} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-12" /> New Notebook
                  </button>
                </div>

                {activeFolder.notebooks.length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-6 inline-block">
                      <FileText size={28} className="mx-auto text-amber-300 mb-2" />
                      <p className="text-stone-400 text-sm font-medium">
                        No notebooks yet. Create one and it will open in AI Writer.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AnimatePresence>
                      {activeFolder.notebooks.map((nb) => (
                        <motion.div
                          key={nb.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                        >
                          <NotebookCard
                            key={nb.id}
                            notebook={nb}
                            onOpen={() => handleOpenNotebook(nb)}
                            onDelete={() => removeNotebook(activeFolder.id, nb.id)}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
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
                      className="group flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      <Upload size={13} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" /> Upload File
                    </button>
                    <button
                      onClick={() => setVaultPickerType("article")}
                      className="group flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      <BookOpen size={13} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" /> Add Article
                    </button>
                    <button
                      onClick={() => setVaultPickerType("notebook")}
                      className="group flex items-center gap-2 text-xs font-bold text-[#2b090d]/70 bg-white hover:bg-[#521118]/5 hover:text-[#521118] border border-[#2b090d]/10 px-4 py-2 rounded-xl transition shadow-sm"
                    >
                      <FileText size={13} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-12" /> Add Notebook
                    </button>
                  </div>
                </div>

                {(activeFolder.vault ?? []).length === 0 ? (
                  <div className="py-10 text-center">
                    <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-6 inline-block">
                      <Lock size={28} className="mx-auto text-amber-300 mb-2" />
                      <p className="text-stone-400 text-sm font-medium mb-1">
                        The Vault is the context lock for this folder —<br />
                        AI features (Writer Co-pilot, AI Tools, etc.) will only use content added here.
                      </p>
                      <p className="text-stone-400 text-xs font-medium opacity-80">
                        No files in this vault yet. Upload files or add articles and notebooks from your Library.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <AnimatePresence>
                      {(activeFolder.vault ?? []).map((vf) => (
                        <motion.div
                          key={vf.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ duration: 0.2 }}
                        >
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
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </section>
            </motion.div>
          )}
          </AnimatePresence>
        </div>

        {/* Click-outside to close folder menu */}
        {folderMenuId && (
          <div className="fixed inset-0 z-10" onClick={() => setFolderMenuId(null)} />
        )}
      </div>
    </motion.main>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function NotebookCard({ notebook, onOpen, onDelete }: { notebook: Notebook; onOpen: () => void; onDelete: () => void }) {
  const ts = new Date(notebook.updatedAt);
  const label = ts.toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
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
    </motion.div>
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
    <motion.div
      className={`flex items-center gap-3 bg-white border border-[#2b090d]/10 rounded-2xl px-4 py-3 group hover:border-[#521118]/40 hover:shadow-md transition-all ${isLinked || file.dataUrl ? 'cursor-pointer' : ''}`}
      onClick={isLinked || file.dataUrl ? handleClick : undefined}
      whileHover={{ scale: 1.01, x: 4 }}
      whileTap={{ scale: 0.99 }}
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
    </motion.div>
  );
}
