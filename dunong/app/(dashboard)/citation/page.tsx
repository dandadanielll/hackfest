"use client";

import { FileText, Link as LinkIcon, Copy, Check, Upload, BookOpen, AlertCircle, X, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CitationPage() {
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [citation, setCitation] = useState<{ apa?: string, mla?: string, chicago?: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reads any file (including PDFs) as base64 — the server does the text extraction
  const getFileBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Strip the data:...;base64, prefix that readAsDataURL adds
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  };

  const handleGenerate = async () => {
    if (!input.trim() && !selectedFile) {
      setError("Please enter a URL, DOI, or upload a file.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCitation(null);

    try {
      let payload: { text?: string; url?: string; doi?: string; fileBase64?: string; fileName?: string } = {};

      if (selectedFile) {
        setStatusMsg('Reading and encoding file…');
        const base64 = await getFileBase64(selectedFile);
        payload.fileBase64 = base64;
        payload.fileName = selectedFile.name;
        setStatusMsg('Extracting text and generating citation…');
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

      setStatusMsg("Generating citations with Groq…");
      const res = await fetch('/api/citation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Server error occurred.");
      }

      setCitation(data);
      setInput('');
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setStatusMsg('');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setInput('');
      setError(null);
      setCitation(null);
    }
  };

  const isPdf = selectedFile?.type === 'application/pdf';

  return (
    <main className="max-w-4xl w-full mx-auto px-8 pt-16 pb-24">

      {/* HEADER */}
      <div className="flex items-center gap-5 mb-12">
        <div className="bg-[#FFF0F0] text-[#8B1A1A] border border-[#F0EBE3] p-4 rounded-3xl shadow-sm shrink-0">
          <BookOpen size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-[#1A0A00] tracking-tight font-serif">
            Citation Generator
          </h1>
          <p className="text-stone-500 text-lg mt-1">
            Generate APA, MLA, and Chicago citations from links, DOIs, or local files.
          </p>
        </div>
      </div>

      {/* GENERATOR BOX */}
      <div className="bg-white border border-[#E8DFD0] rounded-[2rem] p-8 shadow-md mb-10">
        <label className="block text-sm font-bold text-[#1A0A00] mb-4 uppercase tracking-widest">
          Paste Link, DOI, or Upload File
        </label>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 flex items-center bg-[#F9FBFD] border-2 border-[#E8DFD0] rounded-2xl focus-within:border-[#8B1A1A] focus-within:ring-4 focus-within:ring-[#8B1A1A]/10 transition-all overflow-hidden">

            {selectedFile ? (
              <div className="flex items-center justify-between w-full pl-5 pr-4 py-4 bg-[#FFF0F0]/50">
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
              <>
                <LinkIcon className="absolute left-4 text-stone-400 shrink-0" size={20} />
                <input
                  className="w-full bg-transparent pl-12 pr-32 py-4 outline-none text-[#1A0A00] font-serif placeholder:font-sans placeholder:text-stone-400 text-lg"
                  placeholder="https://doi.org/10.xxxx/... or any link"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".txt,.doc,.docx,.pdf"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 px-4 py-2.5 bg-white border border-[#E8DFD0] text-stone-600 rounded-xl hover:bg-stone-50 transition-colors flex items-center gap-2 text-sm font-semibold shadow-sm"
                >
                  <Upload size={16} />
                  <span className="hidden sm:inline">Upload</span>
                </button>
              </>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating || (!input.trim() && !selectedFile)}
            className="bg-[#1A0A00] text-white px-8 py-4 rounded-2xl font-bold hover:bg-[#8B1A1A] transition disabled:opacity-40 whitespace-nowrap shadow-md flex items-center gap-2"
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : null}
            {isGenerating ? 'Generating...' : 'Cite Source'}
          </button>
        </div>

        {/* Status message */}
        {isGenerating && statusMsg && (
          <p className="mt-3 text-sm text-stone-400 font-medium italic animate-pulse">{statusMsg}</p>
        )}

        {/* PDF warning */}
        {isPdf && (
          <div className="mt-4 flex items-start gap-2 text-amber-700 bg-amber-50 px-4 py-3 rounded-xl text-sm font-medium border border-amber-100">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>PDFs can't be read as plain text in the browser. For accurate results, paste the article's <strong>DOI or URL</strong> instead. We'll still try with the filename.</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-xl text-sm font-medium border border-rose-100">
            <AlertCircle size={16} /> {error}
          </div>
        )}
      </div>

      {/* Example hints */}
      {!citation && !isGenerating && (
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
              {example.length > 45 ? example.slice(0, 45) + "…" : example}
            </button>
          ))}
        </div>
      )}

      {/* RESULTS */}
      <AnimatePresence>
        {citation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <CitationBox format="APA 7th Edition" content={citation.apa || ""} />
            <CitationBox format="MLA 9th Edition" content={citation.mla || ""} />
            <CitationBox format="Chicago 17th Edition" content={citation.chicago || ""} />
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

  if (!content || content === "Citation unavailable.") return null;

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