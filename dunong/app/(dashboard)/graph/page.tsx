"use client";

import AnalysisLayout from '@/components/AnalysisLayout';
import { useEffect, useRef } from 'react';

export default function GraphPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Set canvas dimensions
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Mock nodes
    const nodes = Array.from({ length: 8 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 6 + 4,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Updates
      nodes.forEach(node => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x <= 0 || node.x >= canvas.width) node.vx *= -1;
        if (node.y <= 0 || node.y >= canvas.height) node.vy *= -1;
      });

      // Draw lines
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(123, 24, 24, ${1 - dist / 150})`; // up maroon links
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((node, i) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = i === 0 ? '#D4AF37' : '#7B1818'; // up gold center, maroon others
        ctx.fill();
        
        if (i === 0) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
          ctx.stroke();
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <AnalysisLayout>
        <div className="bg-white/80 backdrop-blur-md border border-stone-200 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden h-[400px]">
          <div className="absolute top-8 left-8 z-10 bg-white/60 p-4 rounded-xl backdrop-blur border border-stone-200 shadow-sm">
             <h3 className="font-bold text-stone-900 font-serif">Knowledge Graph</h3>
             <p className="text-xs text-stone-500 font-medium mt-1">Interactive literature map based on constraints.</p>
          </div>
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing opacity-80"
          />
        </div>
    </AnalysisLayout>
  );
}
