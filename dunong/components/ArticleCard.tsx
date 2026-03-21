import { Bookmark, ShieldCheck, Flag } from "lucide-react";

export default function ArticleCard({
  title,
  authors,
  year,
  journal,
  credibility,
  abstract,
  localSource
}: {
  title: string;
  authors: string;
  year: string;
  journal: string;
  credibility: number;
  abstract?: string;
  localSource?: boolean;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-stone-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer group hover:border-amber-200/50 flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex gap-2 items-center">
            <span className="bg-stone-100 text-stone-600 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest group-hover:bg-amber-100/50 group-hover:text-amber-900 transition">
            {journal}
            </span>
            {localSource && (
              <span className="bg-blue-50 text-blue-800 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border border-blue-100/50 flex items-center gap-1">
                <Flag size={10} /> Local Db
              </span>
            )}
        </div>
        
        <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded text-[10px] font-black text-emerald-800 border border-emerald-100/50">
          <ShieldCheck size={12} /> {credibility}/100
        </div>
      </div>

      <h3 className="font-bold text-stone-900 leading-tight group-hover:text-rose-900 transition font-serif text-lg">{title}</h3>
      <p className="text-xs text-stone-500 font-medium">{authors} • {year}</p>

      {abstract && (
        <p className="text-sm text-stone-600 line-clamp-2 leading-relaxed italic mt-1 border-l-2 border-stone-200 pl-3 group-hover:border-amber-200 transition">
           {abstract}
        </p>
      )}

      <div className="flex justify-end mt-2">
         <button className="text-xs font-bold text-stone-500 hover:text-stone-900 bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200 transition flex items-center gap-1.5">
            <Bookmark size={14} /> Save to Library
         </button>
      </div>
    </div>
  );
}
