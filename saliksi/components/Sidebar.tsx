"use client";

import { BookOpen, Layers, Bookmark, FileText, Lock, Settings, History, CheckCircle, Zap, Search, ChevronLeft, ChevronRight, Lightbulb, User, Code, Terminal, Menu, X } from 'lucide-react';
import { RiGeminiLine } from 'react-icons/ri';
import { FaCheck } from 'react-icons/fa6';
import { TfiQuoteLeft } from 'react-icons/tfi';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useDevMode } from '@/lib/devModeContext';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isDevModeEnabled, setDevModeEnabled, setPaneExpanded } = useDevMode();
  const [showDevPopup, setShowDevPopup] = useState(false);
  const [showDisablePopup, setShowDisablePopup] = useState(false);

  return (
    <>
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(true)}
        className="md:hidden fixed top-4 right-4 z-[60] bg-[#e8e4df] p-2.5 rounded-xl shadow-md border border-[#2b090d]/10 text-[#521118] hover:bg-white transition"
      >
        <Menu size={24} />
      </button>

      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-[#2b090d]/40 backdrop-blur-sm z-[65]" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}

      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} 
        bg-[#e8e4df] backdrop-blur-md border-r border-[#2b090d]/10 shadow-[4px_0_24px_rgba(43,9,13,0.14)] 
        flex flex-col h-screen shrink-0 z-[70] transition-all duration-300
        fixed md:sticky top-0 left-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
      
      {/* Mobile Close Button */}
      <button 
        onClick={() => setIsMobileMenuOpen(false)}
        className="md:hidden absolute top-4 right-4 z-50 p-2 text-[#521118]/60 hover:text-[#2b090d] transition focus:outline-none"
      >
        <X size={24} />
      </button>

      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="hidden md:block absolute -right-3 top-[88px] -translate-y-1/2 z-50 bg-[#e8e4df] border border-[#2b090d]/15 rounded-full p-1 shadow-sm shadow-[#2b090d]/15 text-[#521118]/60 hover:text-[#2b090d] transition-colors"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <Link href="/researcher" className="px-5 py-6 border-b border-[#2b090d]/10 flex items-center hover:bg-[#2b090d]/5 transition cursor-pointer overflow-hidden">
        <img
          src="/logo.png"
          alt="SaLiksi"
          className="w-10 h-10 object-contain shrink-0 drop-shadow-sm"
          draggable="false"
        />
        <div className={`ml-3 overflow-hidden transition-all duration-500 flex items-center ${isCollapsed ? 'w-0 opacity-0 pointer-events-none' : 'w-32 opacity-100'}`}>
          <span className="font-black text-xl tracking-tight text-[#521118] font-serif whitespace-nowrap">SaLiksi</span>
        </div>
      </Link>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavItem href="/researcher" icon={<Search size={18} />} label="Search Engine" active={pathname === '/researcher'} isCollapsed={isCollapsed} />
        <NavItem href="/topic-generator" icon={<Lightbulb size={18} />} label="Topic Generator" active={pathname === '/topic-generator'} isCollapsed={isCollapsed} />
        <NavItem href="/library" icon={<Layers size={18} />} label="Library" active={pathname === '/library'} isCollapsed={isCollapsed} />
        <NavItem href="/writer" icon={<FileText size={18} />} label="Writer" active={pathname === '/writer'} isCollapsed={isCollapsed} />
        <NavItem href="/credibility" icon={<FaCheck size={18} />} label="Credibility Score" active={pathname === '/credibility'} isCollapsed={isCollapsed} />
        <NavItem href="/aitools" icon={<RiGeminiLine size={18} />} label="AI Tools" active={pathname === '/aitools'} isCollapsed={isCollapsed} />
        <NavItem href="/citation" icon={<TfiQuoteLeft size={18} />} label="Citation Generator" active={pathname === '/citation'} isCollapsed={isCollapsed} />
      </nav>

      <div className="p-4 border-t border-[#2b090d]/10 space-y-1 bg-[#e8e4df] shrink-0">
        <NavItem href="#" icon={<User size={18} />} label="Profile" active={false} isCollapsed={isCollapsed} />
        <NavItem href="#" icon={<Settings size={18} />} label="Settings" active={false} isCollapsed={isCollapsed} />
        <button
          onClick={() => {
            if (isDevModeEnabled) {
              setShowDisablePopup(true);
            } else {
              setShowDevPopup(true);
            }
          }}
          title={isCollapsed ? "Developer Mode" : ""}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${isDevModeEnabled ? 'bg-[#521118]/10 text-[#521118] shadow-inner' : 'text-[#2b090d]/60 hover:bg-[#2b090d]/8 hover:text-[#2b090d]'}`}
        >
          <div className="shrink-0 w-6 flex items-center justify-center">
            <Code size={18} className={isDevModeEnabled ? "animate-pulse" : ""} />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-40 flex-1 text-left opacity-100'}`}>
            <span className="truncate whitespace-nowrap">Developer Mode</span>
          </div>
        </button>
      </div>
    </aside>

      {showDevPopup && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 text-[#2b090d] p-7 rounded-3xl max-w-sm w-full shadow-2xl border border-[#2b090d]/10 font-sans relative overflow-hidden backdrop-blur-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="bg-[#521118]/10 p-2.5 rounded-xl border border-[#521118]/10 text-[#521118] shadow-inner">
                 <Code size={20} />
              </div>
              <h2 className="text-xl font-bold font-serif text-[#2b090d]">Initialize Dev Mode?</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-8">
              Developer Mode activates a global tracking overlay. This allows you to observe the raw agent thinking logs, scoring matrices, and API metrics of SaLiksi in real-time as it processes background tasks.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDevPopup(false)} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-[#521118]/60 hover:text-[#521118] hover:bg-[#521118]/10 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setDevModeEnabled(true);
                  setPaneExpanded(true);
                  setShowDevPopup(false);
                }} 
                className="group relative px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-[#521118] text-[#e8e4df] hover:bg-[#2b090d] transition shadow-md shadow-[#521118]/20 overflow-hidden active:scale-95"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                <span className="relative z-10 transition-transform group-hover:scale-105 inline-block">Turn On</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisablePopup && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 text-[#2b090d] p-7 rounded-3xl max-w-sm w-full shadow-2xl border border-[#2b090d]/10 font-sans relative overflow-hidden backdrop-blur-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="bg-[#521118]/10 p-2.5 rounded-xl border border-[#521118]/10 text-[#521118] shadow-inner">
                 <Terminal size={20} />
              </div>
              <h2 className="text-xl font-bold font-serif text-[#2b090d]">Disable Dev Mode?</h2>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed mb-8">
              Are you sure you want to disable Developer Mode? The global tracking overlay will be hidden and background agent logs will no longer be visible.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowDisablePopup(false)} 
                className="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide text-[#521118]/60 hover:text-[#521118] hover:bg-[#521118]/10 transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setDevModeEnabled(false);
                  setPaneExpanded(false);
                  setShowDisablePopup(false);
                }} 
                className="group relative px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-[#521118] text-[#e8e4df] hover:bg-[#2b090d] transition shadow-md shadow-[#521118]/20 overflow-hidden active:scale-95"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                <span className="relative z-10 transition-transform group-hover:scale-105 inline-block">Turn Off</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
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
