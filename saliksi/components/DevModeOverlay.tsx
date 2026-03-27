"use client";

import { useDevMode, LogGroup } from "@/lib/devModeContext";
import { Terminal, X, Code, Trash2, ChevronRight, Sparkles, Maximize2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function DetailedTraceModal({ group, onClose }: { group: LogGroup, onClose: () => void }) {
  const [trace, setTrace] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!group.traceOperation || !group.traceContext) {
      setTrace(group.logs.map((l: any) => l.message).join('\n'));
      return;
    }

    let isSubscribed = true;
    setIsStreaming(true);
    setTrace('> Initializing full diagnostic trace pipeline...\n');

    async function fetchStream() {
      try {
        const res = await fetch("/api/dev-trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operation: group.traceOperation,
            context: group.traceContext,
            detailed: true
          }),
        });

        if (!res.ok || !res.body) throw new Error("Stream failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (isSubscribed) {
             setTrace((prev) => prev + chunk);
          }
          
          if (chunk.includes('>')) {
             await new Promise(r => setTimeout(r, 800)); // big pause for next section
          } else if (chunk.includes('.') || chunk.includes('?') || chunk.includes('!')) {
             await new Promise(r => setTimeout(r, 200)); // sentence pause
          } else {
             await new Promise(r => setTimeout(r, 20));  // typing speed
          }
        }
      } catch (err) {
        if (isSubscribed) setTrace(prev => prev + '\n[Stream interrupted/failed]');
      } finally {
        if (isSubscribed) setIsStreaming(false);
      }
    }
    
    fetchStream();
    return () => { isSubscribed = false; };
  }, [group]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [trace]);

  const parts = trace.split(/(?=>\s)/g).filter(s => s.trim());

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-5xl bg-slate-950/90 backdrop-blur-xl border border-slate-700/60 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden overflow-y-hidden ring-4 ring-slate-800/30 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-start justify-between p-8 border-b border-slate-800/80 bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2 text-green-400 font-bold uppercase tracking-widest text-xs mb-3">
              <Terminal size={14} className="mb-0.5" /> 
              Detailed Diagnostic View
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-100 leading-snug">{group.title}</h2>
            <div className="text-slate-500 font-mono text-sm mt-2">{group.source} — {group.timestamp.toLocaleTimeString()}</div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-500 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Trace Content */}
        <div className="flex-1 overflow-y-auto p-8 font-mono custom-scrollbar bg-slate-950/40">
           <div className="space-y-6">
              {parts.map((step, i) => (
                <div key={i} className="border-l-[3px] border-green-500/50 pl-5 py-2">
                  <p className={`${isStreaming ? 'text-green-300' : 'text-slate-300'} text-base leading-relaxed m-0 whitespace-pre-wrap`}>
                    {step.trim()}
                    {isStreaming && i === parts.length - 1 && <span className="inline-block w-2.5 h-[18px] bg-green-400 ml-2 animate-pulse align-text-bottom rounded-sm" />}
                  </p>
                </div>
              ))}
              <div ref={bottomRef} className="h-4" />
           </div>
        </div>

      </div>
    </div>
  );
}

