import { useState } from 'react';
import { Zap, AlertTriangle, GitGraph, Volume2, ShieldCheck, FileText, ChevronRight } from 'lucide-react';

export default function ResultsDashboard() {
  const [activeTab, setActiveTab] = useState('synthesis');

  return (
    <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* TABS NAVIGATION */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit mx-auto">
        <TabBtn active={activeTab === 'synthesis'} onClick={() => setActiveTab('synthesis')} icon={<Zap size={16}/>} label="Synthesis" />
        <TabBtn active={activeTab === 'gaps'} onClick={() => setActiveTab('gaps')} icon={<AlertTriangle size={16}/>} label="Gaps" />
        <TabBtn active={activeTab === 'graph'} onClick={() => setActiveTab('graph')} icon={<GitGraph size={16}/>} label="Graph" />
        <TabBtn active={activeTab === 'audio'} onClick={() => setActiveTab('audio')} icon={<Volume2 size={16}/>} label="Audio" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'synthesis' && (
            <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">Verified Insight</span>
                <span className="text-[10px] font-mono text-slate-300">ID: PH-STUDY-882</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 tracking-tight">Stunting in the Philippine Context</h2>
              <p className="text-slate-600 leading-relaxed text-lg">
                Current research across local repositories <span className="text-emerald-600 font-bold">[1]</span> suggests that nutritional deficits in public schools are heavily localized. While Western models suggest X, Philippine regional data from Mindanao contradicts this...
              </p>
              <div className="mt-8 flex gap-4">
                <button className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition"><FileText size={16}/> Cite (APA)</button>
                <button className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition"><ShieldCheck size={16}/> Credibility Score: 94/100</button>
              </div>
            </div>
          )}

          {activeTab === 'gaps' && (
             <div className="grid gap-4">
                <GapCard title="Mindanao Regional Bias" desc="90% of current stunting research focuses on NCR/Luzon. Data for ARMM region is critically undersampled." />
                <GapCard title="SBFP Sustainability" desc="No longitudinal data exists for cognitive retention 2 years post-feeding program exit." />
             </div>
          )}

          {activeTab === 'graph' && (
            <div className="bg-white border rounded-[2.5rem] h-[400px] flex items-center justify-center relative overflow-hidden">
               {/* SVG Knowledge Graph Placeholder */}
               <svg className="absolute w-full h-full opacity-10" viewBox="0 0 400 400">
                  <circle cx="200" cy="200" r="100" stroke="#059669" strokeWidth="1" fill="none" />
                  <line x1="100" y1="100" x2="300" y2="300" stroke="#059669" />
               </svg>
               <div className="text-center z-10">
                  <GitGraph size={48} className="text-emerald-600 mx-auto mb-4" />
                  <p className="font-bold text-slate-900">Knowledge Map</p>
                  <p className="text-xs text-slate-500">Interactive web of papers & findings</p>
               </div>
            </div>
          )}
        </div>

        {/* SIDE WIDGETS */}
        <div className="space-y-6">
           <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl">
              <h4 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-4">Contradiction Found</h4>
              <p className="text-sm font-bold text-slate-800 leading-tight">Santos (2022) vs. Reyes (2020) on SBFP recovery windows.</p>
           </div>
           
           <div className="bg-slate-900 text-white p-6 rounded-3xl">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Audio Overview</h4>
              <button className="flex items-center gap-4 w-full group">
                 <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                    <Volume2 size={20} />
                 </div>
                 <div className="text-left">
                    <p className="text-xs font-bold">Listen to Synthesis</p>
                    <p className="text-[10px] text-slate-400">3:42 Podcast</p>
                 </div>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
      active ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-800'
    }`}>
      {icon} {label}
    </button>
  );
}

function GapCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl flex gap-4 animate-in zoom-in-95">
      <div className="h-10 w-10 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold flex-shrink-0">!</div>
      <div>
        <h5 className="font-bold text-amber-900 text-sm mb-1">{title}</h5>
        <p className="text-xs text-amber-800/70 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}