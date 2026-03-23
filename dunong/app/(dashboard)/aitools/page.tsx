"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RiGeminiLine } from "react-icons/ri";
import {
    Zap, AlertTriangle, GitGraph, Upload, X,
    ChevronDown, ChevronUp, Loader2, RefreshCw,
    BookOpen, FolderOpen, CheckSquare, Square,
    ExternalLink, Quote, Sparkles, ShieldCheck,
    FileText, Bookmark, BookmarkCheck,
    ChevronRight,
} from "lucide-react";
import { useLibrary } from "@/lib/libraryContext";
import { useDevMode } from "@/lib/devModeContext";
import { getStoredFolders, type Folder } from "@/lib/libraryStore";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────

interface Source {
    id: string;
    title: string;
    authors: string;
    year: string;
    journal: string;
    abstract: string;
    credibility?: number;
    localSource?: boolean;
    openAccess?: boolean;
    url?: string;
    source?: string;
    fromFolder?: string;
}

interface SynthesisResult {
    commonFindings: string;
    contradictions: string;
    gaps: string;
    overallSynthesis: string;
}

interface GapResult {
    title: string;
    severity: "CRITICAL" | "SIGNIFICANT";
    description: string;
}

interface GraphNode {
    id: string;
    label: string;
    type: "paper" | "concept" | "author" | "region";
    x: number;
    y: number;
    connections: string[];
}

interface GraphData {
    nodes: GraphNode[];
    edges: { from: string; to: string; label: string }[];
}

type Tool = "synthesis" | "gaps" | "graph" | "contradiction";

// ── PDF extraction ─────────────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
    try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
        ).toString();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const maxPages = Math.min(pdf.numPages, 6);
        const parts: string[] = [];
        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            parts.push(content.items.map((item: unknown) => ((item as { str?: string }).str ?? "")).join(" "));
        }
        return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, 3000);
    } catch {
        return "";
    }
}

// ── Credibility color helper ───────────────────────────────────────────────

function credColor(score?: number) {
    if (!score) return "text-[#521118]/40 bg-[#521118]/5 border-[#521118]/10";
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-rose-700 bg-rose-50 border-rose-200";
}

// ── Source Card (matches search engine style) ──────────────────────────────