export default function DevModeOverlay() {
  const { isDevModeEnabled, isPaneExpanded, setPaneExpanded, groups, clearLogs } = useDevMode();
  const pathname = usePathname();
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const [selectedGroup, setSelectedGroup] = useState<LogGroup | null>(null);

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
    if (bottomRef.current && isPaneExpanded && !selectedGroup) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeGroups, isPaneExpanded, selectedGroup]);

  if (!isDevModeEnabled) return null;

  return (
    <>
      <div className={`fixed top-0 right-0 h-screen z-[100] flex transition-transform duration-300 ease-in-out ${isPaneExpanded ? 'translate-x-0' : 'translate-x-[600px]'}`}>
        
        {/* Floating Toggle Button */}
        <button 
          onClick={() => setPaneExpanded(!isPaneExpanded)}
          title="Toggle Developer Engine Logs"
          className="absolute -left-14 top-1/2 -translate-y-1/2 bg-slate-900/95 text-green-400 w-14 h-20 rounded-l-2xl shadow-[-4px_0_16px_rgba(0,0,0,0.6)] flex items-center justify-center hover:bg-slate-800 transition border border-r-0 border-slate-700 backdrop-blur-md"
        >
          {isPaneExpanded ? <ChevronRight size={22} className="text-green-400" /> : <Code size={22} className="animate-pulse text-green-400" />}
        </button>

        {/* Pane Content */}
        <div className="w-[600px] h-full bg-slate-950/95 text-slate-200 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.6)] border-l border-slate-700/80 relative overflow-hidden backdrop-blur-xl">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/60 bg-slate-900/90 shrink-0">
            <div className="flex items-center gap-3 text-green-400 font-black uppercase tracking-[0.15em] text-base">
              <Terminal size={18} /> Agent Traces
            </div>
            <div className="flex items-center gap-4">
              <button onClick={() => clearLogs(pathname)} className="text-slate-500 hover:text-green-400 transition p-1" title="Clear Current Tab Logs">
                <Trash2 size={16} />
              </button>
              <button onClick={() => setPaneExpanded(false)} className="text-slate-500 hover:text-green-400 transition p-1" title="Close Pane">
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Log Viewer */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 custom-scrollbar">
            {!isApplicableRoute ? (
              <div className="h-full flex flex-col items-center justify-center opacity-70 text-center gap-4 px-8">
                <Code size={32} className="mb-2 text-slate-500" />
                <p className="italic text-slate-400 font-mono text-base leading-relaxed">System telemetry is strategically disabled in the Writer and Library modules to minimize distraction.</p>
              </div>
            ) : activeGroups.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-70 text-center gap-3">
                <Sparkles size={28} className="mb-2 text-slate-500" />
                <p className="italic text-slate-400 font-mono text-base">Standby... waiting for AI operations on this tab.</p>
              </div>
            ) : (
              activeGroups.map(group => (
                <div 
                  key={group.id} 
                  onClick={() => setSelectedGroup(group)}
                  title="Click to see detailed diagnostic trace"
                  className="bg-slate-900/70 border border-slate-700/50 p-5 rounded-2xl shadow-lg hover:border-green-500/40 hover:bg-slate-900 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.98]"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-slate-800 p-2 rounded-full text-slate-300">
                        <Maximize2 size={16} />
                      </div>
                  </div>
                  {/* Group Header */}
                  <div className="flex items-start justify-between gap-3 mb-4 border-b border-slate-700/40 pb-3 pr-8">
                    <span className="text-green-400 font-bold text-[17px] leading-snug break-words flex-1 group-hover:text-green-300 transition-colors">{group.title}</span>
                    <span className="text-slate-500 uppercase tracking-widest text-[11px] shrink-0 font-bold mt-1">{group.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </div>
                  {/* Log Entries */}
                  <div className="space-y-3.5">
                    {group.logs.map(log => (
                      <div key={log.id} className={`border-l-[3px] ${log.isStreaming ? 'border-green-500/60' : 'border-slate-600/60'} pl-4 py-1 font-mono`}>
                        {(() => {
                          const text = log.message;
                          const color = log.isStreaming ? 'text-green-300' : 'text-slate-200';
                          // Split on "> " to separate each reasoning step
                          const parts = text.split(/(?=>\s)/g).filter(s => s.trim());
                          if (parts.length <= 1) {
                            return (
                              <span className={`${color} text-[15px] leading-[1.7] whitespace-pre-wrap`}>
                                {text}
                                {log.isStreaming && <span className="inline-block w-2.5 h-[18px] bg-green-400 ml-1 animate-pulse align-text-bottom rounded-sm" />}
                              </span>
                            );
                          }
                          return (
                            <div className="flex flex-col gap-5">
                              {parts.map((step, i) => (
                                <p key={i} className={`${color} text-[15px] leading-[1.75] whitespace-pre-wrap m-0 line-clamp-4`}>
                                  {step.trim()}
                                  {log.isStreaming && i === parts.length - 1 && <span className="inline-block w-2.5 h-[18px] bg-green-400 ml-1 animate-pulse align-text-bottom rounded-sm" />}
                                </p>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} className="h-2 pb-6" />
          </div>
        </div>
      </div>

      {/* Expanded Modal View */}
      {selectedGroup && (
        <DetailedTraceModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />
      )}
    </>
  );
}
