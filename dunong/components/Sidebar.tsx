"use client";

import { BookOpen, Layers, Bookmark, FileText, Lock, Settings, History, CheckCircle, Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-stone-50/80 backdrop-blur-md border-r border-stone-200/50 flex flex-col h-screen sticky top-0 shrink-0 z-50">
      <Link href="/researcher" className="p-6 border-b border-stone-200/50 flex items-center gap-3 hover:bg-stone-100/50 transition cursor-pointer">
        <div className="bg-rose-900 p-1.5 rounded-lg text-amber-50 shadow-inner">
          <BookOpen size={22} />
        </div>
        <span className="font-bold text-xl tracking-tight text-stone-900 font-serif">DUNONG</span>
      </Link>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavItem href="/researcher" icon={<SearchIcon size={18} />} label="Search Engine" active={pathname === '/researcher'} />
        <NavItem href="/library" icon={<Layers size={18} />} label="Library" active={pathname === '/library'} />
        <NavItem href="/writer" icon={<FileText size={18} />} label="Writer" active={pathname === '/writer'} />
        <NavItem href="/synthesis" icon={<Zap size={18} />} label="AI Tools" active={['/synthesis', '/gaps', '/graph', '/audio'].includes(pathname)} />
        <NavItem href="/citation" icon={<Settings size={18} />} label="Citation Generator" active={pathname === '/citation'} />
        <NavItem href="/credibility" icon={<Bookmark size={18} />} label="Credibility Score" active={pathname === '/credibility'} />
        <NavItem href="/topic-generator" icon={<LightbulbIcon size={18} />} label="Topic Generator" active={pathname === '/topic-generator'} />
      </nav>

      <div className="p-4 border-t border-stone-200/50 shrink-0">
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/50 flex flex-col gap-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900 tracking-tight">
            <Lock size={12} strokeWidth={3} className="text-rose-700" />
            CONTEXT LOCK: ACTIVE
          </div>
          <p className="text-[10px] text-stone-500 leading-tight italic">
            Search restricted to HERDIN & PHILJOL to ensure source gravity.
          </p>
        </div>
      </div>
    </aside>
  );
}

// Temporary search icon until imported matching lucide icon is confirmed
function SearchIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
}

function LightbulbIcon({ size }: { size: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
}

function NavItem({ href, icon, label, active = false }: { href: string; icon: any, label: string, active?: boolean }) {
  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${active ? 'bg-rose-900 text-stone-50 shadow-md shadow-rose-900/20' : 'text-stone-600 hover:bg-stone-200/50 hover:text-stone-900'
        }`}
    >
      {icon} {label}
    </Link>
  );
}
