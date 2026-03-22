import { Bookmark, ShieldCheck, Flag, Unlock, Link2 } from "lucide-react";

export default function ArticleCard({
  articleId,
  title,
  authors,
  year,
  journal,
  credibility,
  abstract,
  localSource,
  openAccess,
  url,
  hideActions = false
}: {
  articleId?: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  credibility: number;
  abstract?: string;
  localSource?: boolean;
  openAccess?: boolean;
  url?: string;
  hideActions?: boolean;
}) {
  return (
    <div className="relative h-full w-full group/article">
      <div className="bg-white/80 backdrop-blur-sm border border-[#2b090d]/10 p-5 rounded-2xl shadow-sm transition-all cursor-pointer flex flex-col gap-3 h-full 
        group-hover/article:absolute group-hover/article:top-0 group-hover/article:left-0 group-hover/article:w-full group-hover/article:h-auto group-hover/article:z-50 
        group-hover/article:shadow-[0_20px_50px_rgba(43,9,13,0.3)] group-hover/article:scale-[1.01] group-hover/article:bg-white/95 group-hover/article:border-[#521118]/20">
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-2 items-center flex-wrap">
            <span className="bg-[#521118]/5 text-[#521118]/60 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition border border-[#2b090d]/5">
              {journal}
            </span>
            {localSource && (
              <span className="bg-rose-50 text-rose-800 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-rose-200/50 flex items-center gap-1">
                <Flag size={10} strokeWidth={3} /> PH Source
              </span>
            )}
            {openAccess && (
              <span className="bg-emerald-50 text-emerald-800 px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-emerald-200/50 flex items-center gap-1">
                <Unlock size={10} strokeWidth={3} /> Open Access
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#521118]/5 px-2 py-1 rounded-lg text-[10px] font-black text-[#521118] border border-[#2b090d]/5 shrink-0">
            <ShieldCheck size={12} strokeWidth={3} /> {credibility}
          </div>
        </div>

        <a href={url || "#"} target="_blank" rel="noreferrer" className="block transition">
          <h3 className="font-bold text-[#2b090d] leading-tight font-serif text-lg transition flex items-start justify-between gap-4 group-hover/article:text-[#521118]">
            <span className="line-clamp-6 group-hover/article:line-clamp-none">{title}</span>
            <Link2 size={16} className="text-[#521118]/20 shrink-0 mt-1" />
          </h3>
        </a>
        <p className="text-xs text-[#521118]/40 font-bold uppercase tracking-wide">{authors} • {year}</p>

        {abstract && (
          <div className="group-hover/article:max-h-[40vh] group-hover/article:overflow-y-auto transition-all pr-1 custom-scrollbar">
            <p className="text-sm text-[#2b090d]/70 line-clamp-2 group-hover/article:line-clamp-none leading-relaxed italic mt-1 border-l-2 border-[#2b090d]/10 pl-3 transition-all">
              {abstract}
            </p>
          </div>
        )}

        {!hideActions && (
          <div className="flex justify-end mt-auto pt-2">
            <button className="text-xs font-bold text-[#f4f2f0] bg-[#521118] hover:bg-[#2b090d] px-4 py-2 rounded-xl border border-[#2b090d]/10 transition-all flex items-center gap-2 shadow-md shadow-[#2b090d]/10">
              <Bookmark size={14} /> Save to Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
