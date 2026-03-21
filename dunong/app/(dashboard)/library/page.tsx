"use client";

import { Folder, Plus, Search } from 'lucide-react';
import ArticleCard from '@/components/ArticleCard';

export default function LibraryPage() {
  return (
    <main className="max-w-6xl w-full px-8 pt-12 pb-24 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-4xl font-black text-stone-900 tracking-tight font-serif">Library Vault</h1>
          <p className="text-stone-500 mt-2 font-medium">Your context-locked workspace for verified sources.</p>
        </div>
        <button className="bg-rose-900 text-amber-50 px-5 py-2.5 rounded-xl font-bold hover:bg-rose-800 transition flex items-center gap-2 text-sm shadow-xl shadow-rose-900/20">
          <Plus size={16} /> New Folder
        </button>
      </div>

      <div className="flex gap-8">
        {/* Folders Sidebar */}
        <div className="w-64 shrink-0 space-y-2">
          <FolderItem name="Thesis Chapter 2" count={12} active />
          <FolderItem name="Mindanao Nutrition Data" count={5} />
          <FolderItem name="DepEd Interventions" count={8} />
          <FolderItem name="Unsorted" count={3} />
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white/60 backdrop-blur-md border border-stone-200/60 rounded-[2rem] p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-bold text-xl text-stone-900 font-serif w-full truncate border-b border-stone-200/50 pb-4 pr-12">Thesis Chapter 2</h2>
            <div className="relative -ml-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input
                className="pl-9 pr-4 py-2 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500/30 w-64 bg-white/80 transition-all font-medium text-stone-800 placeholder:text-stone-400"
                placeholder="Search resources..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <ArticleCard title="Stunting and cognitive development in Filipino children" authors="Santos, J., et al." year="2022" journal="HERDIN" credibility={94} />
            <ArticleCard title="Efficacy of SBFP in Rural Mindanao" authors="Reyes, M." year="2020" journal="PHILJOL" credibility={88} />
            <ArticleCard title="Nutritional Interventions and Academic Output" authors="Cruz, A." year="2023" journal="CHED Research" credibility={92} />
          </div>
        </div>
      </div>
    </main>
  );
}

function FolderItem({ name, count, active = false }: { name: string, count: number, active?: boolean }) {
  return (
    <button className={`w-full flex justify-between items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-amber-100/50 shadow-sm border border-amber-200/50 text-rose-900' : 'text-stone-600 hover:bg-white/50 border border-transparent hover:text-stone-900'
      }`}>
      <span className="flex items-center gap-3"><Folder size={16} className={active ? "text-amber-600" : "text-stone-400"} /> {name}</span>
      <span className="text-[10px] font-black bg-white px-2 py-0.5 rounded-md text-stone-500 shadow-sm border border-stone-100">{count}</span>
    </button>
  );
}
