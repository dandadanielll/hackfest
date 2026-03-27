'use client';

import { useState, useRef, useEffect } from "react";
import { useLibrary } from "@/lib/libraryContext";
import { 
  ShieldAlert, Upload, FileText, Play, Flame, Trophy, XCircle, Heart, Zap, CirclePause
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { FaCheck } from "react-icons/fa6";

type PanelistId = "statistician" | "grammarian" | "methodologist";

type Message = {
  id: string;
  role: "system" | "panelist" | "user";
  panelistId?: PanelistId;
  content: string;
};

/* ────────────────────────────────────────────
   Panelist config – each maps to a region of
   the pixel.jpg sprite-sheet (3 chars in a row)
   ──────────────────────────────────────────── */
const PANELISTS: Record<PanelistId, {
  name: string; role: string; title: string;
  color: string; textColor: string;
  spriteX: string;          // object-position X
}> = {
  statistician: {
    name: "Dr. Cruz",
    role: "The Statistician",
    title: "LV 42  DATA BOSS",
    color: "bg-sky-500",
    textColor: "text-sky-600",
    spriteX: "0%",           // leftmost character
  },
  grammarian: {
    name: "Prof. Garcia",
    role: "The Grammarian",
    title: "LV 38  SYNTAX LORD",
    color: "bg-rose-700",
    textColor: "text-rose-700",
    spriteX: "50%",          // center character
  },
  methodologist: {
    name: "Dr. Santos",
    role: "The Methodologist",
    title: "LV 45  METHOD QUEEN",
    color: "bg-emerald-600",
    textColor: "text-emerald-600",
    spriteX: "100%",         // rightmost character
  },
};

/* ── Helper: Pokémon-style HP colour ── */
function hpColor(pct: number) {
  if (pct > 50) return "bg-emerald-400 shadow-emerald-400/60";
  if (pct > 20) return "bg-amber-400 shadow-amber-400/60";
  return "bg-red-500 shadow-red-500/60";
}

export default function DefendersPage() {
  const { folders } = useLibrary();

  /* state */
  const [gameState, setGameState] = useState<"setup" | "playing" | "gameover" | "victory">("setup");
  const [selectedNotebook, setSelectedNotebook] = useState({ folderId: "", notebookId: "" });
  const [pdfText, setPdfText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const [sizzle, setSizzle] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [activePanelist, setActivePanelist] = useState<PanelistId>("statistician");

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, isTyping]);

  /* ── file handling (unchanged) ── */
  const handleFileExtraction = async (file: File) => {
    if (file.type !== "application/pdf") return;
    setPdfName(file.name); setIsExtracting(true);
    setSelectedNotebook({ folderId: "", notebookId: "" });
    const fd = new FormData(); fd.append("file", file);
    try { const r = await fetch("/api/extract-pdf", { method: "POST", body: fd }); const d = await r.json(); if (d.text) setPdfText(d.text); } catch (e) { console.error(e); } finally { setIsExtracting(false); }
  };
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleFileExtraction(f); };

  /* ── AI: ask & evaluate (unchanged logic) ── */
  const askNextQuestion = async (paperText?: string, currentMessages?: Message[]) => {
    setIsTyping(true);
    const text = paperText || pdfText || "";
    const hist = currentMessages || messages;
    const keys = Object.keys(PANELISTS) as PanelistId[];
    const rp = keys[Math.floor(Math.random() * keys.length)];
    setActivePanelist(rp);
    const roleName = PANELISTS[rp].role;
    try {
      const histStr = hist.map(m => m.role === "system" ? `[System]: ${m.content}` : m.role === "panelist" ? `[${PANELISTS[m.panelistId!]?.role}]: ${m.content}` : `[Student]: ${m.content}`).join("\n\n");
      const res = await fetch("/api/defenders/question", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, panelistRole: roleName, history: histStr }) });
      const data = await res.json();
      if (data.question) { setCurrentQuestion(data.question); setMessages(prev => [...prev, { id: `q-${Date.now()}`, role: "panelist", panelistId: rp, content: data.question }]); }
    } catch { setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: "panelist", panelistId: rp, content: "Connection lost… but defend yourself!" }]); } finally { setIsTyping(false); }
  };

  const handleSendAnswer = async () => {
    if (!inputValue.trim() || isTyping || gameState !== "playing") return;
    const ans = inputValue.trim(); setInputValue("");
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content: ans }]);
    setIsTyping(true);
    const last = messages[messages.length - 1];
    const pId = last.role === "panelist" ? last.panelistId! : "statistician";
    try {
      const res = await fetch("/api/defenders/evaluate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: pdfText, panelistRole: PANELISTS[pId].role, question: currentQuestion, answer: ans }) });
      const data = await res.json();
      const heat = data.heatIncrease || 15;
      setSizzle(prev => Math.min(100, prev + heat));
      const reaction: Message = { id: `a-${Date.now()}`, role: "panelist", panelistId: pId, content: data.reaction || "…" };
      const newMsgs = [...messages, { id: `u2-${Date.now()}`, role: "user" as const, content: ans }, reaction];
      setMessages(newMsgs);
      const nq = questionCount + 1; setQuestionCount(nq);
      if (sizzle + heat >= 100) setGameState("gameover");
      else if (nq >= 5) setGameState("victory");
      else setTimeout(() => askNextQuestion(pdfText, newMsgs), 1500);
    } catch { } finally { setIsTyping(false); }
  };

  const startGame = () => {
    let text = pdfText;
    if (!text && selectedNotebook.folderId && selectedNotebook.notebookId) {
      const f = folders.find(x => x.id === selectedNotebook.folderId);
      const nb = f?.notebooks?.find(x => x.id === selectedNotebook.notebookId);
      if (nb?.content) { text = nb.content.replace(/<[^>]+>/g, " "); setPdfText(text); }
    }
    if (!text) return;
    setGameState("playing"); setSizzle(0); setQuestionCount(0);
    setMessages([{ id: "sys", role: "system", content: "A wild PANELIST appeared!" }]);
    askNextQuestion(text);
  };

  const yourHp = Math.max(0, 100 - sizzle);

  /* ═══════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════ */
  return (
    <main className="min-h-screen w-full bg-[#f8f0e3] flex flex-col items-center font-mono select-none overflow-x-hidden">

      {/* ── SETUP SCREEN ── */}
      {gameState === "setup" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-3xl p-6 md:p-10 flex flex-col items-center gap-10 mt-12">

          {/* Title */}
          <div className="text-center space-y-4">
            <h1 className="text-5xl md:text-7xl font-black text-[#521118] uppercase leading-none tracking-tighter" style={{ textShadow: "4px 4px 0 #2b090d" }}>
              Thesis<br />Defenders
            </h1>
            <span className="inline-block bg-[#2b090d] text-[#f8f0e3] px-4 py-1 text-sm font-black uppercase tracking-widest">Gisado Edition</span>
          </div>

          {/* 3 Pixelated Characters Preview */}
          <div className="relative w-full max-w-md aspect-[3/2] rounded-lg overflow-hidden border-[6px] border-[#2b090d] shadow-[8px_8px_0_#2b090d] bg-[#f8f0e3]">
            <div className="absolute inset-0 flex items-end justify-center pb-2">
              {(["statistician", "grammarian", "methodologist"] as PanelistId[]).map((id, i) => (
                <motion.div
                  key={id}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.3, ease: "easeInOut" }}
                  className="w-1/3 flex flex-col items-center"
                >
                  <div className="w-28 h-28 md:w-36 md:h-36 relative overflow-hidden" style={{ imageRendering: "pixelated" }}>
                    <img
                      src="/pixel.jpg"
                      alt={PANELISTS[id].name}
                      className="absolute h-full"
                      style={{
                        width: "300%",
                        left: id === "statistician" ? "4%" : id === "grammarian" ? "-96%" : "-196%",
                        objectFit: "cover",
                        imageRendering: "pixelated",
                      }}
                    />
                  </div>
                  <p className="text-[10px] font-black text-[#2b090d] uppercase tracking-wider mt-1">{PANELISTS[id].name}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Setup Form */}
          <div className="w-full bg-white border-[4px] border-[#2b090d] shadow-[8px_8px_0_#2b090d] p-8 space-y-6">
            <p className="text-xs font-black text-[#2b090d]/40 uppercase tracking-widest">Choose your weapon (paper)</p>

            <select
              className="w-full bg-[#f8f0e3] border-[3px] border-[#2b090d] p-4 text-sm font-black text-[#2b090d] outline-none"
              onChange={(e) => {
                const v = e.target.value; if (!v) { setSelectedNotebook({ folderId: "", notebookId: "" }); return; }
                const [fId, nId] = v.split("|"); setSelectedNotebook({ folderId: fId, notebookId: nId }); setPdfName("");
              }}
            >
              <option value="">[ SELECT NOTEBOOK ]</option>
              {folders.map(f => (<optgroup key={f.id} label={`📂 ${f.name}`}>{f.notebooks?.map(nb => (<option key={nb.id} value={`${f.id}|${nb.id}`}>⚡ {nb.name}</option>))}</optgroup>))}
            </select>

            <div className="flex items-center gap-4 opacity-30"><div className="h-px bg-black flex-1" /><span className="text-xs font-black">OR</span><div className="h-px bg-black flex-1" /></div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`w-full border-[3px] p-6 flex items-center gap-4 transition-all ${pdfName ? "border-emerald-600 bg-emerald-50 shadow-[4px_4px_0_#059669]" : "border-[#2b090d] bg-white shadow-[4px_4px_0_#2b090d] hover:bg-[#521118]/5 active:translate-x-1 active:translate-y-1 active:shadow-none"}`}
            >
              <input type="file" ref={fileInputRef} hidden accept="application/pdf" onChange={handleFileUpload} />
              <Upload size={28} className={pdfName ? "text-emerald-600" : "text-[#521118]"} />
              <div className="text-left">
                <p className="text-sm font-black uppercase">{isExtracting ? "READING PDF…" : pdfName || "UPLOAD PDF FILE"}</p>
                <p className="text-[10px] text-[#2b090d]/40 font-bold uppercase">Max 10 MB</p>
              </div>
            </button>
          </div>

          <button
            onClick={startGame}
            disabled={!pdfText && !selectedNotebook.notebookId}
            className="group w-full bg-[#521118] text-white border-[4px] border-[#2b090d] shadow-[8px_8px_0_#2b090d] p-6 font-black text-2xl uppercase flex items-center justify-center gap-4 hover:bg-[#6b1a23] active:translate-x-2 active:translate-y-2 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={32} fill="white" /> Start Battle
          </button>
        </motion.div>
      )}

      {/* ── BATTLE SCREEN (Pokémon-style) ── */}
      {gameState !== "setup" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-4xl flex flex-col h-screen">

          {/* ── Top: Battle Scene ── */}
          <div className="relative w-full h-[340px] md:h-[380px] bg-gradient-to-b from-[#c8dbbe] to-[#a8c090] border-b-[6px] border-[#2b090d] overflow-hidden shrink-0">
            {/* Ground lines */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#e8dcc8] to-transparent" />
            <svg className="absolute bottom-0 w-full" viewBox="0 0 800 40" preserveAspectRatio="none"><ellipse cx="600" cy="35" rx="160" ry="12" fill="#c4b89a" /><ellipse cx="180" cy="30" rx="140" ry="10" fill="#d4c8a8" /></svg>

            {/* ── Enemy (top-right) ── */}
            <div className="absolute top-6 right-6 md:right-12 flex flex-col items-end z-10">
              <div className="bg-[#f8f0e3] border-[3px] border-[#2b090d] shadow-[4px_4px_0_#2b090d] px-5 py-3 mb-3 min-w-[220px]">
                <div className="flex justify-between items-baseline">
                  <span className="font-black text-sm text-[#2b090d] uppercase">{PANELISTS[activePanelist].name}</span>
                  <span className="text-[10px] font-black text-[#2b090d]/40">{PANELISTS[activePanelist].title}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-600">HP</span>
                  <div className="flex-1 h-3 bg-[#2b090d]/10 border border-[#2b090d]/20 overflow-hidden">
                    <div className="h-full bg-emerald-400 transition-all duration-700" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Enemy sprite (top-right) */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="absolute top-20 right-16 md:right-28 w-32 h-32 md:w-44 md:h-44 overflow-hidden"
              style={{ imageRendering: "pixelated" }}
            >
              <img
                src="/pixel.jpg"
                alt={PANELISTS[activePanelist].name}
                className="absolute h-full"
                style={{
                  width: "300%",
                  left: activePanelist === "statistician" ? "4%" : activePanelist === "grammarian" ? "-96%" : "-196%",
                  objectFit: "cover",
                  imageRendering: "pixelated",
                }}
              />
            </motion.div>

            {/* ── Your stats (bottom-left) ── */}
            <div className="absolute bottom-6 left-6 md:left-12 z-10">
              <div className="bg-[#f8f0e3] border-[3px] border-[#2b090d] shadow-[4px_4px_0_#2b090d] px-5 py-3 min-w-[240px]">
                <div className="flex justify-between items-baseline">
                  <span className="font-black text-sm text-[#2b090d] uppercase">You (Defender)</span>
                  <span className="text-[10px] font-black text-[#2b090d]/40">LV 1</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] font-black text-amber-600">HP</span>
                  <div className="flex-1 h-3 bg-[#2b090d]/10 border border-[#2b090d]/20 overflow-hidden">
                    <motion.div
                      className={`h-full transition-all duration-700 ${hpColor(yourHp)}`}
                      animate={{ width: `${yourHp}%` }}
                    />
                  </div>
                </div>
                <p className="text-right text-[10px] font-black text-[#2b090d]/50 mt-1">{Math.round(yourHp)} / 100</p>
              </div>
            </div>

            {/* Player sprite placeholder (bottom-left, back view) */}
            <div className="absolute bottom-8 left-4 md:left-8 w-28 h-28 md:w-36 md:h-36 flex items-center justify-center opacity-60">
              <div className="w-20 h-20 bg-[#2b090d]/20 rounded-full flex items-center justify-center text-3xl">🎓</div>
            </div>

            {/* Round indicator */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#2b090d] text-[#f8f0e3] px-4 py-1 text-[10px] font-black uppercase tracking-widest">
              Round {Math.min(questionCount + 1, 5)} / 5
            </div>
          </div>

          {/* ── Bottom: Pokémon Dialogue Box ── */}
          <div className="flex-1 flex flex-col bg-[#f8f0e3] relative min-h-0">
            {/* Dialogue messages area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0" ref={scrollRef}>
              {messages.map((msg) => (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id}
                >
                  {msg.role === "system" ? (
                    <div className="bg-[#2b090d] text-[#f8f0e3] border-[3px] border-[#2b090d] p-4 text-center">
                      <p className="text-sm font-black uppercase tracking-wider">{msg.content}</p>
                    </div>
                  ) : msg.role === "panelist" ? (
                    <div className="bg-white border-[3px] border-[#2b090d] shadow-[4px_4px_0_#2b090d] p-5 relative">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 overflow-hidden border-2 border-[#2b090d] bg-[#f8f0e3]" style={{ imageRendering: "pixelated" }}>
                          <img
                            src="/pixel.jpg"
                            alt=""
                            className="h-full"
                            style={{
                              width: "300%",
                              marginLeft: msg.panelistId === "statistician" ? "4%" : msg.panelistId === "grammarian" ? "-96%" : "-196%",
                              objectFit: "cover",
                              imageRendering: "pixelated",
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${PANELISTS[msg.panelistId!].textColor}`}>
                          {PANELISTS[msg.panelistId!].role}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-[#2b090d] leading-relaxed">{msg.content}</p>
                      <div className="absolute bottom-2 right-3 animate-bounce text-[#2b090d]/30">▼</div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <div className="bg-[#521118] text-white border-[3px] border-[#2b090d] shadow-[4px_4px_0_#2b090d] p-5 max-w-[85%]">
                        <p className="text-[10px] font-black uppercase text-white/50 mb-1">Your answer</p>
                        <p className="text-sm font-bold leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              {isTyping && (
                <div className="bg-white border-[3px] border-[#2b090d] p-4 inline-flex gap-2 items-center">
                  {[0, 1, 2].map(i => <motion.div key={i} className="w-3 h-3 bg-[#2b090d]" animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} />)}
                </div>
              )}
            </div>

            {/* Input bar */}
            {gameState === "playing" && (
              <div className="shrink-0 p-4 bg-[#2b090d] border-t-[4px] border-black flex gap-3">
                <div className="flex-1 bg-black/60 border-[2px] border-white/20 p-3">
                  <input
                    className="w-full bg-transparent text-white placeholder:text-white/30 outline-none font-black text-sm"
                    placeholder="TYPE YOUR DEFENSE…"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendAnswer(); }}
                  />
                </div>
                <button
                  onClick={handleSendAnswer}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-emerald-500 text-white font-black uppercase tracking-widest px-6 border-[2px] border-black active:translate-y-1 disabled:opacity-40 transition text-sm"
                >
                  FIGHT
                </button>
              </div>
            )}
          </div>

          {/* ── Game Over / Victory Overlay ── */}
          <AnimatePresence>
            {(gameState === "gameover" || gameState === "victory") && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-6"
              >
                <motion.div
                  initial={{ scale: 0.8, y: 40 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-[#f8f0e3] border-[8px] border-[#2b090d] shadow-[16px_16px_0_#2b090d] p-12 text-center max-w-lg w-full"
                >
                  {gameState === "victory" ? (
                    <>
                      <Trophy size={64} className="mx-auto text-amber-500 mb-4" />
                      <h2 className="text-5xl font-black text-emerald-600 uppercase mb-4" style={{ textShadow: "3px 3px 0 #064e3b" }}>YOU WIN!</h2>
                      <p className="text-sm font-black text-[#2b090d]/60 uppercase leading-relaxed mb-8">
                        Congrats, Defender! You survived the panel. Your thesis lives another day.
                      </p>
                    </>
                  ) : (
                    <>
                      <XCircle size={64} className="mx-auto text-red-500 mb-4" />
                      <h2 className="text-5xl font-black text-red-500 uppercase mb-4" style={{ textShadow: "3px 3px 0 #7f1d1d" }}>GISADO!</h2>
                      <p className="text-sm font-black text-[#2b090d]/60 uppercase leading-relaxed mb-8">
                        The panel has roasted your thesis. You have been cooked. Try again!
                      </p>
                    </>
                  )}
                  <button
                    onClick={() => setGameState("setup")}
                    className={`w-full py-5 font-black uppercase text-xl border-[4px] border-[#2b090d] shadow-[6px_6px_0_#2b090d] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all ${gameState === "victory" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    {gameState === "victory" ? "PLAY AGAIN" : "RETRY"}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </main>
  );
}
