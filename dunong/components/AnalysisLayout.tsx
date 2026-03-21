"use client";

import { AlertTriangle, GitGraph, ShieldCheck, Volume2, Zap, FileText } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full max-w-5xl mx-auto px-8">
      {/* TABS NAVIGATION */}
      <div className="flex bg-stone-200/50 p-1.5 rounded-2xl w-fit mx-auto border border-stone-300/30">
        <TabBtn href="/synthesis" active={pathname === '/synthesis'} icon={<Zap size={16}/>} label="Synthesis" />
        <TabBtn href="/gaps" active={pathname === '/gaps'} icon={<AlertTriangle size={16}/>} label="Gaps" />
        <TabBtn href="/graph" active={pathname === '/graph'} icon={<GitGraph size={16}/>} label="Graph" />
        <TabBtn href="/audio" active={pathname === '/audio'} icon={<Volume2 size={16}/>} label="Audio" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           {children}
        </div>

        {/* SIDE WIDGETS */}
        <div className="space-y-6">
           <div className="bg-amber-50/80 border border-amber-200/50 p-6 rounded-3xl backdrop-blur-sm shadow-sm">
              <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-4">Contradiction Found</h4>
              <p className="text-sm font-bold text-stone-800 leading-tight">Santos (2022) vs. Reyes (2020) on SBFP recovery windows.</p>
           </div>
           
           <div className="bg-stone-900 border border-stone-800 text-stone-50 p-6 rounded-3xl shadow-xl shadow-stone-900/10">
              <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4">Audio Overview</h4>
              <Link href="/audio" className="flex items-center gap-4 w-full group">
                 <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-amber-500 group-hover:text-stone-900 transition-colors">
                    <Volume2 size={20} />
                 </div>
                 <div className="text-left">
                    <p className="text-xs font-bold text-amber-50 group-hover:text-amber-400 transition-colors">Listen to Synthesis</p>
                    <p className="text-[10px] text-stone-400">3:42 Podcast</p>
                 </div>
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ href, active, icon, label }: { href: string, active: boolean, icon: any, label: string }) {
  return (
    <Link href={href} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
      active ? 'bg-white shadow-sm text-rose-800 border border-stone-200/50' : 'text-stone-500 hover:text-stone-900'
    }`}>
      {icon} {label}
    </Link>
  );
}
