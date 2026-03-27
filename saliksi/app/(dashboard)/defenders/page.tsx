"use client";

import { useState, useRef } from "react";
import { useLibrary } from "@/lib/libraryContext";
import { ChevronRight, ShieldAlert, Upload, FileText, Play, Flame, User, Info, Trophy, XCircle } from "lucide-react";
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

const PANELISTS = {
  statistician: { name: "Dr. Cruz", role: "The Statistician", color: "bg-blue-500", textColor: "text-blue-600", icon: "📊" },
  grammarian: { name: "Prof. Garcia", role: "The Grammarian", color: "bg-emerald-600", textColor: "text-emerald-700", icon: "✍️" },
  methodologist: { name: "Dr. Santos", role: "The Methodology Master", color: "bg-purple-600", textColor: "text-purple-700", icon: "🔬" }
};

export default function DefendersPage() {
  const { folders } = useLibrary();
  
  const [gameState, setGameState] = useState<"setup" | "playing" | "gameover" | "victory">("setup");
  const [selectedNotebook, setSelectedNotebook] = useState<{folderId: string, notebookId: string}>({ folderId: "", notebookId: "" });
  const [pdfText, setPdfText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [sizzle, setSizzle] = useState(0); 
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileExtraction = async (file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }

    setPdfName(file.name);
    setIsExtracting(true);
    setSelectedNotebook({ folderId: "", notebookId: "" });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/extract-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.text) {
        setPdfText(data.text);
      } else {
        alert("Could not extract text from this PDF.");
        setPdfName("");
      }
    } catch (err) {
      console.error(err);
      alert("Error extracting PDF.");
      setPdfName("");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileExtraction(file);
  };

  const [currentQuestion, setCurrentQuestion] = useState("");

  const askNextQuestion = async (paperText?: string, currentMessages?: Message[]) => {
    setIsTyping(true);
    const textToUse = paperText || pdfText || ""; // We might need to fetch notebook text if selectedNotebook is used
    const historyMsgs = currentMessages || messages;
    
    // Pick a random panelist
    const panelistKeys = Object.keys(PANELISTS) as PanelistId[];
    const randomPanelist = panelistKeys[Math.floor(Math.random() * panelistKeys.length)];
    const roleName = PANELISTS[randomPanelist].role;

    try {
      const historyStr = historyMsgs.map(m => {
        if (m.role === 'system') return `[System]: ${m.content}`;
        if (m.role === 'panelist') return `[${PANELISTS[m.panelistId!]?.role || 'Panelist'}]: ${m.content}`;
        return `[Student]: ${m.content}`;
      }).join('\n\n');

      const res = await fetch("/api/defenders/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: textToUse, 
          panelistRole: roleName,
          history: historyStr
        })
      });
      const data = await res.json();
      
      if (data.question) {
        setCurrentQuestion(data.question);
        setMessages(prev => [...prev, {
          id: `q-${Date.now()}`,
          role: "panelist",
          panelistId: randomPanelist,
          content: data.question
        }]);
      } else {
        throw new Error("No question returned");
      }
    } catch (err) {
      console.error(err);
      setCurrentQuestion("Could you elaborate on the theoretical framework used in this study?");
      setMessages(prev => [...prev, {
        id: `q-${Date.now()}`,
        role: "panelist",
        panelistId: randomPanelist,
        content: "We are having technical difficulties. Could you elaborate on the theoretical framework used in this study?"
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendAnswer = async () => {
    if (!inputValue.trim() || isTyping || gameState !== "playing") return;
    const userAns = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content: userAns }]);
    setIsTyping(true);
    
    const lastMsg = messages[messages.length - 1];
    const pId = lastMsg.role === "panelist" ? lastMsg.panelistId : "statistician";
    const roleName = pId ? PANELISTS[pId].role : "The Statistician";
    
    try {
      const res = await fetch("/api/defenders/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: pdfText, // TODO: support notebook text 
          panelistRole: roleName,
          question: currentQuestion,
          answer: userAns
        })
      });
      const data = await res.json();
      
      const heatIncrease = data.heatIncrease || 0;
      setSizzle(prev => Math.min(100, prev + heatIncrease));
      
      const reactionMsg: Message = {
        id: `a-${Date.now()}`,
        role: "panelist",
        panelistId: pId,
        content: data.reaction || "I see. Let's move on."
      };
      
      const newMessages = [...messages, { id: `u-${Date.now()}`, role: "user" as const, content: userAns }, reactionMsg];
      setMessages(newMessages);
      
      const nextQuestionCount = questionCount + 1;
      setQuestionCount(nextQuestionCount);

      if (sizzle + heatIncrease >= 100) {
        setGameState("gameover");
        setIsTyping(false);
      } else if (nextQuestionCount >= 5) {
        setGameState("victory");
        setIsTyping(false);
      } else {
        // Next question
        setTimeout(() => askNextQuestion(pdfText, newMessages), 2000);
      }
    } catch (err) {
      console.error(err);
      setIsTyping(false);
    }
  };

  const startGame = () => {
    let textToUse = pdfText;
    
    if (!textToUse && selectedNotebook.folderId && selectedNotebook.notebookId) {
      // Find notebook content
      const folder = folders.find(f => f.id === selectedNotebook.folderId);
      const nb = folder?.notebooks?.find(n => n.id === selectedNotebook.notebookId);
      if (nb && nb.content) {
        // strip HTML if it's rich text
        textToUse = nb.content.replace(/<[^>]+>/g, ' ');
        setPdfText(textToUse); // store for the game session
      } else {
        alert("Selected notebook is empty.");
        return;
      }
    }
    
    if (!textToUse) {
      alert("Please select a notebook with content or upload a PDF first.");
      return;
    }
    
    setGameState("playing");
    setSizzle(0);
    setQuestionCount(0);
    setMessages([{
      id: "sys-1",
      role: "system",
      content: "Welcome to your Thesis Defense. The panelists have reviewed your paper and are ready to begin. Survive 5 questions without the Sizzle meter hitting 100%!"
    }]);
    askNextQuestion(textToUse);
  };

  return (
    <main className="min-h-screen w-full bg-[#f8f6f4] flex flex-col font-sans relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 relative z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#521118] to-[#8a1c28] flex items-center justify-center shadow-lg shadow-[#521118]/20">
            <ShieldAlert className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#2b090d] tracking-tight font-serif flex items-center gap-3">
              Thesis Defenders <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold uppercase tracking-widest border border-rose-200 block drop-shadow-sm">Gisado Edition</span>
            </h1>
            <p className="text-sm font-medium text-[#2b090d]/50 mt-1">Face the AI Panel. Defend your research. Don't get cooked.</p>
          </div>
        </div>

        {gameState === "setup" && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col md:flex-row gap-8 items-start"
          >
            {/* Left: Document Selection */}
            <div className="w-full md:w-1/2 flex flex-col gap-6">
              <div className="bg-white p-6 rounded-3xl border border-[#2b090d]/5 shadow-sm">
                <h2 className="text-lg font-bold text-[#2b090d] flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-[#521118]/10 text-[#521118] flex items-center justify-center text-xs">1</span>
                  Choose your Weapon (Paper)
                </h2>
                
                <div className="space-y-4">
                  {/* Option A: Library Notebook */}
                  <div className="border border-[#2b090d]/10 rounded-2xl p-4 overflow-hidden relative group transition-all hover:border-[#521118]/30">
                    <h3 className="text-xs font-black uppercase tracking-widest text-[#2b090d]/40 mb-3 flex items-center gap-2">
                      <FileText size={14} /> From Library Notebooks
                    </h3>
                    <select 
                      className="w-full bg-[#f8f6f4] border border-[#2b090d]/10 rounded-xl px-4 py-3 text-sm font-medium text-[#2b090d] outline-none focus:border-[#521118]/50 transition-colors"
                      value={`${selectedNotebook.folderId}|${selectedNotebook.notebookId}`}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setSelectedNotebook({ folderId: "", notebookId: "" });
                          return;
                        }
                        const [fId, nId] = val.split("|");
                        setSelectedNotebook({ folderId: fId, notebookId: nId });
                        setPdfName("");
                        setPdfText("");
                      }}
                    >
                      <option value="">-- Select a notebook --</option>
                      {folders.map(f => (
                        <optgroup key={f.id} label={f.name}>
                          {f.notebooks?.map(nb => (
                            <option key={nb.id} value={`${f.id}|${nb.id}`}>
                              {nb.name || "Untitled"}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-4 py-2">
                    <div className="h-px bg-[#2b090d]/10 flex-1" />
                    <span className="text-xs font-bold text-[#2b090d]/30 uppercase tracking-widest">OR</span>
                    <div className="h-px bg-[#2b090d]/10 flex-1" />
                  </div>

                  {/* Option B: PDF Upload */}
                  <div className={`border rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group ${isDragging ? 'border-[#521118]/80 bg-[#521118]/10 scale-[1.02]' : pdfName ? 'border-[#521118]/40 bg-[#521118]/5' : 'border-[#2b090d]/10 border-dashed hover:border-[#521118]/30 hover:bg-[#521118]/[0.02]'}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleFileExtraction(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                    
                    {isExtracting ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-3 border-[#521118]/20 border-t-[#521118] rounded-full animate-spin" />
                        <p className="text-sm font-bold text-[#521118]">Reading PDF...</p>
                      </div>
                    ) : pdfName ? (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-[#521118]/10 text-[#521118] flex items-center justify-center">
                          <FaCheck size={18} />
                        </div>
                        <p className="text-sm font-bold text-[#2b090d] break-all">{pdfName}</p>
                        <p className="text-xs text-[#521118] font-medium hover:underline mt-1">Upload a different file</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Upload size={24} className="text-[#521118]" />
                        <div>
                          <p className="text-sm font-bold text-[#2b090d]">Upload PDF Paper</p>
                          <p className="text-xs text-[#2b090d]/60 mt-0.5">Max 10MB. Must be text-searchable.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={startGame}
                disabled={(!pdfText && !selectedNotebook.notebookId) || isExtracting}
                className="w-full bg-[#521118] text-[#e8e4df] rounded-2xl py-5 flex items-center justify-center gap-3 font-black uppercase tracking-widest shadow-xl shadow-[#521118]/20 hover:bg-[#2b090d] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 active:translate-y-0"
              >
                Face The Panel <Play size={18} fill="currentColor" />
              </button>
            </div>

            {/* Right: How to Play */}
            <div className="w-full md:w-1/2 bg-[#521118] rounded-3xl p-8 text-[#e8e4df] shadow-2xl relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] opacity-5 text-white">
                <ShieldAlert size={400} />
              </div>
              <h2 className="text-2xl font-black font-serif mb-6 flex items-center gap-3 relative z-10">
                <Info size={24} className="text-rose-300" /> How to Play
              </h2>
              <ul className="space-y-6 relative z-10">
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-rose-200">1</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Select your study</h3>
                    <p className="text-sm text-white/70 leading-relaxed">Provide your finalized research paper so the AI Panel can analyze its methodology, literature, and conclusions.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 font-bold text-rose-200">2</div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Answer the Panel</h3>
                    <p className="text-sm text-white/70 leading-relaxed">Three distinct panelists (The Statistician, The Grammarian, and The Methodology Master) will take turns grilling you with highly specific questions.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0 font-bold text-rose-300">
                    <Flame size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-rose-300 mb-1">Watch the Sizzle Meter</h3>
                    <p className="text-sm text-white/70 leading-relaxed">Weak, vague, or incorrect answers will increase your Sizzle. If the meter hits 100%, you get <strong>"Gisado"</strong> (Failed). Keep it cool to pass!</p>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>
        )}

        {/* Game Area */}
        {gameState !== "setup" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col md:flex-row gap-6 h-full max-h-[80vh]"
          >
            {/* Left: Chat UI */}
            <div className="w-full md:w-2/3 bg-white rounded-3xl border border-[#2b090d]/5 shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 border-b border-[#2b090d]/5 bg-[#f8f6f4] flex items-center justify-between">
                <h2 className="font-bold text-[#2b090d] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Live Defense
                </h2>
                <span className="text-xs font-bold uppercase tracking-widest text-[#2b090d]/40">Question {questionCount + 1} / 5</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                {messages.map((msg) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id} 
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "system" && (
                      <div className="w-full text-center">
                        <span className="inline-block bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200 shadow-sm">
                          {msg.content}
                        </span>
                      </div>
                    )}
                    {msg.role === "panelist" && msg.panelistId && (
                      <div className="flex gap-3 max-w-[85%]">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm text-white ${PANELISTS[msg.panelistId].color}`}>
                          <span className="text-lg">{PANELISTS[msg.panelistId].icon}</span>
                        </div>
                        <div className="flex flex-col items-start gap-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${PANELISTS[msg.panelistId].textColor}`}>
                            {PANELISTS[msg.panelistId].role}
                          </span>
                          <div className="bg-[#f8f6f4] border border-[#2b090d]/10 text-[#2b090d] p-4 rounded-2xl rounded-tl-sm text-sm shadow-sm leading-relaxed">
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    )}
                    {msg.role === "user" && (
                      <div className="flex flex-col items-end gap-1 max-w-[85%]">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#521118]/40">You (The Researcher)</span>
                        <div className="bg-[#521118] text-[#e8e4df] p-4 rounded-2xl rounded-tr-sm text-sm shadow-md leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center shrink-0 animate-pulse" />
                    <div className="bg-[#f8f6f4] p-4 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-stone-400 animate-bounce delay-75" />
                      <div className="w-2 h-2 rounded-full bg-stone-400 animate-bounce delay-150" />
                    </div>
                  </div>
                )}
              </div>

              {gameState === "playing" && (
                <div className="p-4 bg-white border-t border-[#2b090d]/5">
                  <div className="flex items-end gap-3 rounded-2xl bg-[#f8f6f4] border border-[#2b090d]/10 p-2 focus-within:border-[#521118]/40 focus-within:ring-2 focus-within:ring-[#521118]/10 transition-all">
                    <textarea 
                      className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none outline-none p-3 text-sm text-[#2b090d] placeholder:text-[#2b090d]/30"
                      placeholder="Type your brilliant defense..."
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendAnswer();
                        }
                      }}
                    />
                    <button 
                      onClick={handleSendAnswer}
                      disabled={!inputValue.trim() || isTyping}
                      className="p-3 bg-[#521118] text-white rounded-xl shadow-md hover:bg-[#2b090d] transition-all disabled:opacity-50 active:scale-95 mb-1 mr-1"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Sizzle Meter & PanelStatus */}
            <div className="w-full md:w-1/3 flex flex-col gap-6">
              <div className="bg-white rounded-3xl p-6 border border-[#2b090d]/5 shadow-sm">
                <h3 className="text-lg font-black text-[#2b090d] flex items-center gap-2 mb-6 font-serif tracking-tight">
                  <Flame className={sizzle > 80 ? "text-red-600 animate-pulse" : sizzle > 50 ? "text-orange-500" : "text-amber-400"} size={22} fill="currentColor" /> 
                  The Sizzle Meter
                </h3>
                
                {/* Sizzle Bar */}
                <div className="h-8 w-full bg-stone-100 rounded-full overflow-hidden relative shadow-inner border border-stone-200">
                  <motion.div 
                    className={`absolute top-0 left-0 h-full ${sizzle > 80 ? 'bg-red-500' : sizzle > 50 ? 'bg-orange-400' : 'bg-amber-300'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${sizzle}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 1 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center font-black text-xs text-white drop-shadow-md z-10 tracking-widest">
                    {Math.round(sizzle)}% HEAT
                  </div>
                </div>
                <p className="text-xs text-center text-[#2b090d]/40 mt-3 font-bold uppercase tracking-widest">If it reaches 100%, you are Gisado!</p>

                {gameState === "gameover" && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-center">
                    <XCircle size={32} className="text-red-600 mx-auto mb-2" />
                    <h4 className="font-black text-red-900 text-lg">GISADO!</h4>
                    <p className="text-xs text-red-700 font-medium">The panel roasted your thesis. Better luck next time.</p>
                    <button onClick={() => setGameState("setup")} className="mt-4 text-xs font-bold bg-red-600 text-white px-4 py-2 rounded-lg py-hover:bg-red-700 transition">Try Again</button>
                  </div>
                )}
                
                {gameState === "victory" && (
                  <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                    <Trophy size={32} className="text-emerald-600 mx-auto mb-2" />
                    <h4 className="font-black text-emerald-900 text-lg">DEFENSE PASSED!</h4>
                    <p className="text-xs text-emerald-700 font-medium">Congratulations! You survived the panel with flying colors.</p>
                    <button onClick={() => setGameState("setup")} className="mt-4 text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg py-hover:bg-emerald-700 transition">Defend Another Paper</button>
                  </div>
                )}
              </div>

              {/* Panelist Roster */}
              <div className="bg-white rounded-3xl p-6 border border-[#2b090d]/5 shadow-sm flex-1">
                <h3 className="text-sm font-black text-[#2b090d]/50 uppercase tracking-widest mb-4">The Panelists</h3>
                <div className="space-y-4">
                  {Object.entries(PANELISTS).map(([id, panelist]) => (
                    <div key={id} className="flex gap-3 items-center p-3 rounded-2xl bg-[#f8f6f4] border border-[#2b090d]/5 transition-all hover:border-[#2b090d]/10">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0 ${panelist.color}`}>
                        <span className="text-xl">{panelist.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-[#2b090d] text-sm">{panelist.name}</h4>
                        <p className={`text-xs font-black uppercase tracking-widest ${panelist.textColor}`}>{panelist.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
