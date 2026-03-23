"use client";

import {
  ShieldCheck, Search, Upload, X, FileText,
  CheckCircle2, XCircle, HelpCircle, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, Library, FolderOpen, Link as LinkIcon
} from "lucide-react";
import { FaCheck } from 'react-icons/fa6';
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLibrary } from "@/lib/libraryContext";
import { useDevMode } from "@/lib/devModeContext";
import { SavedArticle } from "@/lib/libraryStore";
import FolderPickerPopup from "@/components/FolderPickerPopup";

// ─── Types ─────────────────────────────────────────────────────────────────

type Grade = "A" | "B" | "C" | "D" | "F";
type InputMode = 'link' | 'file' | 'library';

interface Dimension {
  label: string;
  score: number;
  note: string;
}

interface CredibilityResult {
  grade: Grade;
  verdict: string;
  dimensions: Dimension[];
  recommendation: string;
  metadata?: {
    title: string | null;
    authors: string | null;
    journal: string | null;
    issn: string | null;
    publisher: string | null;
    doi: string | null;
    year: string | null;
  };
}

// ─── Grade Config ───────────────────────────────────────────────────────────

const GRADE_CONFIG: Record<Grade, {
  label: string;
  color: string;
  bg: string;
  border: string;
  ring: string;
  badgeBg: string;
  badgeText: string;
  arc: number; // out of 251 (full circle circumference)
}> = {
  A: {
    label: "Safe to Cite",
    color: "text-emerald-800",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    ring: "focus:ring-emerald-300/30",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    arc: 20,
  },
  B: {
    label: "Cite with Standard Caution",
    color: "text-blue-800",
    bg: "bg-blue-50",
    border: "border-blue-200",
    ring: "focus:ring-blue-300/30",
    badgeBg: "bg-blue-600",
    badgeText: "text-white",
    arc: 60,
  },
  C: {
    label: "Cite with Caution",
    color: "text-amber-800",
    bg: "bg-amber-50",
    border: "border-amber-200",
    ring: "focus:ring-amber-300/30",
    badgeBg: "bg-amber-500",
    badgeText: "text-white",
    arc: 110,
  },
  D: {
    label: "Verify Before Citing",
    color: "text-orange-800",
    bg: "bg-orange-50",
    border: "border-orange-200",
    ring: "focus:ring-orange-300/30",
    badgeBg: "bg-orange-500",
    badgeText: "text-white",
    arc: 170,
  },
  F: {
    label: "Do Not Cite",
    color: "text-red-800",
    bg: "bg-red-50",
    border: "border-red-200",
    ring: "focus:ring-red-300/30",
    badgeBg: "bg-red-600",
    badgeText: "text-white",
    arc: 251,
  },
};

const GRADE_DESCRIPTIONS: Record<Grade, string> = {
  A: "Peer-reviewed, accredited, credible publisher.",
  B: "Peer-reviewed but not formally accredited.",
  C: "Not peer-reviewed but from a credible institution.",
  D: "Unknown peer review status, unclear publisher.",
  F: "No verifiable peer review, no identifiable publisher.",
};

const GRADE_STROKE: Record<Grade, string> = {
  A: "#059669",
  B: "#2563EB",
  C: "#D97706",
  D: "#EA580C",
  F: "#DC2626",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function scoreToColor(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  if (score >= 25) return "text-orange-500";
  return "text-red-500";
}

function scoreToIcon(score: number) {
  if (score >= 75) return <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />;
  if (score >= 40) return <HelpCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />;
  return <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />;
}

async function extractPdfText(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const maxPages = Math.min(pdf.numPages, 6);
    const parts: string[] = [];
    for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        parts.push(content.items.map((item: unknown) => ((item as { str?: string }).str ?? "")).join(" "));
    }
    return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 5000);
  } catch {
    return "";
  }
}

