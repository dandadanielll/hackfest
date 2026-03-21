import { CheckCircle2, Loader2, Database, Search, ShieldCheck } from 'lucide-react';

export default function AgentThinking({ logs }: { logs: string[] }) {
  return (
    <div className="bg-white/80 backdrop-blur-md border border-stone-200/50 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-stone-200/50 max-w-2xl mx-auto w-full mt-12 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <Database size={160} className="text-rose-900" />
      </div>

      <div className="flex items-center gap-5 mb-10">
        <div className="h-14 w-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-700 animate-agent-pulse border border-rose-100">
          <Search size={26} />
        </div>
        <div>
          <h2 className="font-bold text-2xl text-stone-900 tracking-tight font-serif">Synthesizing Literature</h2>
          <p className="text-[10px] text-rose-700/70 uppercase font-black tracking-widest mt-1">Iterative Search Process</p>
        </div>
      </div>

      <div className="space-y-5">
        {logs.map((log, i) => (
          <div key={i} className="flex items-center gap-4 log-entry">
            {i === logs.length - 1 ? (
              <Loader2 size={20} className="text-amber-500 animate-spin" />
            ) : (
              <CheckCircle2 size={20} className="text-emerald-600" />
            )}
            <span className={`text-[15px] transition-colors ${i === logs.length - 1 ? 'text-stone-900 font-bold' : 'text-stone-500 font-medium'}`}>
              {log}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}