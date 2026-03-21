"use client";

import { ShieldCheck, Search, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import { useState } from 'react';

export default function CredibilityPage() {
  const [url, setUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(false);

  const handleCheck = () => {
    if (!url) return;
    setAnalyzing(true);
    setResult(false);
    setTimeout(() => {
      setAnalyzing(false);
      setResult(true);
    }, 1500);
  };

  return (
    <main className="max-w-3xl w-full mx-auto px-8 pt-16 pb-24 animate-in fade-in slide-in-from-bottom-4">
      <div className="text-center mb-16">
        <div className="inline-flex h-20 w-20 bg-amber-100/50 border border-amber-200/50 text-rose-800 rounded-3xl items-center justify-center mb-8 shadow-sm">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-5xl font-black text-stone-900 tracking-tight mb-5 font-serif">Article Credibility Checker</h1>
        <p className="text-stone-500 text-xl font-medium">Cross-referencing against CHED, PHILJOL, and Scopus databases.</p>
      </div>

      <div className="relative mb-16">
        <input 
          className="w-full p-6 pl-8 pr-40 bg-white/80 backdrop-blur-md border-2 border-stone-200 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(123,24,24,0.1)] outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-400 text-xl transition-all font-serif placeholder:font-sans placeholder:text-stone-400"
          placeholder="Paste article URL or DOI..."
          value={url} onChange={(e) => setUrl(e.target.value)}
        />
        <button 
          onClick={handleCheck}
          disabled={analyzing}
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-rose-900 text-amber-50 px-8 py-4 rounded-full font-bold hover:bg-rose-800 transition flex items-center gap-2 disabled:opacity-50 shadow-lg"
        >
          {analyzing ? <AlertTriangle className="animate-pulse" size={18} /> : <Search size={18} />} 
          {analyzing ? 'Checking...' : 'Analyze'}
        </button>
      </div>

      {result && (
        <div className="bg-white/90 backdrop-blur-sm border border-stone-200 rounded-[2.5rem] p-10 shadow-xl shadow-stone-200/50 animate-in zoom-in-95">
          <div className="flex flex-col md:flex-row gap-8 items-center mb-10 border-b border-stone-100 pb-8">
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#FAF8F5" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="40" stroke="#7B1818" strokeWidth="8" fill="none" strokeDasharray="251" strokeDashoffset="20" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-stone-900 font-serif">92</span>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">Score</span>
              </div>
            </div>
            <div>
               <h2 className="text-3xl font-bold text-stone-900 mb-3 font-serif">High Credibility Source</h2>
               <p className="text-stone-600 text-lg leading-relaxed">This article is published in a peer-reviewed, PHILJOL-indexed journal. The primary author is affiliated with a recognized Philippine State University.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <MetricItem label="Journal Accreditation" value="PHILJOL Indexed" pass />
            <MetricItem label="Peer Review Status" value="Verified Peer-Reviewed" pass />
            <MetricItem label="Author Affiliation" value="UP Manila" pass />
            <MetricItem label="Publication Recency" value="2022 (Valid)" pass />
          </div>
        </div>
      )}
    </main>
  );
}

function MetricItem({ label, value, pass }: { label: string, value: string, pass: boolean }) {
  return (
    <div className="bg-stone-50 border border-stone-100 p-5 rounded-2xl flex items-start gap-4">
      <CheckCircle2 size={20} className="text-emerald-600 mt-1 shrink-0" />
      <div>
        <p className="text-[10px] uppercase tracking-widest font-black text-stone-400 mb-1.5">{label}</p>
        <p className="text-base font-bold text-stone-800">{value}</p>
      </div>
    </div>
  );
}
