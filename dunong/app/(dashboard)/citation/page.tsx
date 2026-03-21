"use client";

import { FileText, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function CitationPage() {
  const [url, setUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [citations, setCitations] = useState<{apa?: string, mla?: string} | null>(null);

  const handleGenerate = () => {
    if (!url) return;
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setCitations({
        apa: "Santos, J., Dimaculangan, R., & Reyes, M. (2022). Stunting and cognitive development in Filipino children: A longitudinal study in rural Mindanao. Philippine Journal of Health Research, 14(3), 112-128. https://doi.org/10.1111/pjhr.12045",
        mla: "Santos, Jose, et al. \"Stunting and Cognitive Development in Filipino Children: A Longitudinal Study in Rural Mindanao.\" Philippine Journal of Health Research, vol. 14, no. 3, 2022, pp. 112-128. HERDIN, https://doi.org/10.1111/pjhr.12045."
      });
    }, 1200);
  };

  return (
    <main className="max-w-4xl w-full mx-auto px-8 pt-16 pb-24 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-5 mb-12">
        <div className="bg-amber-100/50 text-amber-900 border border-amber-200/50 p-4 rounded-3xl shadow-sm">
          <FileText size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight font-serif">Citation Generator</h1>
          <p className="text-stone-500 text-lg mt-1 font-medium">Instantly format sources from URLs or DOIs.</p>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-md border border-stone-200/60 rounded-[2.5rem] p-10 shadow-xl shadow-stone-200/40 mb-10">
        <label className="block text-sm font-bold text-stone-900 mb-4 font-serif">Article URL or DOI</label>
        <div className="flex gap-4">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input 
              className="w-full bg-stone-50 border-2 border-stone-200 pl-12 pr-4 py-4 rounded-2xl outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-400 text-stone-800 transition-all font-serif placeholder:font-sans placeholder:text-stone-400"
              placeholder="https://philjol.info/article/12345"
              value={url} onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <button 
            onClick={handleGenerate} disabled={generating}
            className="bg-stone-900 text-stone-50 px-8 py-4 rounded-2xl font-bold hover:bg-stone-800 transition disabled:opacity-50 whitespace-nowrap shadow-lg"
          >
            {generating ? 'Generating...' : 'Generate Citations'}
          </button>
        </div>
      </div>

      {citations && (
        <div className="space-y-6 animate-in slide-in-from-bottom-8">
          <CitationBox format="APA 7th Edition" content={citations.apa!} />
          <CitationBox format="MLA 9th Edition" content={citations.mla!} />
        </div>
      )}
    </main>
  );
}

function CitationBox({ format, content }: { format: string, content: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-stone-200 p-8 rounded-3xl group hover:border-amber-200/60 transition shadow-sm">
      <div className="flex justify-between items-center mb-4 border-b border-stone-100 pb-4">
        <h3 className="font-bold text-sm text-stone-400 uppercase tracking-widest">{format}</h3>
        <button onClick={handleCopy} className="text-stone-400 hover:text-rose-800 transition flex items-center gap-2 text-sm font-bold bg-stone-50 hover:bg-rose-50 px-3 py-1.5 rounded-lg">
          {copied ? <Check size={16} className="text-rose-700"/> : <Copy size={16} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="text-stone-800 leading-relaxed font-serif text-lg">{content}</p>
    </div>
  );
}
