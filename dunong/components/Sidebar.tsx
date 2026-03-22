"use client";

import { BookOpen, Layers, Bookmark, FileText, Lock, Settings, History, CheckCircle, Zap, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-[#e8e4df] backdrop-blur-md border-r border-[#2b090d]/10 shadow-[4px_0_24px_rgba(43,9,13,0.14)] flex flex-col h-screen sticky top-0 shrink-0 z-50 transition-all duration-300 relative`}>
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-50 bg-[#e8e4df] border border-[#2b090d]/15 rounded-full p-1 shadow-md shadow-[#2b090d]/15 text-[#521118]/60 hover:text-[#2b090d] transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <Link href="/researcher" className={`p-6 border-b border-[#2b090d]/10 flex items-center gap-3 hover:bg-[#2b090d]/5 transition cursor-pointer`}>
        <div className="bg-[#521118] p-1.5 rounded-lg text-[#e8e4df] shadow-inner shrink-0 w-9 h-9 flex items-center justify-center">
          <BookOpen size={22} />
        </div>
        <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-32 opacity-100'}`}>
          <span className="font-bold text-xl tracking-tight text-[#2b090d] font-serif whitespace-nowrap">DUNONG</span>
        </div>
      </Link>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavItem href="/researcher" icon={<Search size={18} />} label="Search Engine" active={pathname === '/researcher'} isCollapsed={isCollapsed} />
        <NavItem href="/library" icon={<Layers size={18} />} label="Library" active={pathname === '/library'} isCollapsed={isCollapsed} />
        <NavItem href="/writer" icon={<FileText size={18} />} label="Writer" active={pathname === '/writer'} isCollapsed={isCollapsed} />
        <NavItem href="/aitools" icon={<Zap size={18} />} label="AI Tools" active={['/synthesis', '/gaps', '/graph', '/audio'].includes(pathname)} isCollapsed={isCollapsed} />
        <NavItem href="/citation" icon={<Settings size={18} />} label="Citation Generator" active={pathname === '/citation'} isCollapsed={isCollapsed} />
        <NavItem href="/credibility" icon={<Bookmark size={18} />} label="Credibility Score" active={pathname === '/credibility'} isCollapsed={isCollapsed} />
      </nav>
    </aside>
  );
}

function NavItem({ href, icon, label, active = false, isCollapsed }: { href: string; icon: any, label: string, active?: boolean, isCollapsed: boolean }) {
  return (
    <Link
      href={href}
      title={isCollapsed ? label : ""}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${active
        ? 'bg-[#521118] text-[#e8e4df] shadow-md shadow-[#521118]/25'
        : 'text-[#2b090d]/60 hover:bg-[#2b090d]/8 hover:text-[#2b090d]'
        }`}
    >
      <div className="shrink-0 w-6 flex items-center justify-center">
        {icon}
      </div>
      <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-40 opacity-100'}`}>
        <span className="truncate whitespace-nowrap">{label}</span>
      </div>
    </Link>
  );
}
