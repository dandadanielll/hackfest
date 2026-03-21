"use client";

import AnalysisLayout from '@/components/AnalysisLayout';

export default function GapsPage() {
  return (
    <AnalysisLayout>
      <div className="grid gap-5">
        <GapCard 
          title="Mindanao Regional Bias" 
          desc="90% of current stunting research focuses on NCR/Luzon. Data for ARMM region is critically undersampled." 
        />
        <GapCard 
          title="SBFP Sustainability" 
          desc="No longitudinal data exists for cognitive retention 2 years post-feeding program exit." 
        />
        <GapCard 
          title="Urban vs Rural Nutritional Access" 
          desc="Extensive comparative analysis lacking across rural municipalities regarding access to DepEd-mandated supplementary feeding." 
        />
      </div>
    </AnalysisLayout>
  );
}

function GapCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border-l-4 border-l-amber-500 border-y border-r border-stone-200 p-8 rounded-r-3xl rounded-l-md flex gap-5 shadow-sm hover:shadow-md transition duration-300">
      <div className="h-12 w-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center font-black flex-shrink-0 text-xl font-serif">?</div>
      <div>
        <h5 className="font-bold text-stone-900 text-lg mb-2 tracking-tight font-serif">{title}</h5>
        <p className="text-[15px] text-stone-600 leading-relaxed font-medium">{desc}</p>
      </div>
    </div>
  );
}
