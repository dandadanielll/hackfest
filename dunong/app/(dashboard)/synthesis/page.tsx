"use client";

import AnalysisLayout from '@/components/AnalysisLayout';
import { FileText, ShieldCheck } from 'lucide-react';

export default function SynthesisPage() {
  return (
    <AnalysisLayout>
        <div className="bg-white/90 backdrop-blur-sm border border-stone-200 p-10 rounded-[2.5rem] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <span className="bg-amber-100/60 text-amber-900 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200/60">Verified Insight</span>
            <span className="text-[10px] font-mono font-bold text-stone-400">SOURCE REF: PH-STUDY-882</span>
          </div>
          <h2 className="text-3xl font-black text-stone-900 mb-6 tracking-tight font-serif">Stunting in the Philippine Context</h2>
          <p className="text-stone-700 leading-loose text-lg font-serif">
            Current research across local repositories <span className="text-rose-800 font-bold bg-rose-50 px-1 rounded">[1]</span> suggests that nutritional deficits in public schools are heavily localized. While Western models suggest rigid thresholds, Philippine regional data from Mindanao contradicts this. Specifically, Reyes (2020) highlights that interventions without community-level agricultural support fail within 6 months <span className="text-rose-800 font-bold bg-rose-50 px-1 rounded">[2]</span>.
          </p>
          <div className="mt-10 pt-6 border-t border-stone-100 flex gap-6">
            <button className="flex items-center gap-2 text-sm font-bold text-stone-500 hover:text-rose-800 transition bg-stone-50 hover:bg-rose-50 px-4 py-2 rounded-xl"><FileText size={16}/> Cite (APA)</button>
            <button className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl"><ShieldCheck size={16}/> Score: 94/100</button>
          </div>
        </div>
    </AnalysisLayout>
  );
}
