"use client";

import {
  FileText, Link as LinkIcon, Copy, Check, Upload,
  BookOpen, AlertCircle, X, Loader2, FolderOpen,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibrary } from '@/lib/libraryContext';
import type { SavedArticle } from '@/lib/libraryStore';

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-expand all folders when picker opens
  useEffect(() => {
    if (showLibraryPicker) {
      setExpandedFolders(new Set(folders.map((f) => f.id)));
    }
  }, [showLibraryPicker, folders]);

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
        // Build a rich text string from the article metadata
        payload.text = [
          `Title: ${selectedArticle.title}`,
          `Authors: ${selectedArticle.authors}`,
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
          // Fallback for .txt or other readable
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
      setError(err instanceof Error ? err.message : 'Failed to generate citation.');
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
      handleGenerate(file);
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
    <main className="max-w-4xl w-full mx-auto px-8 pt-16 pb-24">

      {/* Header */}
      <div className="flex items-center gap-5 mb-12">
        <div className="bg-[#FFF0F0] text-[#8B1A1A] border border-[#F0EBE3] p-4 rounded-3xl shadow-sm shrink-0">
          <BookOpen size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-[#1A0A00] tracking-tight font-serif">
            Citation Generator
          </h1>
          <p className="text-stone-500 text-lg mt-1">
            Generate APA, MLA, and Chicago citations from links, DOIs, files, or your library.
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { id: 'link', label: 'URL or DOI', icon: <LinkIcon size={14} /> },
          { id: 'file', label: 'Upload File', icon: <Upload size={14} /> },
          { id: 'library', label: 'From Library', icon: <FolderOpen size={14} /> },
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
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition ${mode === tab.id
              ? 'bg-[#1A0A00] text-white border-[#1A0A00]'
              : 'bg-white text-stone-500 border-stone-200 hover:border-[#8B1A1A] hover:text-[#8B1A1A]'
              }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Generator Box */}
      <div className="bg-white border border-[#E8DFD0] rounded-[2rem] p-8 shadow-md mb-10">

        {/* Link / DOI mode */}
        {mode === 'link' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 flex items-center bg-[#F9FBFD] border-2 border-[#E8DFD0] rounded-2xl focus-within:border-[#8B1A1A] focus-within:ring-4 focus-within:ring-[#8B1A1A]/10 transition-all overflow-hidden">
              <LinkIcon className="absolute left-4 text-stone-400 shrink-0" size={20} />
              <input
                className="w-full bg-transparent pl-12 pr-4 py-4 outline-none text-[#1A0A00] font-serif placeholder:font-sans placeholder:text-stone-400 text-lg"
                placeholder="https://doi.org/10.xxxx/... or any link"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !input.trim()}
              className="bg-[#1A0A00] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#8B1A1A] transition disabled:opacity-40 whitespace-nowrap shadow-md flex items-center gap-2"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : null}
              {isGenerating ? 'Generating...' : 'Cite Source'}
            </button>
          </div>
        )}

        {/* File upload mode */}
        {mode === 'file' && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-[#F9FBFD] border-2 border-[#E8DFD0] rounded-2xl overflow-hidden">
              {selectedFile ? (
                <div className="flex items-center justify-between px-5 py-4 bg-[#FFF0F0]/50">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileText className="text-[#8B1A1A] shrink-0" size={20} />
                    <span className="font-medium text-[#8B1A1A] truncate">{selectedFile.name}</span>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1 hover:bg-[#F0EBE3] rounded-full text-stone-500 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex flex-col items-center gap-2 py-8 hover:bg-rose-50/30 transition"
                >
                  <Upload size={22} className="text-stone-300" />
                  <span className="text-sm font-semibold text-stone-400">Click to upload PDF, DOC, or TXT</span>
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
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedFile}
              className="bg-[#1A0A00] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#8B1A1A] transition disabled:opacity-40 whitespace-nowrap shadow-md flex items-center gap-2"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : null}
              {isGenerating ? 'Generating...' : 'Cite Source'}
            </button>
          </div>
        )}

        {/* Library mode */}
        {mode === 'library' && (
          <div className="space-y-4">
            {/* Selected article display */}
            {selectedArticle ? (
              <div className="flex items-start justify-between gap-4 bg-[#FFF0F0]/50 border border-[#F0EBE3] rounded-2xl px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-1">{selectedFolderName}</p>
                  <p className="font-bold text-[#1A0A00] text-sm leading-snug">{selectedArticle.title}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{selectedArticle.authors} · {selectedArticle.year} · {selectedArticle.journal}</p>
                </div>
                <button
                  onClick={() => { setSelectedArticle(null); setShowLibraryPicker(true); }}
                  className="p-1.5 hover:bg-[#F0EBE3] rounded-full text-stone-400 transition shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLibraryPicker(!showLibraryPicker)}
                className="w-full flex items-center gap-3 px-5 py-4 bg-[#F9FBFD] border-2 border-[#E8DFD0] rounded-2xl hover:border-[#8B1A1A] hover:bg-rose-50/20 transition text-left"
              >
                <FolderOpen size={18} className="text-[#8B1A1A] shrink-0" />
                <span className="text-stone-500 font-medium">
                  {totalArticles === 0 ? 'No articles in library yet' : 'Select an article from your library…'}
                </span>
                <span className="ml-auto text-xs text-stone-400">{totalArticles} articles</span>
              </button>
            )}

            {/* Library picker */}
            <AnimatePresence>
              {showLibraryPicker && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="border border-stone-200 rounded-2xl overflow-hidden">
                    {folders.length === 0 ? (
                      <div className="px-5 py-8 text-center text-stone-400">
                        <BookOpen size={28} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No articles saved yet. Search and save articles to your Library first.</p>
                      </div>
                    ) : (
                      folders.map((folder) => (
                        <div key={folder.id}>
                          <button
                            onClick={() => toggleFolder(folder.id)}
                            className="w-full flex items-center gap-3 px-5 py-3 bg-stone-50 hover:bg-stone-100 transition border-b border-stone-200 text-left"
                          >
                            <span className="text-stone-400">
                              {expandedFolders.has(folder.id) ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                            </span>
                            <span className="text-sm font-semibold text-stone-700">{folder.name}</span>
                            <span className="text-xs text-stone-400 ml-auto">{folder.articles.length} articles</span>
                          </button>

                          {expandedFolders.has(folder.id) && (
                            <div className="divide-y divide-stone-50">
                              {folder.articles.length === 0 ? (
                                <p className="px-8 py-3 text-xs text-stone-400 italic">No articles in this folder.</p>
                              ) : (
                                folder.articles.map((article) => (
                                  <button
                                    key={article.id}
                                    onClick={() => handleSelectArticle(article, folder.name)}
                                    className="w-full flex items-start gap-3 px-8 py-3 hover:bg-rose-50 transition text-left group"
                                  >
                                    <FileText size={14} className="text-stone-300 group-hover:text-[#8B1A1A] mt-0.5 shrink-0 transition" />
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-stone-800 leading-snug group-hover:text-[#8B1A1A] transition">{article.title}</p>
                                      <p className="text-xs text-stone-400 mt-0.5">{article.authors} · {article.year} · {article.journal}</p>
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

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedArticle}
              className="w-full bg-[#1A0A00] text-white py-4 rounded-2xl font-bold hover:bg-[#8B1A1A] transition disabled:opacity-40 shadow-md flex items-center justify-center gap-2"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : null}
              {isGenerating ? 'Generating...' : 'Generate Citations'}
            </button>
          </div>
        )}

        {/* Status message */}
        {isGenerating && statusMsg && (
          <p className="mt-3 text-sm text-stone-400 font-medium italic animate-pulse">{statusMsg}</p>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-xl text-sm font-medium border border-rose-100">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      {/* Example hints — only for link mode */}
      {mode === 'link' && !citation && !isGenerating && (
        <div className="mb-10 flex flex-wrap gap-2">
          {[
            "https://doi.org/10.1016/j.ibmb.2013.01.009",
            "https://journals.openedition.org/asiateque/1234",
            "10.1126/science.1230444",
          ].map((example) => (
            <button
              key={example}
              onClick={() => setInput(example)}
              className="text-xs px-3 py-1.5 bg-stone-100 text-stone-500 rounded-xl hover:bg-rose-50 hover:text-[#8B1A1A] transition font-mono"
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {selectedArticle && (
              <div className="text-xs text-stone-400 font-medium mb-2">
                Citations for: <span className="font-bold text-stone-600">{selectedArticle.title}</span>
              </div>
            )}
            <CitationBox format="APA 7th Edition" content={citation.apa || ''} />
            <CitationBox format="MLA 9th Edition" content={citation.mla || ''} />
            <CitationBox format="Chicago 17th Edition" content={citation.chicago || ''} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
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
    <div className="bg-white border border-[#E8DFD0] rounded-2xl group transition-all hover:border-[#D0C4B8] p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#F0EBE3]">
        <h3 className="font-bold text-xs text-stone-500 uppercase tracking-widest">{format}</h3>
        <button
          onClick={handleCopy}
          className="text-stone-600 hover:text-[#8B1A1A] transition flex items-center gap-2 text-sm font-bold bg-[#F9FBFD] border border-transparent group-hover:border-[#E8DFD0] hover:bg-[#FFF0F0] px-3 py-1.5 rounded-lg"
        >
          {copied ? <Check size={16} className="text-[#8B1A1A]" /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="text-[#1A0A00] leading-relaxed font-serif text-[16px] selection:bg-rose-100">{content}</p>
    </div>
  );
}