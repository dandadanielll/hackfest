"use client";

import {
  FileText, Link as LinkIcon, Copy, Check, Upload,
  BookOpen, AlertCircle, X, Loader2, FolderOpen,
  ChevronDown, ChevronUp, Search, Library
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibrary } from '@/lib/libraryContext';
import { useDevMode } from '@/lib/devModeContext';
import type { SavedArticle } from '@/lib/libraryStore';
import { TfiQuoteLeft } from 'react-icons/tfi';

type InputMode = 'link' | 'file' | 'library';

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

export default function CitationPage() {
  const { folders } = useLibrary();
  const { addLog, startLogGroup, streamAITrace } = useDevMode();
  const [mode, setMode] = useState<InputMode>('link');
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<SavedArticle | null>(null);
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citation, setCitation] = useState<{ apa?: string; mla?: string; chicago?: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);

  const [isAnimating, setIsAnimating] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);



  const toggleFolder = (id: string) =>
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleGenerate = async () => {
    if (mode === 'link' && !input.trim()) {
      setError("Please enter a URL or DOI.");
      return;
    }
    if (mode === 'file' && !selectedFile) {
      setError("Please upload a file.");
      return;
    }
    if (mode === 'library' && !selectedArticle) {
      setError("Please select an article from your library.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCitation(null);

    const sourceName = "Citation Evaluator";
    const runTitle = mode === 'library' && selectedArticle ? `Citing: ${selectedArticle.title}` : mode === 'file' && selectedFile ? `Citing: ${selectedFile.name}` : `Citing Source`;
    const groupId = startLogGroup("/citation", runTitle, sourceName);


    try {
      let payload: {
        text?: string;
        url?: string;
        doi?: string;
        fileBase64?: string;
        fileName?: string;
      } = {};

      if (mode === 'library' && selectedArticle) {
        setStatusMsg('Building citation from library metadata…');
        payload.text = [
          `Title: ${selectedArticle.title}`,
          `Authors: ${Array.isArray(selectedArticle.authors) ? selectedArticle.authors.map(a => `${a.firstName ? `${a.firstName.charAt(0)}. ` : ""}${a.lastName}`).join(", ") : (selectedArticle.authors || "Unknown")}`,
          `Year: ${selectedArticle.year}`,
          `Journal: ${selectedArticle.journal}`,
          selectedArticle.url ? `URL: ${selectedArticle.url}` : '',
        ].filter(Boolean).join('\n');
      } else if (mode === 'file' && selectedFile) {
        setStatusMsg('Reading and extracting file text…');
        const isPDF = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");

        let extracted = "";
        if (isPDF) {
          extracted = await extractPdfText(selectedFile);
        } else {
          extracted = (await selectedFile.text().catch(() => "")).slice(0, 5000);
        }

        if (extracted.trim().length > 30) {
          payload.text = `FILE: ${selectedFile.name}\nEXTRACTED TEXT:\n${extracted}`;
        } else {
          payload.text = `FILE: ${selectedFile.name}\n(Could not read text accurately from this file. Infer as much as possible from the filename.)`;
        }
        setStatusMsg('Generating citation from text…');
      } else {
        const clean = input.trim();
        const doiMatch = clean.match(/10\.\d{4,}\/\S+/);
        if (doiMatch) {
          setStatusMsg('Fetching metadata from CrossRef…');
          payload.doi = doiMatch[0].replace(/[.,;)]+$/, '');
        } else if (clean.startsWith('http')) {
          setStatusMsg('Fetching page metadata…');
          payload.url = clean;
        } else {
          payload.text = clean;
          setStatusMsg('Generating citation from text…');
        }
      }

      setStatusMsg('Generating citations with Groq…');

      // Stream real AI reasoning into dev panel
      const inputDesc = payload.doi ? `DOI: ${payload.doi}` : payload.url ? `URL: ${payload.url}` : `Text (${(payload.text || '').length} chars)`;
      streamAITrace(
        groupId,
        "Generate APA, MLA, and Chicago citations",
        `The system resolves source metadata using CrossRef (DOI lookup), Semantic Scholar (paper search), and HTML meta-tag scraping (for URLs). Input: ${inputDesc}. Once metadata is gathered (title, authors, year, journal, DOI), it sends a structured prompt to Groq LLM asking for APA 7th, MLA 9th, and Chicago 17th citations. Response format: strict JSON {apa, mla, chicago}. Temperature 0.1, max 4000 tokens.`
      );

      const res = await fetch('/api/citation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Server error occurred.');


      setCitation(data);
      setInput('');
      setSelectedFile(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to generate citation.';
      addLog(`⟩ Citation generation failed: ${errMsg}`, groupId);
      setError(errMsg);
    } finally {
      setIsGenerating(false);
      setStatusMsg('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setCitation(null);
      // Trigger generation immediately
      handleGenerate();
    }
  };

  const handleSelectArticle = (article: SavedArticle, folderName: string) => {
    setSelectedArticle(article);
    setSelectedFolderName(folderName);
    setShowLibraryPicker(false);
    setError(null);
    setCitation(null);
  };

  const totalArticles = folders.reduce((a, f) => a + f.articles.length, 0);

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

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-12">
            <div className="bg-[#521118]/10 text-[#521118] border border-[#521118]/10 p-4 rounded-3xl shadow-sm mb-6">
              <TfiQuoteLeft size={32} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-[#2b090d] tracking-tight font-serif">
                Citation Generator
              </h1>
              <p className="text-[#521118]/60 text-lg mt-2 font-medium max-w-2xl">
                Generate APA, MLA, and Chicago citations from links, DOIs, files, or your library.
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
                  setCitation(null);
                  setSelectedArticle(null);
                  setSelectedFile(null);
                  setInput('');
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
                  {/* Main Input/Zone Container */}
                  <div className="relative flex-1 w-full flex items-center bg-[#F9FBFD]/50 border-2 border-[#2b090d]/10 rounded-2xl focus-within:border-[#521118] focus-within:ring-4 focus-within:ring-[#521118]/5 transition-all overflow-hidden shadow-inner h-16">
                    {/* Link / DOI mode */}
                    {mode === 'link' && (
                      <div className="flex-1 flex items-center px-4 h-full">
                        <LinkIcon className="text-[#521118]/40 shrink-0 mr-3" size={20} />
                        <input
                          className="w-full bg-transparent py-4 outline-none text-[#2b090d] font-serif placeholder:font-sans placeholder:text-stone-400 text-base h-full"
                          placeholder="https://doi.org/10.xxxx/... or any link"
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        />
                      </div>
                    )}

                    {/* File upload mode */}
                    {mode === 'file' && (
                      <div className="flex-1 h-full">
                        {selectedFile ? (
                          <div className="flex items-center justify-between px-5 h-full bg-[#521118]/5">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <FileText className="text-[#521118]" size={20} />
                              <span className="font-bold text-[#521118] truncate text-sm">{selectedFile.name}</span>
                            </div>
                            <button
                              onClick={() => setSelectedFile(null)}
                              className="p-1 hover:bg-[#521118]/10 rounded-full text-stone-500 transition-colors"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-full flex items-center justify-center gap-3 hover:bg-[#521118]/5 transition-colors duration-300 px-6"
                          >
                            <Upload size={18} className="text-[#521118]/30" />
                            <span className="text-[11px] font-black text-[#521118]/60 uppercase tracking-[0.15em]">Upload Research File</span>
                          </button>
                        )}
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className="hidden"
                          accept=".txt,.doc,.docx,.pdf"
                        />
                      </div>
                    )}

                    {/* Library mode */}
                    {mode === 'library' && (
                      <div className="flex-1 h-full">
                        {selectedArticle ? (
                          <div className="flex items-center justify-between gap-4 bg-[#521118]/5 px-6 h-full shadow-inner">
                            <div className="min-w-0">
                              <p className="font-bold text-[#2b090d] text-sm leading-snug font-serif line-clamp-1">{selectedArticle.title}</p>
                              <p className="text-[10px] text-[#521118]/60 mt-0.5 font-black uppercase tracking-widest">
                                {selectedFolderName} · {selectedArticle.year}
                              </p>
                            </div>
                            <button
                              onClick={() => { setSelectedArticle(null); setShowLibraryPicker(true); }}
                              className="p-1 hover:bg-[#521118]/10 rounded-full text-stone-400 hover:text-[#521118] transition-all shrink-0"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowLibraryPicker(!showLibraryPicker)}
                            className="w-full h-full flex items-center justify-between px-6 hover:bg-[#521118]/5 transition-all duration-300 text-left group shadow-inner"
                          >
                            <div className="flex items-center gap-3">
                              <FolderOpen size={18} className="text-[#521118]/40 group-hover:text-[#521118] shrink-0 transition-colors" />
                              <span className="text-[#521118]/60 font-bold uppercase tracking-wide text-xs group-hover:text-[#521118] transition-colors">
                                {totalArticles === 0 ? 'No articles yet' : 'Select From Library'}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-[#521118]/30 bg-[#521118]/5 px-2 py-1 rounded-md">{totalArticles}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Universal Action Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || (mode === 'link' && !input.trim()) || (mode === 'file' && !selectedFile) || (mode === 'library' && !selectedArticle)}
                    className="group relative bg-[#521118] text-[#e8e4df] px-8 rounded-2xl font-bold hover:bg-[#2b090d] transition-all duration-300 disabled:opacity-40 whitespace-nowrap shadow-xl shadow-[#521118]/20 flex items-center justify-center gap-3 h-16 min-w-[180px] overflow-hidden active:scale-95"
                  >
                    <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                    {isGenerating ? <Loader2 size={20} className="animate-spin" /> : null}
                    <span className="uppercase tracking-widest text-xs font-black">{isGenerating ? 'Generating...' : 'Cite Source'}</span>
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
                          <TfiQuoteLeft size={32} className="mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-medium italic">No articles saved yet. Save articles to your Library first.</p>
                        </div>
                      ) : (
                        folders.map((folder) => (
                          <div key={folder.id} className="border-b last:border-0 border-[#2b090d]/5">
                            <button
                              onClick={() => toggleFolder(folder.id)}
                              className="w-full flex items-center gap-3 px-6 py-4 bg-[#521118]/5 hover:bg-[#521118]/10 transition-colors text-left"
                            >
                              <span className="text-[#521118]/40">
                                {expandedFolders.has(folder.id) ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                              </span>
                              <span className="text-sm font-black uppercase tracking-widest text-[#521118]/70">{folder.name}</span>
                              <span className="text-[10px] font-black text-[#521118]/30 ml-auto">{folder.articles.length}</span>
                            </button>

                            {expandedFolders.has(folder.id) && (
                              <div className="divide-y divide-[#2b090d]/5">
                                {folder.articles.length === 0 ? (
                                  <p className="px-10 py-4 text-xs text-[#521118]/40 italic">No articles in this folder.</p>
                                ) : (
                                  folder.articles.map((article) => (
                                    <button
                                      key={article.id}
                                      onClick={() => handleSelectArticle(article, folder.name)}
                                      className="w-full flex items-start gap-4 px-10 py-4 hover:bg-[#521118]/5 transition-all text-left group"
                                    >
                                      <FileText size={16} className="text-[#521118]/20 group-hover:text-[#521118] mt-0.5 shrink-0 transition-colors" />
                                      <div className="min-w-0">
                                        <p className="text-sm font-bold text-[#2b090d] leading-snug group-hover:text-[#521118] transition-colors font-serif">{article.title}</p>
                                        <p className="text-[11px] text-[#521118]/50 mt-1 font-medium italic">
                                          {Array.isArray(article.authors) ? article.authors.map(a => `${a.firstName ? `${a.firstName.charAt(0)}. ` : ""}${a.lastName}`).join(", ") : (article.authors || "Unknown")} · {article.year}
                                        </p>
                                      </div>
                                    </button>
                                  ))
                                )}
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

          {/* Status message */}
          {isGenerating && statusMsg && (
            <p className="mt-4 text-sm text-[#521118]/60 font-medium italic animate-pulse">{statusMsg}</p>
          )}

          {/* Error */}
          {error && (
            <div className="mt-6 flex items-center gap-3 text-red-700 bg-red-50 px-5 py-4 rounded-2xl text-sm font-bold border border-red-100 shadow-sm animate-in shake-1">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {/* Example hints — only for link mode */}
          {mode === 'link' && !citation && !isGenerating && (
            <div className="mb-12 flex flex-wrap justify-center gap-2 max-w-2xl">
              {[
                "https://doi.org/10.1016/j.ibmb.2013.01.009",
                "https://journals.openedition.org/asiateque/1234",
                "10.1126/science.1230444",
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white/60 text-[#521118]/60 rounded-xl hover:bg-[#521118] hover:text-[#e8e4df] transition-all duration-300 border border-[#521118]/10"
                >
                  {example.length > 45 ? example.slice(0, 45) + '…' : example}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {citation && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                className="space-y-6 w-full max-w-3xl"
              >
                {selectedArticle && (
                  <div className="text-xs text-[#521118]/40 font-black uppercase tracking-widest mb-4 text-center">
                    Citations for: <span className="text-[#521118]">{selectedArticle.title}</span>
                  </div>
                )}
                <CitationBox format="APA 7th Edition" content={citation.apa || ''} />
                <CitationBox format="MLA 9th Edition" content={citation.mla || ''} />
                <CitationBox format="Chicago 17th Edition" content={citation.chicago || ''} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.main>
  );
}

function CitationBox({ format, content }: { format: string; content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content || content === 'Citation unavailable.') return null;

  return (
    <div className="bg-white/80 backdrop-blur-md border border-[#2b090d]/10 rounded-3xl group transition-all duration-300 hover:border-[#521118]/30 p-6 shadow-sm hover:shadow-md">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-[#2b090d]/5">
        <h3 className="font-black text-[10px] text-[#521118]/70 uppercase tracking-[0.2em]">{format}</h3>
        <button
          onClick={handleCopy}
          className="text-[#521118]/60 hover:text-[#521118] transition-all flex items-center gap-2 text-xs font-bold bg-[#521118]/5 border border-transparent group-hover:border-[#521118]/10 hover:bg-[#521118]/10 px-4 py-2 rounded-xl"
        >
          {copied ? <Check size={16} className="text-[#521118]" /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-[#2b090d] leading-relaxed font-serif text-lg selection:bg-[#521118]/10">{content}</p>
    </div>
  );
}