"use client";

import { useDevMode } from "@/lib/devModeContext";
import { Terminal, X, Code, Trash2, ChevronRight, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export default function DevModeOverlay() {
  const { isDevModeEnabled, isPaneExpanded, setPaneExpanded, groups, clearLogs } = useDevMode();
  const pathname = usePathname();
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeGroups = groups.filter(g => g.route === pathname);
  const isApplicableRoute = !['/library', '/writer'].includes(pathname);

  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      if (!isApplicableRoute && isPaneExpanded) setPaneExpanded(false);
      prevPathRef.current = pathname;
    }
  }, [pathname, isApplicableRoute, isPaneExpanded, setPaneExpanded]);

  useEffect(() => {
    if (bottomRef.current && isPaneExpanded) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeGroups, isPaneExpanded]);

  if (!isDevModeEnabled) return null;

  return (
    <div className={`fixed top-0 right-0 h-screen z-[100] flex transition-transform duration-300 ease-in-out ${isPaneExpanded ? 'translate-x-0' : 'translate-x-[380px]'}`}>
      
      {/* Floating Toggle Button (sticks out to the left of the pane when hidden) */}
      <button 
        onClick={() => setPaneExpanded(!isPaneExpanded)}
          title="Toggle Developer Engine Logs"
          className="absolute -left-12 top-1/2 -translate-y-1/2 bg-white/90 text-[#2b090d] w-12 h-16 rounded-l-2xl shadow-[-4px_0_12px_rgba(43,9,13,0.1)] flex items-center justify-center hover:bg-[#e8e4df] transition border border-r-0 border-[#2b090d]/10 backdrop-blur-md"
        >
          {isPaneExpanded ? <ChevronRight size={20} className="text-[#521118]" /> : <Code size={20} className="animate-pulse text-[#521118]" />}
        </button>

      {/* Pane Content */}
      <div className="w-[380px] h-full bg-[#e8e4df]/85 text-[#2b090d] font-mono flex flex-col shadow-[0_0_40px_rgba(43,9,13,0.1)] border-l border-[#521118]/20 relative overflow-hidden backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#521118]/10 bg-white/50 shrink-0">
          <div className="flex items-center gap-2 text-[#521118] font-black uppercase tracking-widest text-[11px]">
            <Terminal size={14} /> Agent Traces
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => clearLogs(pathname)} className="text-[#521118]/40 hover:text-[#521118] transition" title="Clear Current Tab Logs">
              <Trash2 size={13} />
            </button>
            <button onClick={() => setPaneExpanded(false)} className="text-[#521118]/40 hover:text-[#521118] transition" title="Close Pane">
              <X size={15} />
            </button>
          </div>
        </div>
        
        {/* Log Viewer */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar text-[11px]">
          {!isApplicableRoute ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40 text-center gap-3 px-6">
              <Code size={28} className="mb-2 text-[#521118]" />
              <p className="italic text-[#521118] font-serif text-[13.5px] leading-relaxed">System telemetry is strategically disabled in the Writer and Library modules to minimize distraction.</p>
            </div>
          ) : activeGroups.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-40 text-center gap-2">
              <Sparkles size={24} className="mb-2 text-[#521118]" />
              <p className="italic text-[#521118] font-serif text-[13px]">Standby... waiting for AI operations on this tab.</p>
            </div>
          ) : (
            activeGroups.map(group => (
              <div key={group.id} className="bg-white/60 border border-[#521118]/10 p-4 rounded-2xl shadow-sm hover:shadow-md hover:border-[#521118]/20 transition-all">
                <div className="flex items-center justify-between gap-2 mb-3 border-b border-[#521118]/5 pb-2">
                  <span className="text-[#2b090d] font-bold tracking-wide break-words flex-1 leading-snug">{group.title}</span>
                  <span className="text-[#521118]/40 uppercase tracking-widest text-[9px] shrink-0 font-bold">{group.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                <div className="space-y-2.5">
                  {group.logs.map(log => (
                    <div key={log.id} className="border-l-[3px] border-[#521118]/20 pl-2.5 ml-0.5 text-[#521118]/80 leading-relaxed whitespace-pre-wrap">
                      {log.message}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-1 pb-4" />
        </div>
      </div>
    </div>
  );
}
