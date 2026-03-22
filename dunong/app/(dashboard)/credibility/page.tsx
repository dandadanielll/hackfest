"use client";

import {
  ShieldCheck, Search, Upload, X, FileText,
  CheckCircle2, XCircle, HelpCircle, AlertTriangle,
  ChevronDown, ChevronUp, Loader2, Library,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useLibrary } from "@/lib/libraryContext";
import { SavedArticle } from "@/lib/libraryStore";
import FolderPickerPopup from "@/components/FolderPickerPopup";

// ─── Types ─────────────────────────────────────────────────────────────────

type Grade = "A" | "B" | "C" | "D" | "F";

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

function parseAuthors(authorString: string | null): { firstName: string, lastName: string }[] {
  if (!authorString) return [];
  return authorString.split(/[,;]+/).map(a => {
    const parts = a.trim().split(/\s+/);
    if (parts.length === 0) return { firstName: "", lastName: "Unknown" };
    if (parts.length === 1) return { firstName: "", lastName: parts[0] };
    const lastName = parts.pop() || "";
    const firstName = parts.join(" ");
    return { firstName, lastName };
  }).filter(a => a.lastName);
}

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

function LibrarySelector({
  onSelect,
  onClose,
}: {
  onSelect: (article: SavedArticle) => void;
  onClose: () => void;
}) {
  const { folders } = useLibrary();
  const allArticles = folders.flatMap((f) => f.articles);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border border-stone-200 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <Library size={20} className="text-rose-800" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Select from Library</h3>
              <p className="text-xs text-stone-400">Choose an article to analyze</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl transition-colors">
            <X size={20} className="text-stone-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {allArticles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-400 text-sm">Your library is empty.</p>
            </div>
          ) : (
            allArticles.map((article) => (
              <button
                key={article.id}
                onClick={() => onSelect(article)}
                className="w-full text-left p-4 rounded-2xl border border-stone-100 hover:border-rose-200 hover:bg-rose-50/30 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-stone-800 group-hover:text-rose-900 transition-colors truncate">
                      {article.title}
                    </h4>
                    <p className="text-xs text-stone-500 mt-1 truncate">
                      {Array.isArray(article.authors) ? article.authors.map(a => `${a.firstName} ${a.lastName}`).join(", ") : (article.authors as any)} {article.year ? `(${article.year})` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-[10px] font-black uppercase tracking-widest text-stone-400 bg-stone-100 px-2 py-1 rounded">
                    {article.journal || "Article"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

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
  const { folders, activeFolderId, saveArticle, addFolder } = useLibrary();
  const [urlOrDoi, setUrlOrDoi] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<CredibilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [addedToLibrary, setAddedToLibrary] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const performAnalysis = async (payload: { text?: string; url?: string; doi?: string }) => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setAddedToLibrary(false);

    try {
      const res = await fetch("/api/credibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed. Please try again.");
      }

      setResult(data as CredibilityResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = useCallback(async (f: File) => {
    if (!f.name.match(/\.(pdf|docx)$/i)) {
      setError("Only PDF or DOCX files are supported.");
      return;
    }
    setFile(f);
    setUrlOrDoi(""); // One source at a time
    setError(null);
    
    let text = "";
    if (f.name.toLowerCase().endsWith(".docx")) {
      text = await extractDocxText(f);
    } else if (f.name.toLowerCase().endsWith(".pdf") || f.type === "application/pdf") {
      text = await extractPdfText(f);
      if (!text || text.length < 50) {
        text = `[PDF Extraction Failed: ${f.name} — please evaluate based on filename]`;
      }
    } else {
      text = (await f.text().catch(() => "")).slice(0, 5000);
    }
    setFileText(text);
    
    // Analyze immediately
    performAnalysis({ text });
  }, []);

  const handleAnalyze = async () => {
    const hasUrl = urlOrDoi.trim().length > 0;
    const hasFile = file !== null;
    if (!hasUrl && !hasFile) {
      setError("Please enter a URL, DOI, or upload a document.");
      return;
    }

    const payload: { text?: string; url?: string; doi?: string } = {};

    if (hasFile) {
      payload.text = fileText;
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

  const handleAddToLibrary = () => {
    if (!result) return;
    setShowFolderPicker(true);
  };

  const handleConfirmSave = (folderId: string) => {
    if (!result) return;

    const meta = result.metadata;
    const credibilityScore = result.grade === 'A' ? 95 : result.grade === 'B' ? 80 : result.grade === 'C' ? 60 : result.grade === 'D' ? 40 : 20;

    // Helper function to parse authors from various formats
    const parseAuthors = (authorsData: any): { firstName: string; lastName: string; }[] => {
      if (!authorsData) return [];
      if (Array.isArray(authorsData)) {
        return authorsData.map(a => ({ firstName: a.firstName || '', lastName: a.lastName || '' }));
      }
      if (typeof authorsData === 'string' && authorsData.trim() !== '') {
        // Simple parsing for string, e.g., "John Doe, Jane Smith"
        return authorsData.split(',').map(name => {
          const parts = name.trim().split(' ');
          const lastName = parts.pop() || '';
          const firstName = parts.join(' ');
          return { firstName, lastName };
        });
      }
      return [];
    };

    const article = {
      id: crypto.randomUUID(),
      title: meta?.title || "Untitled Article",
      authors: parseAuthors(meta?.authors),
      year: meta?.year || new Date().getFullYear().toString(),
      journal: meta?.journal || meta?.publisher || "Unknown Source",
      credibility: credibilityScore,
      abstract: result.verdict,
      keywords: [],
      localSource: file !== null,
      url: meta?.doi ? `https://doi.org/${meta.doi}` : urlOrDoi,
    };

    saveArticle(folderId, article);
    setAddedToLibrary(true);
    setShowFolderPicker(false);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setUrlOrDoi("");
    setFile(null);
    setFileText("");
    setAddedToLibrary(false);
  };

  const cfg = result ? GRADE_CONFIG[result.grade] : null;

  return (
    <main className="max-w-3xl w-full mx-auto px-6 md:px-8 pt-16 pb-24 animate-in fade-in slide-in-from-bottom-4">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="text-center mb-14">
        <div className="inline-flex h-20 w-20 bg-amber-100/50 border border-amber-200/50 text-rose-800 rounded-3xl items-center justify-center mb-8 shadow-sm">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-5xl font-black text-stone-900 tracking-tight mb-4 font-serif">
          Article Credibility Checker
        </h1>
        <p className="text-stone-500 text-xl font-medium">
          Cross-referencing against CHED, PHILJOL, and Scopus databases.
        </p>
      </div>

      {/* ── Input Area ─────────────────────────────────────────────────────── */}
      {!result && (
        <div className="space-y-4">
          {/* URL / DOI */}
          <div className="relative">
            <input
              className="w-full p-6 pl-8 pr-40 bg-white/80 backdrop-blur-md border-2 border-stone-200 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(123,24,24,0.08)] outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-400 text-lg transition-all font-serif placeholder:font-sans placeholder:text-stone-400"
              placeholder="Paste article URL or DOI..."
              value={urlOrDoi}
              onChange={(e) => {
                setUrlOrDoi(e.target.value);
                if (e.target.value.trim()) setFile(null); // One source at a time
              }}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-rose-900 text-amber-50 px-7 py-3.5 rounded-full font-bold hover:bg-rose-800 transition flex items-center gap-2 disabled:opacity-50 shadow-lg text-sm"
            >
              {analyzing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
              {analyzing ? "Analyzing..." : "Analyze"}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-stone-200" />
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
              or select resource
            </span>
            <div className="flex-1 h-px bg-stone-200" />
          </div>

          {/* Source Selection Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* File drop zone */}
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 py-10 rounded-[2.5rem] border-2 border-dashed cursor-pointer transition-all ${
                  dragOver
                    ? "border-rose-400 bg-rose-50/60"
                    : "border-stone-200 hover:border-stone-300 bg-white/60"
                }`}
              >
                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
                  <Upload size={22} className="text-stone-400" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm font-semibold text-stone-600">
                    Upload Document
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1">
                    AI evaluates credibility from PDF/DOCX
                  </p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-[2.5rem] border-2 border-rose-200 bg-rose-50/30">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center shrink-0">
                  <FileText size={22} className="text-rose-800" />
                </div>
                <div className="text-center px-4 overflow-hidden w-full">
                  <p className="text-sm font-bold text-stone-800 truncate">{file.name}</p>
                  <button
                    onClick={() => { setFile(null); setFileText(""); }}
                    className="text-xs text-rose-600 font-bold hover:underline mt-1"
                  >
                    Remove File
                  </button>
                </div>
              </div>
            )}

            {/* Library button */}
            <div
              onClick={() => setShowLibrary(true)}
              className="flex flex-col items-center justify-center gap-3 py-10 rounded-[2.5rem] border-2 border-stone-200 hover:border-amber-400 hover:bg-amber-50/30 cursor-pointer transition-all bg-white/60"
            >
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                <Library size={22} className="text-amber-800" />
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-semibold text-stone-600">
                  Select from Library
                </p>
                <p className="text-[10px] text-stone-400 mt-1">
                  Choose from your saved articles
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 px-5 py-4 bg-red-50 border border-red-200 rounded-2xl">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Library Modal ─────────────────────────────────────────────────── */}
      {showLibrary && (
        <LibrarySelector
          onClose={() => setShowLibrary(false)}
          onSelect={(article) => {
            const val = article.url || article.id;
            setUrlOrDoi(val);
            setFile(null); // One source at a time
            setShowLibrary(false);

            const isDoi = val.startsWith("10.") || val.includes("doi.org");
            performAnalysis(isDoi ? { doi: val } : { url: val });
          }}
        />
      )}

      {showFolderPicker && result && (
        <FolderPickerPopup
          articleTitle={result.metadata?.title || "Untitled Article"}
          savedFolderIds={folders
            .filter((f) => f.articles.some((a) => a.id === (result.metadata?.doi || result.metadata?.title || "")))
            .map((f) => f.id)}
          onPick={handleConfirmSave}
          onClose={() => setShowFolderPicker(false)}
        />
      )}
      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {analyzing && (
        <div className="mt-12 text-center">
          <div className="inline-flex flex-col items-center gap-4">
            <div className="relative w-14 h-14">
              <div className="w-full h-full rounded-full border-2 border-stone-200" />
              <div className="absolute inset-0 rounded-full border-2 border-rose-800 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-base font-bold text-stone-700 font-serif">Evaluating credibility…</p>
              <p className="text-sm text-stone-400 mt-1">Cross-referencing CHED, PHILJOL, and Scopus</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {result && cfg && (
        <div className="animate-in fade-in zoom-in-95 duration-500 space-y-5">

          {/* Grade hero */}
          <div className={`rounded-[2.5rem] border-2 ${cfg.border} ${cfg.bg} p-8 md:p-10`}>
            <div className="flex flex-col md:flex-row gap-8 items-center mb-8 pb-8 border-b border-black/5">
              {/* Arc gauge */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#e7e5e4" strokeWidth="8" fill="none" />
                  <circle
                    cx="50" cy="50" r="40"
                    stroke={GRADE_STROKE[result.grade]}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="251"
                    strokeDashoffset={cfg.arc}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-stone-900 font-serif leading-none">
                    {result.grade}
                  </span>
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">
                    Grade
                  </span>
                </div>
              </div>

              {/* Verdict */}
              <div className="text-center md:text-left">
                <div className={`inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${cfg.badgeBg} ${cfg.badgeText}`}>
                  {cfg.label}
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-stone-900 mb-2 font-serif leading-tight">
                  {GRADE_DESCRIPTIONS[result.grade]}
                </h2>
                <p className="text-stone-600 leading-relaxed">{result.verdict}</p>
              </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest font-black text-stone-400 mb-4">
                Evaluation Breakdown
              </p>
              {result.dimensions.map((dim, i) => (
                <DimensionRow key={i} dim={dim} index={i} />
              ))}
            </div>
          </div>

          {/* Recommendation banner */}
          <div className="flex items-start gap-4 px-7 py-5 bg-white border-2 border-stone-200 rounded-[2rem]">
            <ShieldCheck size={20} className="text-rose-800 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] uppercase tracking-widest font-black text-stone-400 mb-1">
                Dunong Recommendation
              </p>
              <p className="text-base font-bold text-stone-800">{result.recommendation}</p>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-xs text-stone-400 text-center px-4">
            Results are based on AI analysis of verifiable metadata. Always cross-check with official CHED, PHILJOL, and Scopus sources.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              onClick={handleReset}
              className="flex-1 py-3.5 text-sm font-bold text-stone-600 bg-white border-2 border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
            >
              Check Another Article
            </button>
            <button
              onClick={handleAddToLibrary}
              disabled={addedToLibrary}
              className={`flex-1 py-3.5 text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2 ${
                addedToLibrary 
                ? "bg-emerald-50 text-emerald-700 border-2 border-emerald-200" 
                : "bg-amber-100 text-amber-900 border-2 border-amber-200 hover:bg-amber-200"
              }`}
            >
              {addedToLibrary ? (
                <>
                  <CheckCircle2 size={16} />
                  Added to Library
                </>
              ) : (
                <>
                  <Library size={16} />
                  Add to Library
                </>
              )}
            </button>
            <button
              onClick={() => {
                const text = `Grade: ${result.grade} — ${cfg.label}\n${result.verdict}\n\nRecommendation: ${result.recommendation}`;
                navigator.clipboard?.writeText(text);
              }}
              className="px-8 py-3.5 text-sm font-bold text-amber-50 bg-rose-900 hover:bg-rose-800 rounded-full transition-colors"
            >
              Copy Result
            </button>
          </div>
        </div>
      )}
    </main>
  );
}