function SourceCard({
    source,
    index,
    selected,
    onToggle,
    showCheckbox = true,
}: {
    source: Source;
    index?: number;
    selected?: boolean;
    onToggle?: () => void;
    showCheckbox?: boolean;
}) {
    return (
        <div className="bg-white/80 backdrop-blur-sm border border-[#2b090d]/10 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#521118]/20 transition-all">
            <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                            {index !== undefined && (
                                <span className="text-xs font-bold text-rose-800">[{index + 1}]</span>
                            )}
                            {source.localSource && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                    {source.source || "Local"}
                                </span>
                            )}
                            {source.openAccess && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Open Access
                                </span>
                            )}
                            {source.credibility && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${credColor(source.credibility)}`}>
                                    {source.credibility}/100
                                </span>
                            )}
                            {source.fromFolder && (
                                <span className="text-xs text-stone-400 font-medium">{source.fromFolder}</span>
                            )}
                        </div>
                        <div className="text-left font-bold text-[#2b090d] text-base leading-tight font-serif">
                            {source.title}
                        </div>
                        <p className="text-[10px] text-[#521118]/40 font-bold uppercase tracking-wider mt-1.5 leading-none">
                            {source.authors} · {source.journal} · {source.year}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {showCheckbox && onToggle && (
                            <button
                                onClick={onToggle}
                                className={`p-2 rounded-xl border transition-all ${selected
                                    ? "bg-amber-50 border-amber-300 text-amber-700"
                                    : "bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-700"
                                    }`}
                                title={selected ? "Remove from selection" : "Add to selection"}
                            >
                                {selected ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Tool Banner ────────────────────────────────────────────────────────────

function ToolBanner({
    tool,
    sources,
}: {
    tool: Tool;
    sources: Source[];
}) {
    if (tool === "synthesis") return <SynthesisBanner sources={sources} />;
    if (tool === "gaps") return <GapsBanner sources={sources} />;
    if (tool === "graph") return <GraphBanner sources={sources} />;
    if (tool === "contradiction") return <ContradictionBanner sources={sources} />;
    return null;
}

// ── Synthesis Banner ───────────────────────────────────────────────────────

function SynthesisBanner({ sources }: {
    sources: Source[];
}) {
    const { addLog, startLogGroup } = useDevMode();
    const [result, setResult] = useState<SynthesisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const run = useCallback(async () => {
        setLoading(true); setError(""); setResult(null);
        const sourceName = "Systematic Review";
        const groupId = startLogGroup("/aitools", "Performing Systematic Review", sourceName);
        addLog(`Initiating Systematic Review algorithm for ${sources.length} sources...`, groupId);
        addLog(`Aggregating cross-references and detecting thematic overlaps...`, groupId);
        try {
            const res = await fetch("/api/synthesis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articles: sources }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            addLog(`Systematic Review completed successfully. Found commonalities and gap indicators.`, groupId);
            setResult(data);

        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : "Failed to synthesize.";
            addLog(`Systematic Review aborted: ${errMsg}`, groupId);
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    }, [sources, addLog]);

    const startedRef = useRef(false);
    useEffect(() => { 
        if (!startedRef.current) {
            startedRef.current = true;
            run(); 
        }
    }, [run]);

    if (loading) return <BannerLoading label="Performing Systematic Review..." color="border-emerald-500" />;
    if (error) return <BannerError message={error} onRetry={run} />;
    if (!result) return null;

    return (
        <div className="bg-white text-stone-900 rounded-[2.5rem] p-10 space-y-8 shadow-2xl shadow-emerald-900/10 border-2 border-emerald-500">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/10 p-2 rounded-xl shadow-inner border border-emerald-100">
                        <Zap size={18} className="text-emerald-600" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/50 block">SYSTEMATIC REVIEW</span>
                        <h4 className="font-bold text-lg font-serif">Comprehensive Overview</h4>
                    </div>
                </div>
                <button onClick={run} className="p-2 hover:bg-emerald-50 rounded-xl transition text-emerald-600/40 hover:text-emerald-600">
                    <RefreshCw size={16} />
                </button>
            </div>
            <p className="text-base leading-relaxed text-stone-700 font-serif italic border-l-2 border-emerald-500/30 pl-5">{result.overallSynthesis}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 border-t border-stone-100">
                <BannerSection label="Common Findings" content={result.commonFindings} labelColor="text-emerald-600" />
                <BannerSection label="Contradictions" content={result.contradictions} labelColor="text-emerald-600" />
                <BannerSection label="Research Gaps" content={result.gaps} labelColor="text-emerald-600" />
            </div>
        </div>
    );
}

// ── Gaps Banner ────────────────────────────────────────────────────────────

function GapsBanner({ sources }: { sources: Source[] }) {
    const { addLog, startLogGroup } = useDevMode();
    const [gaps, setGaps] = useState<GapResult[]>([]);
    const [topSuggestion, setTopSuggestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const run = useCallback(async () => {
        setLoading(true); setError(""); setGaps([]); setTopSuggestion("");
        const sourceName = "Gap Detection";
        const groupId = startLogGroup("/aitools", "Detecting Literature Gaps", sourceName);
        addLog(`Analyzing ${sources.length} articles for missing literature links...`, groupId);
        addLog(`Evaluating abstract coverage...`, groupId);
        try {
            const res = await fetch("/api/gaps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articles: sources }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            addLog(`Detected ${data.gaps?.length || 0} potential research gaps.`, groupId);
            setGaps(data.gaps || []);
            setTopSuggestion(data.topSuggestion || "");
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : "Failed to analyze gaps.";
            addLog(`Gap detection failed: ${errMsg}`, groupId);
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    }, [sources, addLog, startLogGroup]);

    const startedRef = useRef(false);
    useEffect(() => { 
        if (!startedRef.current) {
            startedRef.current = true;
            run(); 
        }
    }, [run]);

    if (loading) return <BannerLoading label="Analyzing literature gaps…" color="border-amber-500" />;
    if (error) return <BannerError message={error} onRetry={run} />;
    if (!gaps.length) return null;

    return (
        <div className="bg-white text-stone-900 rounded-[2.5rem] p-10 space-y-8 shadow-2xl shadow-amber-900/10 border-2 border-amber-500">
            <div className="flex items-center gap-3">
                <div className="bg-amber-500/10 p-2 rounded-xl shadow-inner border border-amber-100">
                    <AlertTriangle size={18} className="text-amber-600" />
                </div>
                <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/50 block">GAP DETECTION</span>
                    <h4 className="font-bold text-lg font-serif">Literature Gaps</h4>
                </div>
            </div>
            {topSuggestion && (
                <div className="bg-amber-50 text-stone-900 rounded-2xl p-6 border border-amber-100">
                    <div className="flex items-center gap-3 mb-3">
                        <Sparkles size={18} className="text-amber-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/40">PRIMARY DIRECTION</span>
                    </div>
                    <p className="text-base text-stone-800 font-serif italic border-l-2 border-amber-500/30 pl-5">{topSuggestion}</p>
                </div>
            )}
            <div className="grid gap-4">
                {gaps.map((gap, i) => (
                    <div
                        key={i}
                        className={`${gap.severity === "CRITICAL" ? "bg-rose-50/50 border-rose-100" : "bg-amber-50/50 border-amber-100"} border p-6 rounded-2xl flex gap-6 hover:opacity-80 transition-all relative group`}
                    >
                        <div className={`absolute left-0 top-6 bottom-6 w-1 ${gap.severity === "CRITICAL" ? "bg-rose-500/20" : "bg-amber-500/20"} rounded-r-full`} />
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black flex-shrink-0 font-serif text-xl ${gap.severity === "CRITICAL" ? "bg-rose-100 text-rose-600 border border-rose-200" : "bg-white text-amber-600 border border-amber-200"} shadow-sm`}>
                            ?
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h5 className="font-bold text-stone-900 text-sm leading-tight">{gap.title}</h5>
                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border ${gap.severity === "CRITICAL" ? "bg-rose-100 text-rose-600 border-rose-200" : "bg-white text-amber-600 border-amber-200"}`}>
                                    {gap.severity}
                                </span>
                            </div>
                            <p className="text-sm text-stone-600 leading-relaxed font-serif italic">"{gap.description}"</p>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={run} className="flex items-center gap-2 text-xs text-white/40 hover:text-white transition mx-auto">
                <RefreshCw size={11} /> Refresh Analysis
            </button>
        </div>
    );
}

// ── Graph Banner ───────────────────────────────────────────────────────────

function GraphBanner({ sources }: { sources: Source[] }) {
    const { addLog, startLogGroup } = useDevMode();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const nodesRef = useRef<GraphNode[]>([]);

    const buildGraph = useCallback(async () => {
        setLoading(true); setError(""); setGraphData(null); setSelectedNode(null);
        const sourceName = "Knowledge Graph";
        const groupId = startLogGroup("/aitools", "Building Relational Graph", sourceName);
        addLog(`Building relational graph nodes from ${sources.length} academic sources...`, groupId);
        addLog(`Extracting paper constraints, authors, and conceptual vertices...`, groupId);
        try {
            const res = await fetch("/api/graph", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articles: sources }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            addLog(`Graph constructed: ${data.nodes?.length} nodes mapped across ${data.edges?.length} edges.`, groupId);
            setGraphData(data);
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : "Failed to build knowledge graph.";
            addLog(`Graph construction aborted: ${errMsg}`, groupId);
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    }, [sources, addLog, startLogGroup]);

    const startedRef = useRef(false);
    useEffect(() => { 
        if (!startedRef.current) {
            startedRef.current = true;
            buildGraph(); 
        }
    }, [buildGraph]);

    useEffect(() => {
        if (!graphData || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width || 700;
        canvas.height = rect.height || 380;
        const W = canvas.width;
        const H = canvas.height;

        const nodes: GraphNode[] = graphData.nodes.map((n, i) => {
            if (n.x > 0 && n.y > 0) return { ...n, x: n.x * W, y: n.y * H };
            const angle = (i / graphData.nodes.length) * 2 * Math.PI;
            const r = Math.min(W, H) * 0.35;
            return { ...n, x: W / 2 + r * Math.cos(angle), y: H / 2 + r * Math.sin(angle) };
        });
        nodesRef.current = nodes;

        const nodeColors: Record<string, string> = {
            paper: "#8B1A1A", concept: "#16A34A", author: "#7C3AED", region: "#0284C7",
        };

        ctx.clearRect(0, 0, W, H);

        graphData.edges.forEach((edge) => {
            const from = nodes.find((n) => n.id === edge.from);
            const to = nodes.find((n) => n.id === edge.to);
            if (!from || !to) return;
            ctx.beginPath();
            ctx.strokeStyle = "rgba(0,0,0,0.1)";
            ctx.lineWidth = 1.5;
            ctx.moveTo(from.x, from.y);
            ctx.lineTo(to.x, to.y);
            ctx.stroke();
            ctx.font = "9px sans-serif";
            ctx.fillStyle = "rgba(0,0,0,0.25)";
            ctx.textAlign = "center";
            ctx.fillText(edge.label, (from.x + to.x) / 2, (from.y + to.y) / 2);
        });

        nodes.forEach((node) => {
            const isSelected = selectedNode?.id === node.id;
            const radius = node.type === "paper" ? 16 : node.type === "author" ? 11 : 9;
            const color = nodeColors[node.type] || "#8B1A1A";
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius + 7, 0, Math.PI * 2);
                ctx.fillStyle = `${color}22`;
                ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? color : color + "88";
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.font = node.type === "paper" ? "bold 10px sans-serif" : "10px sans-serif";
            ctx.fillStyle = "#1A0A00";
            ctx.textAlign = "center";
            const label = node.label.length > 22 ? node.label.slice(0, 22) + "…" : node.label;
            ctx.fillText(label, node.x, node.y + radius + 13);
        });
    }, [graphData, selectedNode]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const clicked = nodesRef.current.find((n) => {
            const r = n.type === "paper" ? 16 : 11;
            return Math.hypot(n.x - x, n.y - y) < r + 5;
        });
        setSelectedNode(clicked || null);
    };

    const connectedNodes = selectedNode
        ? (selectedNode.connections || [])
            .map((cid) => graphData?.nodes.find((n) => n.id === cid))
            .filter(Boolean) as GraphNode[]
        : [];

    if (loading) return <BannerLoading label="Building knowledge graph…" color="border-indigo-500" />;
    if (error) return <BannerError message={error} onRetry={buildGraph} />;
    if (!graphData) return null;

    return (
        <div className="bg-white text-stone-900 rounded-[2.5rem] p-10 space-y-8 shadow-2xl shadow-indigo-900/10 border-2 border-indigo-500">
            <div className="flex items-center justify-between border-b border-stone-100 pb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-100">
                        <GitGraph size={20} className="text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-stone-900 text-lg font-serif">Knowledge Graph</h3>
                        <p className="text-[10px] text-indigo-600/50 uppercase tracking-widest font-black mt-0.5">Relational Mapping</p>
                    </div>
                </div>
                <div className="flex items-center gap-4 bg-stone-50 px-5 py-2.5 rounded-2xl border border-stone-100">
                    {[
                        { type: "paper", color: "#F43F5E", label: "Paper" },
                        { type: "concept", color: "#10B981", label: "Concept" },
                        { type: "author", color: "#8B5CF6", label: "Author" },
                        { type: "region", color: "#0EA5E9", label: "Region" },
                    ].map((item) => (
                        <div key={item.type} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] text-white/60 font-bold uppercase tracking-tighter">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-10 flex-col lg:flex-row">
                <div className="flex-1 relative bg-stone-50 rounded-[2rem] border border-stone-200 overflow-hidden shadow-inner" style={{ height: 420 }}>
                    <canvas ref={canvasRef} className="w-full h-full cursor-pointer" onClick={handleCanvasClick} />
                </div>

                {selectedNode && (
                    <div className="w-full lg:w-72 bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/60">{selectedNode.type}</span>
                            <h3 className="font-bold text-white text-base mt-2 leading-snug font-serif">{selectedNode.label}</h3>
                        </div>
                        {connectedNodes.length > 0 && (
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Deep Connections</p>
                                <div className="space-y-2">
                                    {connectedNodes.map((cp) => (
                                        <button
                                            key={cp.id}
                                            onClick={() => setSelectedNode(cp)}
                                            className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group"
                                        >
                                            <span className="text-[9px] font-black uppercase text-indigo-400 group-hover:text-indigo-300">{cp.type}</span>
                                            <p className="text-xs font-bold text-white/80 group-hover:text-white leading-tight mt-1">{cp.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors border-t border-white/5 mt-4"
                        >
                            Clear View
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Contradiction Banner ───────────────────────────────────────────────────

function ContradictionBanner({ sources }: { sources: Source[] }) {
    const { addLog, startLogGroup } = useDevMode();
    const [inputMode, setInputMode] = useState<"custom" | "notebook">("custom");
    const [thesis, setThesis] = useState("");
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedNotebookId, setSelectedNotebookId] = useState("");
    const [result, setResult] = useState<SynthesisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => { setFolders(getStoredFolders()); }, []);

    const allNotebooks = folders.flatMap((f) =>
        f.notebooks.map((nb) => ({ ...nb, folderName: f.name }))
    );

    const getContent = (): string => {
        if (inputMode === "notebook") {
            for (const f of folders) {
                const nb = f.notebooks.find((n) => n.id === selectedNotebookId);
                if (nb) return nb.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 3000);
            }
            return "";
        }
        return thesis;
    };

    const run = async () => {
        const content = getContent();
        if (!content.trim()) return;
        setLoading(true); setError(""); setResult(null);
        const sourceName = "Contradiction Scan";
        const groupId = startLogGroup("/aitools", "Scanning Content for Contradictions", sourceName);
        addLog(`Analyzing user thesis (${content.length} chars) against ${sources.length} sources...`, groupId);
        addLog(`Probing for semantic conflicts and direct claim contradictions...`, groupId);
        try {
            const res = await fetch("/api/synthesis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articles: sources, thesisStatement: content, mode: "contradiction" }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            addLog(`Contradiction analysis complete. Resolved claims.`, groupId);
            setResult(data);
        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : "Failed to analyze.";
            addLog(`Contradiction scan failed: ${errMsg}`, groupId);
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const canRun = inputMode === "custom" ? thesis.trim().length > 0 : selectedNotebookId.length > 0;

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-10 space-y-8 shadow-2xl shadow-rose-900/10 border-2 border-rose-500">
                <div className="flex items-center justify-between border-b border-stone-100 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="bg-rose-500/10 p-2 rounded-xl shadow-inner border border-rose-100">
                                <AlertTriangle size={18} className="text-rose-600" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600/50 block">RESEARCH CHECK</span>
                                <h3 className="font-bold text-stone-900 text-lg font-serif">Contradiction Catcher</h3>
                            </div>
                        </div>
                        <p className="text-xs text-stone-400 mt-2">Validate your claims or notebooks against existing literature.</p>
                    </div>
                </div>

                <div className="flex gap-2.5">
                    {(["custom", "notebook"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setInputMode(m)}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold border-2 transition-all ${inputMode === m
                                ? "bg-rose-50 text-rose-900 border-rose-500 shadow-sm"
                                : "bg-white text-stone-400 border-stone-100 hover:border-rose-500/50"
                                }`}
                        >
                            {m === "custom" ? "Write thesis" : "Use notebook"}
                        </button>
                    ))}
                </div>

                {inputMode === "custom" && (
                    <div className="space-y-2">
                        <textarea
                            value={thesis}
                            onChange={(e) => setThesis(e.target.value)}
                            placeholder="Enter your thesis statement or claim to check against the sources…"
                            rows={3}
                            className={`w-full bg-slate-50 border-2 ${thesis.length > 0 ? 'border-rose-500/20' : 'border-stone-100'} rounded-3xl px-6 py-5 text-sm text-stone-700 outline-none focus:border-rose-500/50 transition-all font-serif italic resize-none`}
                        />
                    </div>
                )}

                {inputMode === "notebook" && (
                    <div className="space-y-2">
                        {allNotebooks.length === 0 ? (
                            <div className="bg-stone-50 border-2 border-stone-100 rounded-3xl px-6 py-5 text-center">
                                <p className="text-sm text-stone-400 italic">No notebooks found. Create one in the Writer first.</p>
                            </div>
                        ) : (
                            <select
                                value={selectedNotebookId}
                                onChange={(e) => setSelectedNotebookId(e.target.value)}
                                className={`w-full bg-slate-50 border-2 ${selectedNotebookId ? 'border-rose-500/20' : 'border-stone-100'} rounded-full px-6 py-3.5 text-sm text-stone-700 outline-none focus:border-rose-500/50 transition-all bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2371717A%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_1.5rem_center] bg-no-repeat appearance-none select-none`}
                            >
                                <option value="" disabled>Select a notebook to verify...</option>
                                {allNotebooks.map((nb: any) => (
                                    <option key={nb.id} value={nb.id}>{nb.folderName} / {nb.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                )}

                <div className="pt-2">
                    <button
                        onClick={run}
                        disabled={loading || !canRun}
                        className={`group relative w-full py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 overflow-hidden active:scale-95 ${canRun && !loading
                            ? "bg-rose-500 text-white shadow-xl shadow-rose-900/20 hover:bg-rose-600"
                            : "bg-stone-100 text-stone-400 cursor-not-allowed border-2 border-stone-200"
                            }`}
                    >
                        <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <Zap size={16} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-12" />
                        )}
                        {loading ? "Analyzing Context..." : "Check for Contradictions"}
                    </button>
                </div>
            </div>

            {loading && <BannerLoading label="Detecting contradictions..." color="border-rose-500" />}
            {error && <BannerError message={error} onRetry={run} />}

            {result && (
                <div className="bg-white text-stone-900 rounded-[2.5rem] p-10 space-y-8 shadow-2xl shadow-rose-900/10 border-2 border-rose-500 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <div className="flex items-center gap-3">
                        <div className="bg-rose-500/10 p-2 rounded-xl shadow-inner text-rose-600 border border-rose-100">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600/50 block">CONTRADICTION SCAN</span>
                            <h4 className="font-bold text-lg font-serif">Inconsistency Analysis</h4>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <BannerSection label="Common Findings" content={result.commonFindings} labelColor="text-rose-600" />
                        <BannerSection label="Contradictions Found" content={result.contradictions} labelColor="text-rose-600" />
                        <BannerSection label="Research Gaps" content={result.gaps} labelColor="text-rose-600" />
                        <BannerSection label="Recommended Position" content={result.overallSynthesis} labelColor="text-rose-600" />
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Shared banner helpers ──────────────────────────────────────────────────

function BannerSection({ label, content, labelColor = "text-emerald-400" }: { label: string; content: string; labelColor?: string }) {
    return (
        <div className="space-y-1">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${labelColor}`}>{label}</p>
            <p className="text-sm text-stone-700 leading-relaxed font-serif italic">"{content}"</p>
        </div>
    );
}

function BannerLoading({ label, color = "border-emerald-500" }: { label: string; color?: string }) {
    return (
        <div className={`bg-white text-stone-900 rounded-[2.5rem] p-10 flex items-center gap-6 shadow-2xl border-2 ${color} animate-pulse`}>
            <div className={`${color.replace('border-', 'bg-')}/10 p-3 rounded-2xl shadow-inner border border-stone-100`}>
                <Loader2 size={24} className={`animate-spin ${color.replace('border-', 'text-')}`} />
            </div>
            <div>
                <p className="text-lg font-bold font-serif italic text-stone-900/90">{label}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mt-1">AI models are synthesizing your sources</p>
            </div>
        </div>
    );
}

function BannerError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="bg-rose-50/50 border border-rose-200/50 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-sm">
            <div className="bg-rose-100 p-2.5 rounded-xl text-rose-700">
                <AlertTriangle size={20} />
            </div>
            <div>
                <p className="text-sm font-bold text-rose-900">{message}</p>
                <button onClick={onRetry} className="text-xs text-rose-700 font-black uppercase tracking-widest mt-2 hover:text-rose-900 flex items-center gap-1.5 transition-colors">
                    <RefreshCw size={12} /> Try again
                </button>
            </div>
        </div>
    );
}

// ── Source Selector (library + upload) ────────────────────────────────────

function SourceSelector({
    selected,
    onToggle,
    uploadedSources,
    onUpload,
    onRemoveUpload,
}: {
    selected: Set<string>;
    onToggle: (source: Source, folderName: string) => void;
    uploadedSources: Source[];
    onUpload: (sources: Source[]) => void;
    onRemoveUpload: (id: string) => void;
}) {
    const { folders } = useLibrary();
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleFolder = (id: string) =>
        setExpanded((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        const newSources: Source[] = [];
        for (const file of files) {
            const isPDF = file.type === "application/pdf";
            let abstract = "";
            if (isPDF) {
                abstract = await extractPdfText(file);
                if (!abstract) abstract = "[PDF text extraction failed — results may be limited]";
            } else {
                abstract = (await file.text().catch(() => "")).slice(0, 3000);
            }
            newSources.push({
                id: `pdf_${Date.now()}_${file.name.replace(/[^a-z0-9]/gi, '').slice(0, 10)}_${Math.random().toString(36).slice(2, 8)}`,
                title: file.name.replace(/\.(pdf|txt|docx)$/i, ""),
                authors: "Uploaded file",
                year: new Date().getFullYear().toString(),
                journal: isPDF ? "PDF upload" : "TXT upload",
                abstract,
            });
        }
        onUpload(newSources);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const totalArticles = folders.reduce((a, f) => a + f.articles.length, 0);

    return (
        <div className="space-y-4">
            {/* Library */}
            <div className="bg-white/60 backdrop-blur-md border border-[#2b090d]/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-[#2b090d]/5 bg-[#521118]/5 flex items-center gap-3">
                    <FolderOpen size={15} className="text-[#521118]" />
                    <span className="font-bold text-[#2b090d] text-xs uppercase tracking-widest">From Library</span>
                    <span className="text-[10px] font-black text-[#521118]/40 ml-auto bg-white px-2 py-0.5 rounded-lg border border-[#2b090d]/5">{totalArticles} ARTICLES</span>
                </div>
                {folders.length === 0 ? (
                    <div className="px-5 py-10 text-center">
                        <BookOpen size={24} className="mx-auto mb-3 text-[#521118]/20" />
                        <p className="text-xs font-bold text-[#521118]/40 uppercase tracking-widest">No articles saved yet</p>
                    </div>
                ) : (
                    folders.map((folder) => (
                        <div key={folder.id}>
                            <button
                                onClick={() => toggleFolder(folder.id)}
                                className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-stone-50 transition border-b border-stone-50 text-left"
                            >
                                <span className="text-stone-400">{expanded.has(folder.id) ? <ChevronDown size={13} /> : <ChevronUp size={13} />}</span>
                                <span className="text-sm font-semibold text-stone-700">{folder.name}</span>
                                <span className="text-xs text-stone-400 ml-auto">{folder.articles.length}</span>
                            </button>
                            {expanded.has(folder.id) && (
                                <div className="divide-y divide-[#2b090d]/5">
                                    {folder.articles.length === 0 ? (
                                        <p className="px-10 py-3 text-[10px] font-bold text-[#521118]/30 uppercase tracking-widest bg-white/40">No articles in this folder</p>
                                    ) : (
                                        folder.articles.map((article) => (
                                            <button
                                                key={article.id}
                                                onClick={() => onToggle({
                                                    id: article.id,
                                                    title: article.title,
                                                    authors: Array.isArray(article.authors) ? article.authors.map(a => `${a.firstName ? `${a.firstName.charAt(0)}. ` : ""}${a.lastName}`).join(", ") : (article.authors || "Unknown"),
                                                    year: article.year,
                                                    journal: article.journal,
                                                    abstract: article.abstract || "",
                                                    credibility: article.credibility,
                                                    localSource: article.localSource,
                                                    openAccess: article.openAccess,
                                                    url: article.url,
                                                }, folder.name)}
                                                className="w-full flex items-start gap-4 px-10 py-4 hover:bg-[#521118]/5 transition-all text-left group"
                                            >
                                                <span className="mt-1 shrink-0 text-[#2b090d]/30 group-hover:text-[#521118] transition-colors">
                                                    {selected.has(article.id) ? <CheckSquare size={16} className="text-[#521118]" /> : <Square size={16} />}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-[#2b090d] leading-tight font-serif group-hover:text-[#521118] transition-colors">{article.title}</p>
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-[#521118]/40 mt-1.5">{Array.isArray(article.authors) ? article.authors.map(a => `${a.firstName ? `${a.firstName.charAt(0)}. ` : ""}${a.lastName}`).join(", ") : (article.authors || "Unknown")} · {article.year}</p>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Upload */}
            <div className="bg-white/60 backdrop-blur-md border border-[#2b090d]/10 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-[#2b090d]/5 bg-[#521118]/5 flex items-center gap-3">
                    <Upload size={15} className="text-[#521118]" />
                    <span className="font-bold text-[#2b090d] text-xs uppercase tracking-widest">Upload Context</span>
                    <span className="text-[10px] font-black text-[#521118]/40 ml-auto bg-white px-2 py-0.5 rounded-lg border border-[#2b090d]/5">PDF / TXT</span>
                </div>
                <div className="p-6">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full border-2 border-dashed border-stone-200 rounded-xl py-4 flex flex-col items-center gap-1.5 hover:border-rose-800 hover:bg-rose-50/20 transition disabled:opacity-50"
                    >
                        {uploading ? (
                            <><Loader2 size={16} className="text-rose-800 animate-spin" /><span className="text-xs text-stone-400">Extracting…</span></>
                        ) : (
                            <><Upload size={16} className="text-stone-300" /><span className="text-xs font-semibold text-stone-400">Click to upload</span></>
                        )}
                    </button>
                    <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt" className="hidden" onChange={handleFileUpload} />
                    {uploadedSources.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                            {uploadedSources.map((s) => (
                                <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-stone-50 rounded-xl border border-stone-200">
                                    <CheckSquare size={13} className="text-rose-800 shrink-0" />
                                    <span className="text-xs font-medium text-stone-700 flex-1 truncate">{s.title}</span>
                                    <button onClick={() => onRemoveUpload(s.id)} className="text-stone-300 hover:text-red-400 transition shrink-0">
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const TOOL_BUTTONS: { id: Tool; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "synthesis", label: "Systematic Review", icon: <Zap size={16} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-12" />, color: "emerald" },
    { id: "gaps", label: "Gap Analysis", icon: <AlertTriangle size={16} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" />, color: "amber" },
    { id: "graph", label: "Knowledge Graph", icon: <GitGraph size={16} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-12" />, color: "indigo" },
    { id: "contradiction", label: "Contradiction Catcher", icon: <ShieldCheck size={16} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" />, color: "rose" },
];

export default function AIToolsPage() {
    const [mounted, setMounted] = useState(false);
    const [isAnimating, setIsAnimating] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedSources, setSelectedSources] = useState<Source[]>([]);
    const [uploadedSources, setUploadedSources] = useState<Source[]>([]);
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [showSelector, setShowSelector] = useState(false);

    useEffect(() => {
        setMounted(true);
        const timer = setTimeout(() => setIsAnimating(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const toggleSource = (source: Source, folderName: string) => {
        const id = source.id;
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
                setSelectedSources((s) => s.filter((x) => x.id !== id));
            } else {
                next.add(id);
                setSelectedSources((s) => {
                    // Deduplicate — never add if id already exists
                    if (s.some((x) => x.id === id)) return s;
                    return [...s, { ...source, fromFolder: folderName }];
                });
            }
            return next;
        });
    };

    const handleUpload = (sources: Source[]) => {
        setUploadedSources((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const deduped = sources.filter((s) => !existingIds.has(s.id));
            return [...prev, ...deduped];
        });
        setSelectedIds((prev) => new Set([...prev, ...sources.map((s) => s.id)]));
        setSelectedSources((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            return [...prev, ...sources.filter((s) => !existingIds.has(s.id))];
        });
    };

    const removeUpload = (id: string) => {
        setUploadedSources((prev) => prev.filter((x) => x.id !== id));
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
        setSelectedSources((prev) => prev.filter((x) => x.id !== id));
    };

    const handleToolClick = (tool: Tool) => {
        setActiveTool(tool);
    };

    const canUseTool = selectedSources.length >= 2;

    if (!mounted) return null;

    return (
        <motion.main
            initial={false}
            animate={{ opacity: 1 }}
            className={`min-h-screen w-full pb-20 relative font-sans ${isAnimating ? "overflow-hidden" : "overflow-y-auto"}`}
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="max-w-5xl mx-auto px-8 pt-16 relative"
            >
                {/* Header */}
                <div className="mb-12 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="bg-[#521118]/10 text-[#521118] border border-[#521118]/10 p-4 rounded-3xl shadow-sm shrink-0">
                            <RiGeminiLine size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-[#2b090d] tracking-tight font-serif">
                                AI Tools
                            </h1>
                            <p className="text-[#521118]/60 text-lg mt-1 font-medium">
                                {selectedSources.length === 0
                                    ? "Select research sources to begin advanced analysis."
                                    : `${selectedSources.length} source${selectedSources.length > 1 ? "s" : ""} selected for Systematic Review.`
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSelector(!showSelector)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold transition-all shadow-sm border ${showSelector
                            ? "bg-[#521118] text-white border-[#521118]"
                            : "bg-white text-[#521118] border-[#2b090d]/10 hover:bg-[#521118]/5"}`}
                    >
                        <FolderOpen size={18} />
                        {showSelector ? "Hide Library" : "Select Articles"}
                    </button>
                </div>
                
                {/* Tool buttons */}
                <div className="flex gap-4 flex-wrap mb-8">
                    {TOOL_BUTTONS.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={() => handleToolClick(tool.id)}
                            className={`flex items-center gap-2.5 px-6 py-3 rounded-full text-sm font-bold border-2 transition-all group ${activeTool === tool.id
                                ? tool.color === "emerald" ? "bg-emerald-50 text-emerald-900 border-emerald-500 shadow-sm"
                                    : tool.color === "amber" ? "bg-amber-50 text-amber-900 border-amber-500 shadow-sm"
                                        : tool.color === "indigo" ? "bg-indigo-50 text-indigo-900 border-indigo-500 shadow-sm"
                                            : "bg-rose-50 text-rose-900 border-rose-500 shadow-sm"
                                : tool.color === "emerald" ? "bg-white text-stone-400 border-stone-200 hover:border-emerald-500/50 hover:bg-emerald-50 hover:text-emerald-700"
                                    : tool.color === "amber" ? "bg-white text-stone-400 border-stone-200 hover:border-amber-500/50 hover:bg-amber-50 hover:text-amber-700"
                                        : tool.color === "indigo" ? "bg-white text-stone-400 border-stone-200 hover:border-indigo-500/50 hover:bg-indigo-50 hover:text-indigo-700"
                                            : "bg-white text-stone-400 border-stone-200 hover:border-rose-500/50 hover:bg-rose-50 hover:text-rose-700"
                                }`}
                        >
                            {tool.icon} {tool.label}
                        </button>
                    ))}
                </div>

                {/* Unified Interaction Zone */}
                <div className="bg-white/40 backdrop-blur-xl border border-[#2b090d]/10 rounded-[3rem] shadow-sm mb-10 overflow-hidden">
                    <AnimatePresence mode="wait">
                        {showSelector ? (
                            <motion.div
                                key="selector"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.4 }}
                                className="p-8"
                            >
                                <SourceSelector
                                    selected={selectedIds}
                                    onToggle={toggleSource}
                                    uploadedSources={uploadedSources}
                                    onUpload={handleUpload}
                                    onRemoveUpload={removeUpload}
                                />
                            </motion.div>
                        ) : selectedSources.length === 0 ? (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                transition={{ duration: 0.4 }}
                                className="text-center py-24"
                            >
                                <div className="bg-[#521118]/5 border border-[#521118]/10 p-10 rounded-[2.5rem] w-fit mx-auto shadow-inner mb-6">
                                    <Sparkles size={48} className="text-[#521118]/20" />
                                </div>
                                <h3 className="font-bold text-2xl text-[#2b090d] font-serif tracking-tight">Ready for Systematic Review</h3>
                                <p className="text-[#521118]/60 text-base mt-2 max-w-sm mx-auto font-medium">Click "Select Sources" to pick from your research folders and let AI find deep connections.</p>
                                <button
                                    onClick={() => setShowSelector(true)}
                                    className="group relative mt-8 bg-[#521118] text-[#e8e4df] px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#2b090d] transition-all duration-300 shadow-xl shadow-[#521118]/20 overflow-hidden active:scale-95 flex items-center justify-center gap-2 mx-auto"
                                >
                                    <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                                    <Sparkles size={16} className="text-amber-300 transition-transform group-hover:scale-110" />
                                    Select Sources
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="status"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-8 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-[#521118]/10 p-3 rounded-2xl">
                                        <BookmarkCheck size={24} className="text-[#521118]" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#521118]/40">Current Context</p>
                                        <h3 className="text-base font-bold text-[#2b090d]">{selectedSources.length} Research Articles Selected</h3>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSelector(true)}
                                    className="px-6 py-2.5 bg-white border border-[#2b090d]/10 text-[#521118] text-sm font-bold rounded-xl hover:bg-[#521118]/5 transition shadow-sm"
                                >
                                    Modify Sources
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>



                {!canUseTool && selectedSources.length > 0 && (
                    <div className="bg-[#521118]/5 border border-[#521118]/10 rounded-2xl px-6 py-4 mb-10 flex items-center gap-3">
                        <AlertTriangle size={18} className="text-[#521118]/40" />
                        <p className="text-sm font-bold text-[#521118]/60">Pick at least 2 sources from your research to unlock advanced AI tools.</p>
                    </div>
                )}

                {/* Active tool banner */}
                {activeTool && canUseTool && (
                    <div className="mb-10">
                        <ToolBanner
                            tool={activeTool as Tool}
                            sources={selectedSources}
                        />
                    </div>
                )}



                {/* Selected sources as cards */}
                {selectedSources.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-xl font-black font-serif text-[#2b090d] tracking-tight">
                                Analysis Context
                            </h2>
                            <span className="bg-[#521118]/10 text-[#521118] px-2.5 py-0.5 rounded-lg text-[10px] font-black border border-[#521118]/10">
                                {selectedSources.length} ITEMS
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[...new Map(selectedSources.map((s) => [s.id, s])).values()].map((source, i) => (
                                <SourceCard
                                    key={source.id}
                                    source={source}
                                    index={i}
                                    selected={selectedIds.has(source.id)}
                                    onToggle={() => toggleSource(source, source.fromFolder || "")}
                                    showCheckbox
                                />
                            ))}
                        </div>
                    </div>
                )}


            </motion.div>
        </motion.main>
    );
}