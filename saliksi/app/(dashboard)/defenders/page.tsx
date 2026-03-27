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

/* ── Panelist config with individual sprite PNGs ── */
const PANELISTS: Record<PanelistId, {
  name: string; role: string; title: string;
  color: string; textColor: string;
  sprite: string;
}> = {
  statistician: {
    name: "Dr. Cruz",
    role: "The Statistician",
    title: "LV 42  DATA BOSS",
    color: "bg-sky-500",
    textColor: "text-sky-600",
    sprite: "/prof2.png",
  },
  grammarian: {
    name: "Prof. Garcia",
    role: "The Grammarian",
    title: "LV 38  SYNTAX LORD",
    color: "bg-rose-700",
    textColor: "text-rose-700",
    sprite: "/prof.png",
  },
  methodologist: {
    name: "Dr. Santos",
    role: "The Methodologist",
    title: "LV 45  METHOD QUEEN",
    color: "bg-emerald-600",
    textColor: "text-emerald-600",
    sprite: "/nurse.png",
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

  const [showWeaponModal, setShowWeaponModal] = useState(false);

  const startGame = () => {
    let text = pdfText;
    if (!text && selectedNotebook.folderId && selectedNotebook.notebookId) {
      const f = folders.find(x => x.id === selectedNotebook.folderId);
      const nb = f?.notebooks?.find(x => x.id === selectedNotebook.notebookId);
      if (nb?.content) { text = nb.content.replace(/<[^>]+>/g, " "); setPdfText(text); }
    }
    if (!text) return;
    setShowWeaponModal(false);
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

      {/* ── TITLE SCREEN ── */}
      {gameState === "setup" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-3xl p-6 md:p-10 flex flex-col items-center justify-center gap-10 min-h-[calc(100vh-4rem)]">

          {/* Title */}
          <div className="text-center space-y-6">
            <h1 className="text-8xl md:text-[10rem] font-black text-[#521118] uppercase leading-[0.85] tracking-tighter" style={{ textShadow: "6px 6px 0 #2b090d" }}>
              Thesis<br />Defenders
            </h1>
            <span className="inline-block bg-[#2b090d] text-[#f8f0e3] px-6 py-2 text-base font-black uppercase tracking-widest">Gisado Edition</span>
          </div>


          {/* START GAME button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97, y: 4 }}
            onClick={() => setShowWeaponModal(true)}
            className="w-full max-w-md bg-[#521118] text-white border-[4px] border-[#2b090d] shadow-[8px_8px_0_#2b090d] p-6 font-black text-3xl uppercase flex items-center justify-center gap-4 hover:bg-[#6b1a23] active:shadow-none transition-all"
          >
            <Play size={32} fill="white" /> Start Game
          </motion.button>

          <p className="text-[10px] font-black text-[#2b090d]/30 uppercase tracking-widest">Press to begin your defense</p>
        </motion.div>
      )}

      {/* ── WEAPON SELECTION MODAL ── */}
      <AnimatePresence>
        {showWeaponModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWeaponModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="relative bg-[#f8f0e3] border-[6px] border-[#2b090d] shadow-[12px_12px_0_#2b090d] w-full max-w-lg p-10 space-y-6"
            >
              <h2 className="text-2xl font-black text-[#2b090d] uppercase text-center tracking-tight" style={{ textShadow: "2px 2px 0 rgba(43,9,13,0.15)" }}>Choose Your Weapon</h2>
              <p className="text-[10px] font-black text-[#2b090d]/40 uppercase tracking-widest text-center">Select a paper to defend</p>

              <select
                className="w-full bg-white border-[3px] border-[#2b090d] p-4 text-sm font-black text-[#2b090d] outline-none"
                onChange={(e) => {
                  const v = e.target.value; if (!v) { setSelectedNotebook({ folderId: "", notebookId: "" }); return; }
                  const [fId, nId] = v.split("|"); setSelectedNotebook({ folderId: fId, notebookId: nId }); setPdfName(""); setPdfText("");
                }}
              >
                <option value="">[ SELECT NOTEBOOK ]</option>
                {folders.map(f => (<optgroup key={f.id} label={`📂 ${f.name}`}>{f.notebooks?.map(nb => (<option key={nb.id} value={`${f.id}|${nb.id}`}>⚡ {nb.name}</option>))}</optgroup>))}
              </select>

              <div className="flex items-center gap-4 opacity-30"><div className="h-px bg-black flex-1" /><span className="text-xs font-black">OR</span><div className="h-px bg-black flex-1" /></div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-[3px] p-5 flex items-center gap-4 transition-all ${pdfName ? "border-emerald-600 bg-emerald-50 shadow-[4px_4px_0_#059669]" : "border-[#2b090d] bg-white shadow-[4px_4px_0_#2b090d] hover:bg-[#521118]/5 active:translate-x-1 active:translate-y-1 active:shadow-none"}`}
              >
                <input type="file" ref={fileInputRef} hidden accept="application/pdf" onChange={handleFileUpload} />
                <Upload size={24} className={pdfName ? "text-emerald-600" : "text-[#521118]"} />
                <div className="text-left">
                  <p className="text-sm font-black uppercase">{isExtracting ? "READING PDF…" : pdfName || "UPLOAD PDF FILE"}</p>
                  <p className="text-[10px] text-[#2b090d]/40 font-bold uppercase">Max 10 MB</p>
                </div>
              </button>

              <button
                onClick={startGame}
                disabled={!pdfText && !selectedNotebook.notebookId}
                className="w-full bg-emerald-500 text-white border-[4px] border-[#2b090d] shadow-[6px_6px_0_#2b090d] p-5 font-black text-xl uppercase flex items-center justify-center gap-3 hover:bg-emerald-400 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap size={24} /> Start Battle
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── BATTLE SCREEN (Pokémon-style) ── */}
      {gameState !== "setup" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col h-screen">

          {/* ── Top: Battle Scene ── */}
          <div className="relative w-full h-[320px] md:h-[360px] bg-gradient-to-b from-[#c8dbbe] via-[#b8cfa8] to-[#a8c090] border-b-[6px] border-[#2b090d] overflow-hidden shrink-0">
            {/* Ground */}
            <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#e8dcc8] to-transparent" />
            <svg className="absolute bottom-0 w-full" viewBox="0 0 1200 50" preserveAspectRatio="none">
              <ellipse cx="900" cy="42" rx="200" ry="16" fill="#c4b89a" />
              <ellipse cx="250" cy="38" rx="180" ry="14" fill="#d4c8a8" />
            </svg>

            {/* ── Enemy HUD (top-left) ── */}
            <div className="absolute top-6 left-6 md:left-10 z-10">
              <div className="bg-[#f8f0e3] border-[3px] border-[#2b090d] shadow-[4px_4px_0_#2b090d] px-5 py-3 min-w-[240px]">
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

            {/* Player sprite (top-right) */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, delay: 0.2, ease: "easeInOut" }}
              className="absolute top-10 right-[10%] md:right-[15%] w-40 h-40 md:w-52 md:h-52"
            >
              <img
                src="/user.png"
                alt="You (Defender)"
                className="w-full h-full object-contain drop-shadow-lg"
                style={{ imageRendering: "pixelated" }}
              />
            </motion.div>

            {/* ── Your HUD (bottom-right) ── */}
            <div className="absolute bottom-6 right-6 md:right-10 z-10">
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

            {/* Enemy sprite (bottom-left) */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="absolute bottom-4 left-[8%] md:left-[12%] w-36 h-36 md:w-48 md:h-48"
            >
              <img
                src={PANELISTS[activePanelist].sprite}
                alt={PANELISTS[activePanelist].name}
                className="w-full h-full object-contain drop-shadow-lg"
                style={{ imageRendering: "pixelated" }}
              />
            </motion.div>

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
                        <div className="w-10 h-10 overflow-hidden border-2 border-[#2b090d] bg-[#f8f0e3] flex items-center justify-center">
                          <img
                            src={PANELISTS[msg.panelistId!].sprite}
                            alt=""
                            className="w-full h-full object-contain"
                            style={{ imageRendering: "pixelated" }}
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
