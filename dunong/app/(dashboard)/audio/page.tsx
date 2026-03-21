"use client";

import AnalysisLayout from '@/components/AnalysisLayout';
import { Play, Pause, SkipForward, SkipBack, Headphones } from 'lucide-react';
import { useState } from 'react';

export default function AudioPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35); // mock percentage

  return (
    <AnalysisLayout>
        <div className="bg-stone-900 text-stone-50 border border-stone-800 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
          {/* Decorative blurred background layer */}
          <div className="absolute -top-20 -left-20 w-80 h-80 bg-rose-900/30 rounded-full blur-3xl" />
          <div className="absolute top-20 -right-20 w-60 h-60 bg-amber-600/20 rounded-full blur-3xl" />

          <div className="relative z-10 w-full mb-10">
            <div className="bg-stone-800/80 backdrop-blur-md border border-stone-700 w-24 h-24 rounded-3xl mx-auto flex items-center justify-center text-amber-500 mb-8 shadow-[0_0_40px_rgba(212,175,55,0.2)]">
               <Headphones size={48} strokeWidth={1.5} />
            </div>
            <h2 className="text-3xl font-black mb-3 font-serif">Philippine Stunting vs Global Models</h2>
            <p className="text-stone-400 font-medium">Auto-generated podcast overview • 3:42</p>
          </div>

          {/* Visualization (Mock) */}
          <div className="flex items-center justify-center gap-1.5 h-20 mb-10 w-full max-w-sm mx-auto z-10">
            {[...Array(24)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1.5 rounded-full ${i < 8 ? 'bg-amber-500' : 'bg-stone-700'} ${isPlaying ? 'animate-pulse' : ''}`}
                style={{
                  height: `${Math.max(10, Math.random() * (i < 8 ? 80 : 40))}%`,
                  transition: 'height 0.2s',
                  animationDelay: `${i * 0.05}s`
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="w-full max-w-md mx-auto z-10">
             {/* Progress Bar */}
             <div className="w-full bg-stone-800 h-2 rounded-full mb-8 relative cursor-pointer group">
               <div className="bg-amber-500 h-full rounded-full relative" style={{width: `${progress}%`}}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full scale-0 group-hover:scale-100 transition-transform shadow-md" />
               </div>
             </div>

             <div className="flex items-center justify-center gap-8">
               <button className="text-stone-400 hover:text-white transition"><SkipBack size={28} fill="currentColor" /></button>
               <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-20 h-20 bg-amber-500 text-stone-900 rounded-full flex items-center justify-center hover:bg-amber-400 transition hover:scale-105 shadow-[0_10px_30px_rgba(212,175,55,0.3)]"
                >
                 {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-2" />}
               </button>
               <button className="text-stone-400 hover:text-white transition"><SkipForward size={28} fill="currentColor" /></button>
             </div>
          </div>
        </div>
    </AnalysisLayout>
  );
}