async function extractDocxText(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(new Uint8Array(buffer));
    const matches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) ?? [];
    return matches.map((m) => m.replace(/<[^>]+>/g, "")).join(" ").slice(0, 6000);
  } catch {
    return `Document: ${file.name}`;
  }
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function DimensionRow({ dim, index }: { dim: Dimension; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-stone-50 border border-stone-100 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-5 text-left hover:bg-stone-100/60 transition-colors"
      >
        {scoreToIcon(dim.score)}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-black text-stone-400 mb-1">
            {dim.label}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${dim.score}%`,
                  backgroundColor:
                    dim.score >= 75 ? "#059669" : dim.score >= 40 ? "#D97706" : "#DC2626",
                  transitionDelay: `${index * 120}ms`,
                }}
              />
            </div>
            <span className={`text-sm font-black tabular-nums ${scoreToColor(dim.score)}`}>
              {dim.score}
            </span>
          </div>
        </div>
        {open ? (
          <ChevronUp size={14} className="text-stone-400 mt-1 shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-stone-400 mt-1 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-4 pt-0 border-t border-stone-100">
          <p className="text-sm text-stone-600 leading-relaxed">{dim.note}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CredibilityPage() {
  const { folders, saveArticle } = useLibrary();
  const { addLog, startLogGroup } = useDevMode();
  const [mode, setMode] = useState<InputMode>('link');
  const [urlOrDoi, setUrlOrDoi] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<SavedArticle | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CredibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [addedToLibrary, setAddedToLibrary] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isAnimating, setIsAnimating] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);



  const toggleFolder = (id: string) =>
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const performAnalysis = async (payload: { text?: string; url?: string; doi?: string }) => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setAddedToLibrary(false);

    const source = "Credibility Score";
    const runTitle = payload.doi ? `Scoring DOI: ${payload.doi}` : payload.url ? `Scoring Link: ${payload.url}` : `Scoring Text Content`;
    const groupId = startLogGroup("/credibility", runTitle, source);
    
    addLog(`Initiating credibility analysis logic...`, groupId);
    if (payload.doi) addLog(`Target DOI: ${payload.doi}`, groupId);
    if (payload.url) addLog(`Target URL: ${payload.url}`, groupId);
    if (payload.text) addLog(`Target text payload loaded (${payload.text.length} chars)`, groupId);
    addLog("Cross-referencing CHED, PHILJOL, and Scopus databases...", groupId);

    try {
      const res = await fetch("/api/credibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed. Please try again.");
      addLog(`Received grading matrix completion. Result processed: ${data.grade}`, groupId);
      setResult(data as CredibilityResult);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong.";
      addLog(`Analysis failed: ${errMsg}`, groupId);
      setError(errMsg);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAnalyze = async () => {
    if (mode === 'link' && !urlOrDoi.trim()) {
      setError("Please enter a URL or DOI.");
      return;
    }
    if (mode === 'file' && !file) {
      setError("Please upload a file.");
      return;
    }
    if (mode === 'library' && !selectedArticle) {
      setError("Please select an article from your library.");
      return;
    }

    const payload: { text?: string; url?: string; doi?: string } = {};

    if (mode === 'library' && selectedArticle) {
      payload.text = [
        `Title: ${selectedArticle.title}`,
        `Authors: ${Array.isArray(selectedArticle.authors) ? selectedArticle.authors.map(a => `${a.firstName} ${a.lastName}`).join(", ") : selectedArticle.authors}`,
        `Year: ${selectedArticle.year}`,
        `Journal: ${selectedArticle.journal}`,
        selectedArticle.url ? `URL: ${selectedArticle.url}` : '',
      ].filter(Boolean).join('\n');
    } else if (mode === 'file' && file) {
      let text = "";
      if (file.name.toLowerCase().endsWith(".docx")) {
        text = await extractDocxText(file);
      } else if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
        text = await extractPdfText(file);
      }
      payload.text = text || `FILE: ${file.name}`;
    } else {
      const val = urlOrDoi.trim();
      const isDoi = val.startsWith("10.") || val.includes("doi.org");
      if (isDoi) {
        payload.doi = val;
      } else {
        payload.url = val;
      }
    }

    await performAnalysis(payload);
  };

  const handleSelectArticle = (article: SavedArticle, folderName: string) => {
    setSelectedArticle(article);
    setSelectedFolderName(folderName);
    setShowLibraryPicker(false);
    setError(null);
    setResult(null);
  };

  const handleConfirmSave = (folderId: string) => {
    if (!result) return;
    const meta = result.metadata;
    const score = result.grade === 'A' ? 95 : result.grade === 'B' ? 80 : result.grade === 'C' ? 60 : result.grade === 'D' ? 40 : 20;

    const article = {
      id: crypto.randomUUID(),
      title: meta?.title || "Untitled Article",
      authors: Array.isArray(meta?.authors) ? meta?.authors : [],
      year: meta?.year || new Date().getFullYear().toString(),
      journal: meta?.journal || meta?.publisher || "Unknown Source",
      credibility: score,
      abstract: result.verdict,
      keywords: [],
      localSource: mode === 'file',
      url: meta?.doi ? `https://doi.org/${meta.doi}` : urlOrDoi,
    };

    saveArticle(folderId, article);
    setAddedToLibrary(true);
    setShowFolderPicker(false);
  };

  const totalArticles = folders.reduce((a, f) => a + f.articles.length, 0);
  const cfg = result ? GRADE_CONFIG[result.grade] : null;

  return (
    <motion.main 
      className={`min-h-screen w-full pb-24 relative font-sans bg-[#e8e4df]/30 overflow-x-hidden ${isAnimating ? "overflow-hidden" : "overflow-y-auto"}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        onAnimationComplete={() => setIsAnimating(false)}
        className="w-full flex flex-col items-center"
      >
        <div className="max-w-4xl w-full mx-auto px-8 pt-16 relative flex flex-col items-center">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="bg-[#521118]/10 text-[#521118] border border-[#521118]/10 p-4 rounded-3xl shadow-sm mb-6">
            <FaCheck size={32} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-[#2b090d] tracking-tight font-serif">
              Credibility Score
            </h1>
            <p className="text-[#521118]/60 text-lg mt-2 font-medium max-w-2xl">
              AI-driven evaluation against CHED, PHILJOL, and Scopus databases.
            </p>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-3 mb-8">
          {([
            { id: 'link', label: 'URL or DOI', icon: <LinkIcon size={14} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" /> },
            { id: 'file', label: 'Upload File', icon: <Upload size={14} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" /> },
            { id: 'library', label: 'From Library', icon: <FolderOpen size={14} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" /> },
          ] as { id: InputMode; label: string; icon: React.ReactNode }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setMode(tab.id);
                setError(null);
                setResult(null);
                setSelectedArticle(null);
                setFile(null);
                setUrlOrDoi('');
                setShowLibraryPicker(false);
              }}
              className={`group flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold border transition-all duration-300 ${mode === tab.id
                ? 'bg-[#521118] text-[#e8e4df] border-[#521118] shadow-md shadow-[#521118]/20'
                : 'bg-white/60 backdrop-blur-md text-[#521118]/60 border-[#521118]/10 hover:border-[#521118]/30 hover:text-[#521118]'
                }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Generator Box */}
        <div className="bg-white/90 backdrop-blur-md border border-[#2b090d]/10 rounded-3xl p-6 md:p-8 shadow-xl shadow-[#2b090d]/5 mb-10 w-full max-w-3xl overflow-hidden flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="w-full"
            >
              <div className="flex flex-col sm:flex-row gap-3 items-stretch w-full">
                <div className="relative flex-1 w-full flex items-center bg-[#F9FBFD]/50 border-2 border-[#2b090d]/10 rounded-2xl focus-within:border-[#521118] focus-within:ring-4 focus-within:ring-[#521118]/5 transition-all overflow-hidden shadow-inner h-16">
                  {/* Link / DOI mode */}
                  {mode === 'link' && (
                    <div className="flex-1 flex items-center px-4 h-full">
                      <LinkIcon className="text-[#521118]/40 shrink-0 mr-3" size={20} />
                      <input
                        className="w-full bg-transparent py-4 outline-none text-[#2b090d] font-serif placeholder:font-sans placeholder:text-stone-400 text-base h-full"
                        placeholder="Paste article URL or DOI..."
                        value={urlOrDoi}
                        onChange={(e) => setUrlOrDoi(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                      />
                    </div>
                  )}

                  {/* File upload mode */}
                  {mode === 'file' && (
                    <div className="flex-1 h-full">
                      {file ? (
                        <div className="flex items-center justify-between px-5 h-full bg-[#521118]/5">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="text-[#521118]" size={20} />
                            <span className="font-bold text-[#521118] truncate text-sm">{file.name}</span>
                          </div>
                          <button onClick={() => setFile(null)} className="p-1 hover:bg-[#521118]/10 rounded-full text-stone-500">
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="w-full h-full flex items-center justify-center gap-3 hover:bg-[#521118]/5 transition-colors px-6">
                          <Upload size={18} className="text-[#521118]/30" />
                          <span className="text-[11px] font-black text-[#521118]/60 uppercase tracking-[0.15em]">Upload Research File</span>
                        </button>
                      )}
                      <input type="file" ref={fileInputRef} onChange={(e) => setFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.docx" />
                    </div>
                  )}

                  {/* Library mode */}
                  {mode === 'library' && (
                    <div className="flex-1 h-full">
                      {selectedArticle ? (
                        <div className="flex items-center justify-between gap-4 bg-[#521118]/5 px-6 h-full shadow-inner">
                          <div className="min-w-0">
                            <p className="font-bold text-[#2b090d] text-sm leading-snug font-serif line-clamp-1">{selectedArticle.title}</p>
                            <p className="text-[10px] text-[#521118]/60 mt-0.5 font-black uppercase tracking-widest">{selectedFolderName} · {selectedArticle.year}</p>
                          </div>
                          <button onClick={() => { setSelectedArticle(null); setShowLibraryPicker(true); }} className="p-1 hover:bg-[#521118]/10 rounded-full text-stone-400">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setShowLibraryPicker(!showLibraryPicker)} className="w-full h-full flex items-center justify-between px-6 hover:bg-[#521118]/5 transition-all text-left group">
                          <div className="flex items-center gap-3">
                            <FolderOpen size={18} className="text-[#521118]/40 group-hover:text-[#521118] transition-colors" />
                            <span className="text-[#521118]/60 font-bold uppercase tracking-wide text-xs group-hover:text-[#521118]">
                              {totalArticles === 0 ? 'No articles yet' : 'Select From Library'}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-[#521118]/30 bg-[#521118]/5 px-2 py-1 rounded-md">{totalArticles}</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={analyzing || (mode === 'link' && !urlOrDoi.trim()) || (mode === 'file' && !file) || (mode === 'library' && !selectedArticle)}
                  className="bg-[#521118] text-[#e8e4df] px-8 rounded-2xl font-bold hover:bg-[#2b090d] transition-all disabled:opacity-40 shadow-md shadow-[#521118]/10 flex items-center justify-center gap-2 h-16 min-w-[160px]"
                >
                  {analyzing ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {analyzing ? 'Analyzing...' : 'Analyze'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Library picker */}
          {mode === 'library' && (
            <AnimatePresence>
              {showLibraryPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 16 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="border border-[#2b090d]/10 rounded-2xl bg-white/40 backdrop-blur-sm shadow-inner max-h-60 overflow-y-auto">
                    {folders.length === 0 ? (
                      <div className="px-6 py-10 text-center text-[#521118]/40">
                        <FolderOpen size={32} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium italic">No articles saved yet.</p>
                      </div>
                    ) : (
                      folders.map((folder) => (
                        <div key={folder.id} className="border-b last:border-0 border-[#2b090d]/5">
                          <button onClick={() => toggleFolder(folder.id)} className="w-full flex items-center gap-3 px-6 py-4 bg-[#521118]/5 hover:bg-[#521118]/10 transition-colors text-left">
                            <span className="text-[#521118]/40">{expandedFolders.has(folder.id) ? <ChevronDown size={14} /> : <ChevronUp size={14} />}</span>
                            <span className="text-sm font-black uppercase tracking-widest text-[#521118]/70">{folder.name}</span>
                            <span className="text-[10px] font-black text-[#521118]/30 ml-auto">{folder.articles.length}</span>
                          </button>
                          {expandedFolders.has(folder.id) && (
                            <div className="divide-y divide-[#2b090d]/5">
                              {folder.articles.map((art) => (
                                <button key={art.id} onClick={() => handleSelectArticle(art, folder.name)} className="w-full flex items-start gap-4 px-10 py-4 hover:bg-[#521118]/5 transition-all text-left group">
                                  <FileText size={16} className="text-[#521118]/20 group-hover:text-[#521118] mt-0.5" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-bold text-[#2b090d] leading-snug group-hover:text-[#521118] font-serif truncate">{art.title}</p>
                                    <p className="text-[11px] text-[#521118]/50 mt-1 font-medium">{art.year}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Status indicator */}
        {analyzing && (
           <div className="mb-12 text-center animate-pulse">
             <p className="text-sm text-[#521118]/60 font-medium italic">Cross-referencing databases...</p>
           </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-10 flex items-center gap-3 text-red-700 bg-red-50 px-5 py-4 rounded-2xl text-sm font-bold border border-red-100 shadow-sm animate-in shake-1">
            <AlertTriangle size={18} /> {error}
          </div>
        )}

        {/* Results */}
        {result && cfg && (
          <div className="animate-in fade-in zoom-in-95 duration-500 space-y-5 w-full max-w-3xl">
            <div className={`rounded-[2.5rem] border-2 ${cfg.border} ${cfg.bg} p-8 md:p-10 shadow-xl shadow-[#2b090d]/5`}>
              <div className="flex flex-col md:flex-row gap-8 items-center mb-8 pb-8 border-b border-black/5">
                <div className="relative w-28 h-28 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#e7e5e4" strokeWidth="8" fill="none" />
                    <circle cx="50" cy="50" r="40" stroke={GRADE_STROKE[result.grade]} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray="251" strokeDashoffset={cfg.arc} className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-stone-900 font-serif leading-none">{result.grade}</span>
                    <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">Grade</span>
                  </div>
                </div>
                <div className="text-center md:text-left">
                  <div className={`inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${cfg.badgeBg} ${cfg.badgeText}`}>
                    {cfg.label}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-stone-900 mb-2 font-serif leading-tight">{GRADE_DESCRIPTIONS[result.grade]}</h2>
                  <p className="text-stone-600 leading-relaxed text-sm">{result.verdict}</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-black text-stone-400 mb-4">Evaluation Breakdown</p>
                {result.dimensions.map((dim, i) => (
                  <DimensionRow key={i} dim={dim} index={i} />
                ))}
              </div>
            </div>

            <div className="flex items-start gap-4 px-7 py-5 bg-white border-2 border-stone-200 rounded-[2rem] shadow-sm">
              <ShieldCheck size={20} className="text-rose-800 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-black text-stone-400 mb-1">Dunong Recommendation</p>
                <p className="text-base font-bold text-stone-800">{result.recommendation}</p>
              </div>
            </div>

            {mode !== 'library' && (
              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => setShowFolderPicker(true)} 
                  disabled={addedToLibrary} 
                  className={`w-full max-w-sm py-3.5 text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2 shadow-sm ${addedToLibrary ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-200" : "bg-amber-100 text-amber-900 border-2 border-amber-200 hover:bg-amber-200"}`}
                >
                  {addedToLibrary ? <><CheckCircle2 size={16} /> Added to Library</> : <><Library size={16} /> Add to Library</>}
                </button>
              </div>
            )}
            
            <p className="text-xs text-stone-400 text-center pt-4 italic">
              AI analysis is based on verifiable metadata. Always verify with official databases.
            </p>
          </div>
        )}

        {showFolderPicker && result && (
          <FolderPickerPopup
            articleTitle={result.metadata?.title || "Untitled Article"}
            savedFolderIds={[]}
            onPick={handleConfirmSave}
            onClose={() => setShowFolderPicker(false)}
          />
        )}
        </div>
      </motion.div>
    </motion.main>
  );
}