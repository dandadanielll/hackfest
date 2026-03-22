"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Zap, AlertTriangle, GitGraph, Upload, X,
    ChevronDown, ChevronUp, Loader2, RefreshCw,
    BookOpen, FolderOpen, CheckSquare, Square,
    ExternalLink, Quote, Sparkles, ShieldCheck,
    FileText, Bookmark, BookmarkCheck
} from "lucide-react";
import { useLibrary } from "@/lib/libraryContext";
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
    if (!score) return "text-stone-500 bg-stone-50 border-stone-200";
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
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
    const [open, setOpen] = useState(false);

    return (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
                        <button
                            onClick={() => setOpen(!open)}
                            className="text-left font-bold text-stone-900 text-base leading-snug hover:text-rose-900 transition-colors"
                        >
                            {source.title}
                        </button>
                        <p className="text-sm text-stone-500 mt-1">
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
                        <button
                            onClick={() => setOpen(!open)}
                            className="p-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-400 hover:text-stone-700 transition"
                        >
                            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 border-t border-stone-100 pt-4 space-y-3">
                            {source.abstract && (
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1">
                                        <BookOpen size={12} /> Abstract
                                    </h4>
                                    <p className="text-sm text-stone-600 leading-relaxed">{source.abstract}</p>
                                </div>
                            )}
                            {source.url && (
                                <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm font-bold text-rose-900 hover:text-rose-700 transition"
                                >
                                    <ExternalLink size={14} /> View Full Paper
                                </a>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ── Tool Banner ────────────────────────────────────────────────────────────

function ToolBanner({
    tool,
    sources,
    onContradictionFound,
}: {
    tool: Tool;
    sources: Source[];
    onContradictionFound: (text: string) => void;
}) {
    if (tool === "synthesis") return <SynthesisBanner sources={sources} onContradictionFound={onContradictionFound} />;
    if (tool === "gaps") return <GapsBanner sources={sources} />;
    if (tool === "graph") return <GraphBanner sources={sources} />;
    if (tool === "contradiction") return <ContradictionBanner sources={sources} />;
    return null;
}

// ── Synthesis Banner ───────────────────────────────────────────────────────

function SynthesisBanner({ sources, onContradictionFound }: {
    sources: Source[];
    onContradictionFound: (text: string) => void;
}) {
    const [result, setResult] = useState<SynthesisResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const run = useCallback(async () => {
        setLoading(true); setError(""); setResult(null);
        try {
            const res = await fetch("/api/synthesis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articles: sources }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResult(data);
            if (data.contradictions) onContradictionFound(data.contradictions);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to synthesize.");
        } finally {
            setLoading(false);
        }
    }, [sources, onContradictionFound]);

    useEffect(() => { run(); }, [run]);

    if (loading) return <BannerLoading label="Synthesizing literature…" />;
    if (error) return <BannerError message={error} onRetry={run} />;
    if (!result) return null;

    return (
        <div className="bg-emerald-800 text-white rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Zap size={16} className="text-emerald-300" />
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-300">Dunong Synthesis</span>
                </div>
                <button onClick={run} className="text-emerald-400 hover:text-white transition">
                    <RefreshCw size={14} />
                </button>
            </div>
            <p className="text-sm leading-relaxed text-emerald-50">{result.overallSynthesis}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-emerald-700">
                <BannerSection label="Common Findings" content={result.commonFindings} />
                <BannerSection label="Contradictions" content={result.contradictions} />
                <BannerSection label="Research Gaps" content={result.gaps} />
            </div>
        </div>
    );
}

// ── Gaps Banner ────────────────────────────────────────────────────────────

function GapsBanner({ sources }: { sources: Source[] }) {
    const [gaps, setGaps] = useState<GapResult[]>([]);
    const [topSuggestion, setTopSuggestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const run = useCallback(async () => {
        setLoading(true); setError(""); setGaps([]); setTopSuggestion("");
        try {
            const res = await fetch("/api/gaps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articles: sources }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setGaps(data.gaps || []);
            setTopSuggestion(data.topSuggestion || "");
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to analyze gaps.");
        } finally {
            setLoading(false);
        }
    }, [sources]);

    useEffect(() => { run(); }, [run]);

    if (loading) return <BannerLoading label="Analyzing literature gaps…" />;
    if (error) return <BannerError message={error} onRetry={run} />;
    if (!gaps.length) return null;

    return (
        <div className="space-y-3">
            {topSuggestion && (
                <div className="bg-emerald-800 text-white rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={14} className="text-emerald-300" />
                        <span className="text-xs font-black uppercase tracking-widest text-emerald-300">Top Research Direction</span>
                    </div>
                    <p className="text-sm text-emerald-50 leading-relaxed">{topSuggestion}</p>
                </div>
            )}
            <div className="grid gap-3">
                {gaps.map((gap, i) => (
                    <div
                        key={i}
                        className={`bg-white border-l-4 ${gap.severity === "CRITICAL" ? "border-l-red-500" : "border-l-amber-500"} border-y border-r border-stone-200 p-5 rounded-r-2xl rounded-l-md flex gap-4`}
                    >
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center font-black flex-shrink-0 font-serif text-base ${gap.severity === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                            ?
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h5 className="font-bold text-stone-900 text-sm leading-tight">{gap.title}</h5>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${gap.severity === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                    {gap.severity}
                                </span>
                            </div>
                            <p className="text-sm text-stone-600 leading-relaxed">{gap.description}</p>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={run} className="flex items-center gap-2 text-xs text-stone-400 hover:text-stone-700 transition mx-auto">
                <RefreshCw size={11} /> Refresh
            </button>
        </div>
    );
}

// ── Graph Banner ───────────────────────────────────────────────────────────

function GraphBanner({ sources }: { sources: Source[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const nodesRef = useRef<GraphNode[]>([]);

    const buildGraph = useCallback(async () => {
        setLoading(true); setError(""); setGraphData(null); setSelectedNode(null);
        try {
            const res = await fetch("/api/graph", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articles: sources }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setGraphData(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to build knowledge graph.");
        } finally {
            setLoading(false);
        }
    }, [sources]);

    useEffect(() => { buildGraph(); }, [buildGraph]);

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

    if (loading) return <BannerLoading label="Building knowledge graph…" />;
    if (error) return <BannerError message={error} onRetry={buildGraph} />;
    if (!graphData) return null;

    return (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        <GitGraph size={14} className="text-rose-800" /> Knowledge Graph
                    </h3>
                    <p className="text-[10px] text-stone-400 mt-0.5">Click a node to explore connections</p>
                </div>
                <div className="flex items-center gap-3">
                    {[
                        { type: "paper", color: "#8B1A1A", label: "Paper" },
                        { type: "concept", color: "#16A34A", label: "Concept" },
                        { type: "author", color: "#7C3AED", label: "Author" },
                        { type: "region", color: "#0284C7", label: "Region" },
                    ].map((item) => (
                        <div key={item.type} className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] text-stone-500">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex">
                <div className="flex-1 relative" style={{ height: 380 }}>
                    <canvas ref={canvasRef} className="w-full h-full cursor-pointer" onClick={handleCanvasClick} />
                </div>

                {selectedNode && (
                    <div className="w-56 border-l border-stone-100 p-4 space-y-3 overflow-y-auto" style={{ maxHeight: 380 }}>
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">{selectedNode.type}</span>
                            <h3 className="font-bold text-stone-900 text-sm mt-0.5 leading-snug">{selectedNode.label}</h3>
                        </div>
                        {connectedNodes.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Connected</p>
                                <div className="space-y-1">
                                    {connectedNodes.map((cp) => (
                                        <button
                                            key={cp.id}
                                            onClick={() => setSelectedNode(cp)}
                                            className="w-full text-left px-2.5 py-1.5 bg-stone-50 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 rounded-xl transition"
                                        >
                                            <span className="text-[9px] font-bold uppercase text-stone-400">{cp.type}</span>
                                            <p className="text-xs font-semibold text-stone-700 leading-snug">{cp.label}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setSelectedNode(null)}
                            className="text-[10px] text-stone-400 hover:text-stone-700 transition"
                        >
                            Clear selection
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Contradiction Banner ───────────────────────────────────────────────────

function ContradictionBanner({ sources }: { sources: Source[] }) {
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
        try {
            const res = await fetch("/api/synthesis", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ articles: sources, thesisStatement: content, mode: "contradiction" }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setResult(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to analyze.");
        } finally {
            setLoading(false);
        }
    };

    const canRun = inputMode === "custom" ? thesis.trim().length > 0 : selectedNotebookId.length > 0;

    return (
        <div className="space-y-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4">
                <div>
                    <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                        <AlertTriangle size={14} className="text-rose-800" /> Contradiction Catcher
                    </h3>
                    <p className="text-xs text-stone-400 mt-0.5">Check a thesis or notebook against your sources.</p>
                </div>

                <div className="flex gap-2">
                    {(["custom", "notebook"] as const).map((m) => (
                        <button
                            key={m}
                            onClick={() => setInputMode(m)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${inputMode === m ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-500 border-stone-200 hover:border-stone-400"
                                }`}
                        >
                            {m === "custom" ? "Write thesis" : "Use notebook"}
                        </button>
                    ))}
                </div>

                {inputMode === "custom" && (
                    <textarea
                        value={thesis}
                        onChange={(e) => setThesis(e.target.value)}
                        placeholder="Enter your thesis statement or claim to check against the sources…"
                        rows={3}
                        className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-700 outline-none focus:border-rose-800 resize-none"
                    />
                )}

                {inputMode === "notebook" && (
                    allNotebooks.length === 0 ? (
                        <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-center">
                            <p className="text-sm text-stone-400">No notebooks found. Create one in the Writer first.</p>
                        </div>
                    ) : (
                        <select
                            value={selectedNotebookId}
                            onChange={(e) => setSelectedNotebookId(e.target.value)}
                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 text-sm text-stone-700 outline-none focus:border-rose-800 bg-white"
                        >
                            <option value="">Select a notebook…</option>
                            {allNotebooks.map((nb) => (
                                <option key={nb.id} value={nb.id}>{nb.folderName} / {nb.name}</option>
                            ))}
                        </select>
                    )
                )}

                <button
                    onClick={run}
                    disabled={!canRun || loading}
                    className="px-5 py-2.5 bg-stone-900 text-white text-sm font-bold rounded-xl hover:bg-rose-900 transition disabled:opacity-40 flex items-center gap-2"
                >
                    {loading ? <><Loader2 size={14} className="animate-spin" /> Analyzing…</> : "Check for Contradictions"}
                </button>
            </div>

            {error && <BannerError message={error} onRetry={run} />}

            {result && (
                <div className="bg-emerald-800 text-white rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={14} className="text-emerald-300" />
                        <span className="text-xs font-black uppercase tracking-widest text-emerald-300">Contradiction Analysis</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <BannerSection label="Common Findings" content={result.commonFindings} />
                        <BannerSection label="Contradictions Found" content={result.contradictions} />
                        <BannerSection label="Research Gaps" content={result.gaps} />
                        <BannerSection label="Recommended Position" content={result.overallSynthesis} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Shared banner helpers ──────────────────────────────────────────────────

function BannerSection({ label, content }: { label: string; content: string }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">{label}</p>
            <p className="text-xs text-emerald-100 leading-relaxed">{content}</p>
        </div>
    );
}

function BannerLoading({ label }: { label: string }) {
    return (
        <div className="bg-emerald-800 text-white rounded-2xl p-6 flex items-center gap-4">
            <Loader2 size={20} className="animate-spin text-emerald-300 shrink-0" />
            <p className="text-sm font-semibold text-emerald-100">{label}</p>
        </div>
    );
}

function BannerError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
                <p className="text-sm font-semibold text-red-700">{message}</p>
                <button onClick={onRetry} className="text-xs text-red-600 font-bold mt-1.5 hover:underline flex items-center gap-1">
                    <RefreshCw size={11} /> Try again
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
    const [expanded, setExpanded] = useState<Set<string>>(new Set(folders.map((f) => f.id)));
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
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-3">
                    <FolderOpen size={15} className="text-rose-800" />
                    <span className="font-bold text-stone-900 text-sm">From Library</span>
                    <span className="text-xs text-stone-400 ml-auto">{totalArticles} articles</span>
                </div>
                {folders.length === 0 ? (
                    <div className="px-5 py-6 text-center text-stone-400">
                        <BookOpen size={24} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No articles saved yet.</p>
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
                                <div className="divide-y divide-stone-50">
                                    {folder.articles.length === 0 ? (
                                        <p className="px-8 py-2 text-xs text-stone-400 italic">No articles.</p>
                                    ) : (
                                        folder.articles.map((article) => (
                                            <button
                                                key={article.id}
                                                onClick={() => onToggle({
                                                    id: article.id,
                                                    title: article.title,
                                                    authors: Array.isArray(article.authors) ? article.authors.map((a: any) => `${a.firstName} ${a.lastName}`).join(", ") : (article.authors as string),
                                                    year: article.year,
                                                    journal: article.journal,
                                                    abstract: article.abstract || "",
                                                    credibility: article.credibility,
                                                    localSource: article.localSource,
                                                    openAccess: article.openAccess,
                                                    url: article.url,
                                                }, folder.name)}
                                                className="w-full flex items-start gap-3 px-8 py-2.5 hover:bg-stone-50 transition text-left"
                                            >
                                                <span className="mt-0.5 shrink-0 text-rose-800">
                                                    {selected.has(article.id) ? <CheckSquare size={14} /> : <Square size={14} className="text-stone-300" />}
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-stone-800 leading-snug">{article.title}</p>
                                                    <p className="text-xs text-stone-400 mt-0.5">
                                                        {Array.isArray(article.authors) ? article.authors.map((a: any) => `${a.firstName} ${a.lastName}`).join(", ") : (article.authors as string)} · {article.year}
                                                    </p>
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
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-3">
                    <Upload size={15} className="text-rose-800" />
                    <span className="font-bold text-stone-900 text-sm">Upload Files</span>
                    <span className="text-xs text-stone-400 ml-auto">PDF or TXT</span>
                </div>
                <div className="p-4">
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

const TOOL_BUTTONS: { id: Tool; label: string; icon: React.ReactNode }[] = [
    { id: "synthesis", label: "Synthesis", icon: <Zap size={16} /> },
    { id: "gaps", label: "Gap Analysis", icon: <AlertTriangle size={16} /> },
    { id: "graph", label: "Knowledge Graph", icon: <GitGraph size={16} /> },
    { id: "contradiction", label: "Contradiction Catcher", icon: <ShieldCheck size={16} /> },
];

export default function AIToolsPage() {
    const [mounted, setMounted] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedSources, setSelectedSources] = useState<Source[]>([]);
    const [uploadedSources, setUploadedSources] = useState<Source[]>([]);
    const [activeTool, setActiveTool] = useState<Tool | null>(null);
    const [contradiction, setContradiction] = useState<string | null>(null);
    const [showSelector, setShowSelector] = useState(false);

    useEffect(() => { setMounted(true); }, []);

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
        setContradiction(null);
    };

    const canUseTool = selectedSources.length >= 2;

    if (!mounted) return null;

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            <div className="max-w-4xl mx-auto px-8 pt-10">

                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-stone-900 font-serif">AI Tools</h1>
                        <p className="text-stone-500 text-sm mt-0.5">
                            {selectedSources.length === 0
                                ? "Select sources to get started."
                                : `${selectedSources.length} source${selectedSources.length > 1 ? "s" : ""} selected${!canUseTool ? " — select 1 more to proceed" : ""}`
                            }
                        </p>
                    </div>
                    <button
                        onClick={() => setShowSelector(!showSelector)}
                        className="flex items-center gap-2 text-sm font-semibold border border-stone-200 bg-white px-4 py-2 rounded-xl hover:border-rose-800 transition"
                    >
                        <FolderOpen size={15} className="text-rose-800" />
                        {showSelector ? "Hide sources" : "Add sources"}
                    </button>
                </div>

                {/* Source selector panel */}
                <AnimatePresence>
                    {showSelector && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden mb-6"
                        >
                            <SourceSelector
                                selected={selectedIds}
                                onToggle={toggleSource}
                                uploadedSources={uploadedSources}
                                onUpload={handleUpload}
                                onRemoveUpload={removeUpload}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Tool buttons */}
                {canUseTool && (
                    <div className="flex gap-3 flex-wrap mb-6">
                        {TOOL_BUTTONS.map((tool) => (
                            <button
                                key={tool.id}
                                onClick={() => handleToolClick(tool.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${activeTool === tool.id
                                    ? "bg-stone-900 text-white border-stone-900 shadow-md"
                                    : "bg-white text-stone-600 border-stone-200 hover:border-rose-800 hover:text-rose-800"
                                    }`}
                            >
                                {tool.icon} {tool.label}
                            </button>
                        ))}
                    </div>
                )}

                {!canUseTool && selectedSources.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
                        <p className="text-xs font-semibold text-amber-700">Select at least 2 sources to use AI tools.</p>
                    </div>
                )}

                {/* Active tool banner */}
                {activeTool && canUseTool && (
                    <div className="mb-6">
                        <ToolBanner
                            tool={activeTool}
                            sources={selectedSources}
                            onContradictionFound={setContradiction}
                        />
                    </div>
                )}

                {/* Contradiction found card (from synthesis) */}
                {contradiction && activeTool !== "contradiction" && (
                    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                        <h4 className="text-[10px] font-black text-rose-700 uppercase tracking-widest mb-2">Contradiction Found</h4>
                        <p className="text-sm text-stone-700 leading-relaxed">{contradiction}</p>
                    </div>
                )}

                {/* Selected sources as cards */}
                {selectedSources.length > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-black font-serif text-stone-900">
                                {selectedSources.length} Selected Source{selectedSources.length > 1 ? "s" : ""}
                            </h2>
                        </div>
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
                )}

                {selectedSources.length === 0 && !showSelector && (
                    <div className="text-center py-20 text-stone-400">
                        <FileText size={36} className="mx-auto mb-4 opacity-30" />
                        <p className="font-semibold text-base mb-1">No sources selected</p>
                        <p className="text-sm">Click "Add sources" to pick articles from your library or upload files.</p>
                    </div>
                )}
            </div>
        </div>
    );
}