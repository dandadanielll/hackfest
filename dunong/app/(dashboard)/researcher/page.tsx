"use client";

import {
  Search, Sparkles, Filter, ArrowRight, Globe,
  Eye, EyeOff, BookOpen, Quote, ExternalLink,
  ChevronDown, ChevronUp, Bookmark, BookmarkCheck, X
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AgentThinking from "@/components/AgentThinking";

interface Article {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  credibility: number;
  abstract: string;
  localSource: boolean;
  openAccess: boolean;
  url: string;
  source?: string;
  doi?: string;
  citationCount?: number;
}

interface ExpandedCardState {
  [key: string]: {
    open: boolean;
    laymanDesc: string;
    loadingLayman: boolean;
    citationFormat: string;
    generatedCitation: string;
    loadingCitation: boolean;
    saved: boolean;
  };
}

type SortOption = "credibility" | "year_desc" | "year_asc" | "citations";
type FilterOption = "all" | "local" | "open_access";

const SUGGESTIONS = [
  "stunting and cognitive development Filipino children",
  "climate change adaptation Philippine agriculture",
  "mental health interventions Filipino adolescents",
  "dengue fever epidemiology Philippines",
  "microplastics Pasig River contamination",
  "K-12 curriculum implementation Philippines",
  "COVID-19 vaccine hesitancy Filipino communities",
  "mangrove restoration Visayas",
];

function getSavedArticles(): Article[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem("dunong_library") || "[]"); }
  catch { return []; }
}

function saveArticle(article: Article) {
  const saved = getSavedArticles();
  if (!saved.find((a) => a.id === article.id)) {
    saved.push(article);
    localStorage.setItem("dunong_library", JSON.stringify(saved));
  }
}

function unsaveArticle(id: string) {
  localStorage.setItem("dunong_library", JSON.stringify(getSavedArticles().filter((a) => a.id !== id)));
}

function isArticleSaved(id: string): boolean {
  return getSavedArticles().some((a) => a.id === id);
}

function loadSession() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(sessionStorage.getItem("dunong_search") || "null"); }
  catch { return null; }
}

function saveSession(data: object) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("dunong_search", JSON.stringify(data));
}

export default function ResearcherPage() {
  const session = loadSession();

  const [query, setQuery] = useState(session?.query || "");
  const [isSearching, setIsSearching] = useState(false);
  const [resultsMode, setResultsMode] = useState(session?.resultsMode || false);
  const [showInternational, setShowInternational] = useState(session?.showInternational || false);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [articles, setArticles] = useState<Article[]>(session?.articles || []);
  const [agentLogs, setAgentLogs] = useState<string[]>(session?.agentLogs || []);
  const [expandedCards, setExpandedCards] = useState<ExpandedCardState>({});

  // Filter/sort state
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("credibility");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  // Search bar focus state
  const [inputFocused, setInputFocused] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Close filter menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Update suggestions when query changes
  useEffect(() => {
    if (query.trim().length > 1) {
      setFilteredSuggestions(
        SUGGESTIONS.filter((s) => s.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
      );
    } else if (inputFocused && !query.trim()) {
      setFilteredSuggestions(SUGGESTIONS.slice(0, 5));
    } else {
      setFilteredSuggestions([]);
    }
  }, [query, inputFocused]);

  const runSearch = useCallback(async (searchQuery: string, international: boolean) => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setResultsMode(false);
    setShowAgentPanel(true);
    setInputFocused(false);

    const logs: string[] = [
      `Analyzing query: "${searchQuery}"`,
      `Querying OpenAlex (filter: institutions.country_code=PH)...`,
      `Querying PHILJOL OAI-PMH...`,
    ];
    if (international) {
      logs.push("International toggle ON — querying Semantic Scholar...");
      logs.push("Querying CrossRef...");
    }
    setAgentLogs(logs);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, localSourcesOnly: !international }),
      });

      const updatedLogs = [
        ...logs,
        "Deduplicating results by DOI and title...",
        "Scoring credibility across all sources...",
        "Surfacing Philippine-authored papers first...",
      ];
      setAgentLogs(updatedLogs);

      const data = await res.json();

      if (data.articles) {
        setArticles(data.articles);
        const finalLogs = [...updatedLogs, `Returned ${data.articles.length} verified results.`, "Ready for review."];
        setAgentLogs(finalLogs);
        saveSession({ query: searchQuery, resultsMode: true, showInternational: international, articles: data.articles, agentLogs: finalLogs });
      } else {
        setAgentLogs([...updatedLogs, "No results found. Try a different query."]);
      }
    } catch (err) {
      console.error(err);
      setAgentLogs([...logs, "Network error. Please try again."]);
    } finally {
      setTimeout(() => { setIsSearching(false); setResultsMode(true); }, 1500);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(query, showInternational);
  };

  const handleSuggestionClick = (s: string) => {
    setQuery(s);
    setFilteredSuggestions([]);
    runSearch(s, showInternational);
  };

  // When international toggle changes AFTER results are shown, re-search
  const handleInternationalToggle = () => {
    const next = !showInternational;
    setShowInternational(next);
    if (resultsMode && query.trim()) {
      runSearch(query, next);
    }
  };

  const toggleCard = async (article: Article) => {
    const id = article.id;
    const current = expandedCards[id];

    if (current?.open) {
      setExpandedCards((prev) => ({ ...prev, [id]: { ...prev[id], open: false } }));
      return;
    }

    setExpandedCards((prev) => ({
      ...prev,
      [id]: {
        open: true,
        laymanDesc: current?.laymanDesc || "",
        loadingLayman: !current?.laymanDesc,
        citationFormat: current?.citationFormat || "APA",
        generatedCitation: current?.generatedCitation || "",
        loadingCitation: false,
        saved: isArticleSaved(id),
      },
    }));

    if (!current?.laymanDesc && article.abstract) {
      try {
        const res = await fetch("/api/layman", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: article.title, abstract: article.abstract }),
        });
        const data = await res.json();
        setExpandedCards((prev) => ({
          ...prev,
          [id]: { ...prev[id], laymanDesc: data.description || "Could not generate description.", loadingLayman: false },
        }));
      } catch {
        setExpandedCards((prev) => ({
          ...prev,
          [id]: { ...prev[id], laymanDesc: "Could not generate description.", loadingLayman: false },
        }));
      }
    } else {
      setExpandedCards((prev) => ({ ...prev, [id]: { ...prev[id], loadingLayman: false } }));
    }
  };

  const generateCitation = async (article: Article) => {
    const id = article.id;
    const format = expandedCards[id]?.citationFormat || "APA";
    setExpandedCards((prev) => ({ ...prev, [id]: { ...prev[id], loadingCitation: true, generatedCitation: "" } }));
    try {
      const res = await fetch("/api/citation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${article.title}. ${article.authors}. ${article.journal}. ${article.year}.`,
          url: article.url,
          doi: article.doi,
          format,
        }),
      });
      const data = await res.json();
      const citation = format === "APA" ? data.apa : format === "MLA" ? data.mla : data.chicago;
      setExpandedCards((prev) => ({
        ...prev,
        [id]: { ...prev[id], generatedCitation: citation || "Could not generate citation.", loadingCitation: false },
      }));
    } catch {
      setExpandedCards((prev) => ({
        ...prev,
        [id]: { ...prev[id], generatedCitation: "Error generating citation.", loadingCitation: false },
      }));
    }
  };

  const handleSaveToggle = (article: Article) => {
    const id = article.id;
    const currently = expandedCards[id]?.saved ?? isArticleSaved(id);
    currently ? unsaveArticle(id) : saveArticle(article);
    setExpandedCards((prev) => ({ ...prev, [id]: { ...prev[id], saved: !currently } }));
  };

  // Apply sort and filter to articles
  const displayedArticles = [...articles]
    .filter((a) => {
      if (filterBy === "local") return a.localSource;
      if (filterBy === "open_access") return a.openAccess;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "credibility") return b.credibility - a.credibility;
      if (sortBy === "year_desc") return parseInt(b.year || "0") - parseInt(a.year || "0");
      if (sortBy === "year_asc") return parseInt(a.year || "0") - parseInt(b.year || "0");
      if (sortBy === "citations") return (b.citationCount || 0) - (a.citationCount || 0);
      return 0;
    });

  const credibilityColor = (score: number) => {
    if (score >= 80) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 60) return "text-amber-700 bg-amber-50 border-amber-200";
    return "text-red-700 bg-red-50 border-red-200";
  };

  const heroCollapsed = inputFocused && !resultsMode;

  return (
    <main className="min-h-screen pb-24 relative flex font-sans">
      <div className="fixed top-0 inset-x-0 h-96 bg-gradient-to-b from-rose-900/5 to-transparent pointer-events-none -z-10" />

      <div className={`flex-1 transition-all duration-700 ease-[0.16,1,0.3,1] ${resultsMode ? "px-8 py-8" : "flex flex-col items-center justify-start pt-20 px-4"}`}>

        {/* Hero — collapses on input focus */}
        <AnimatePresence>
          {!resultsMode && !isSearching && !heroCollapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl text-center mb-10 w-full"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-stone-200/60 shadow-sm backdrop-blur-md mb-6 text-sm font-bold text-stone-600 tracking-wide uppercase">
                <Sparkles size={16} className="text-amber-500" />
                <span>Philippine Academic Context</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-stone-900 tracking-tight leading-[1.1] font-serif">
                Research for the
                <span className="relative inline-block ml-4 text-rose-900">
                  Iskolar.
                  <svg className="absolute -bottom-2 inset-x-0 w-full text-amber-500/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 10 Q 50 20 100 10" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mt-5 text-lg text-stone-500 max-w-2xl mx-auto font-medium leading-relaxed">
                Connects to <span className="text-stone-800 font-bold border-b-2 border-amber-200">HERDIN</span> and{" "}
                <span className="text-stone-800 font-bold border-b-2 border-amber-200">PHILJOL</span>. Find credible local studies, check for contradictions, and synthesize verified insights.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Condensed label when focused */}
        <AnimatePresence>
          {heroCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 text-center"
            >
              <span className="text-lg font-bold font-serif text-stone-700">What are you researching?</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <motion.div
          layout
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full max-w-4xl relative z-20 ${resultsMode ? "mb-6 mx-auto" : ""}`}
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className="relative bg-white/90 backdrop-blur-md border border-stone-200/80 rounded-[2.5rem] p-3 flex shadow-2xl shadow-stone-200/50 ring-4 ring-white/50">
              <div className="pl-6 pr-4 flex items-center justify-center text-stone-400">
                <Search size={24} strokeWidth={2.5} />
              </div>
              <input
                ref={inputRef}
                className="flex-1 bg-transparent border-none outline-none text-lg lg:text-xl py-4 text-stone-800 placeholder:text-stone-300 font-serif"
                placeholder="What topic are you researching today?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 150)}
                disabled={isSearching && !resultsMode}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); setFilteredSuggestions(SUGGESTIONS.slice(0, 5)); inputRef.current?.focus(); }}
                  className="flex items-center justify-center text-stone-300 hover:text-stone-500 transition mr-2"
                >
                  <X size={18} />
                </button>
              )}
              <div className="flex items-center gap-3 pr-2 border-l border-stone-100 pl-4 py-2">
                <button
                  type="submit"
                  disabled={!query.trim() || isSearching}
                  className="bg-stone-900 text-stone-50 h-full px-7 rounded-2xl text-base font-bold shadow-md hover:bg-rose-900 transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-2 group/btn"
                >
                  {isSearching && !resultsMode ? <span className="animate-pulse">Searching</span> : <span>Research</span>}
                  <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* AI Suggestions dropdown */}
            <AnimatePresence>
              {inputFocused && filteredSuggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  <div className="px-4 py-2 border-b border-stone-100 flex items-center gap-2">
                    <Sparkles size={12} className="text-amber-500" />
                    <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Suggested queries</span>
                  </div>
                  {filteredSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onMouseDown={() => handleSuggestionClick(s)}
                      className="w-full text-left px-4 py-3 text-sm text-stone-700 hover:bg-stone-50 transition flex items-center gap-3 border-b border-stone-50 last:border-0"
                    >
                      <Search size={13} className="text-stone-300 shrink-0" />
                      {s}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Toggles below search bar — shown after search */}
          <AnimatePresence>
            {(resultsMode || isSearching) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-3 flex items-center gap-4 px-2"
              >
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div
                    onClick={handleInternationalToggle}
                    className={`w-9 h-5 rounded-full transition-colors relative flex items-center cursor-pointer ${showInternational ? "bg-blue-500" : "bg-stone-300"}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute transition-transform ${showInternational ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-xs font-semibold text-stone-600 flex items-center gap-1">
                    <Globe size={13} />
                    {showInternational ? "Showing all sources" : "Local sources only"}
                  </span>
                </label>

                <div className="flex items-center gap-2 ml-auto">
                  {/* Filter button with dropdown */}
                  <div className="relative" ref={filterMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowFilterMenu(!showFilterMenu)}
                      className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-900 transition bg-white border border-stone-200 px-3 py-1.5 rounded-xl"
                    >
                      <Filter size={13} />
                      Filter & Sort
                      <ChevronDown size={13} className={`transition-transform ${showFilterMenu ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {showFilterMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: -4, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -4, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-52 bg-white border border-stone-200 rounded-2xl shadow-xl z-50 overflow-hidden"
                        >
                          <div className="px-3 py-2 border-b border-stone-100">
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Sort by</p>
                          </div>
                          {[
                            { value: "credibility", label: "Credibility (highest first)" },
                            { value: "year_desc", label: "Year (newest first)" },
                            { value: "year_asc", label: "Year (oldest first)" },
                            { value: "citations", label: "Citations (most cited)" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => { setSortBy(opt.value as SortOption); setShowFilterMenu(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between ${sortBy === opt.value ? "bg-stone-50 font-semibold text-stone-900" : "text-stone-600 hover:bg-stone-50"}`}
                            >
                              {opt.label}
                              {sortBy === opt.value && <span className="w-2 h-2 rounded-full bg-rose-900" />}
                            </button>
                          ))}
                          <div className="px-3 py-2 border-t border-stone-100 mt-1">
                            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Filter by</p>
                          </div>
                          {[
                            { value: "all", label: "All results" },
                            { value: "local", label: "Local sources only" },
                            { value: "open_access", label: "Open access only" },
                          ].map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => { setFilterBy(opt.value as FilterOption); setShowFilterMenu(false); }}
                              className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between ${filterBy === opt.value ? "bg-stone-50 font-semibold text-stone-900" : "text-stone-600 hover:bg-stone-50"}`}
                            >
                              {opt.label}
                              {filterBy === opt.value && <span className="w-2 h-2 rounded-full bg-rose-900" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Agent toggle */}
                  <button
                    type="button"
                    onClick={() => setShowAgentPanel(!showAgentPanel)}
                    className="flex items-center gap-2 text-sm font-semibold text-stone-500 hover:text-stone-900 transition bg-white border border-stone-200 px-3 py-1.5 rounded-xl"
                  >
                    {showAgentPanel ? <EyeOff size={13} /> : <Eye size={13} />}
                    {showAgentPanel ? "Hide Agent" : "Show Agent"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {resultsMode && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto w-full pb-20"
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black font-serif text-stone-900 flex items-center gap-2">
                  {displayedArticles.length} Results
                  {filterBy !== "all" && (
                    <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                      {filterBy === "local" ? "Local only" : "Open access only"}
                    </span>
                  )}
                  {!showInternational && filterBy === "all" && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      PH sources
                    </span>
                  )}
                </h2>
                {isSearching && (
                  <span className="text-xs text-stone-400 animate-pulse">Re-searching...</span>
                )}
              </div>

              <div className="space-y-3">
                {displayedArticles.map((article) => {
                  const cardState = expandedCards[article.id];
                  const isOpen = cardState?.open || false;
                  const isSaved = cardState?.saved ?? isArticleSaved(article.id);

                  return (
                    <div key={article.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {article.localSource && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                  {article.source || "Local"}
                                </span>
                              )}
                              {article.openAccess && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Open Access
                                </span>
                              )}
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${credibilityColor(article.credibility)}`}>
                                {article.credibility}/100
                              </span>
                              {article.citationCount !== undefined && article.citationCount > 0 && (
                                <span className="text-xs text-stone-400">{article.citationCount} citations</span>
                              )}
                            </div>
                            <button onClick={() => toggleCard(article)} className="text-left font-bold text-stone-900 text-base leading-snug hover:text-rose-900 transition-colors">
                              {article.title}
                            </button>
                            <p className="text-sm text-stone-500 mt-1">{article.authors} · {article.journal} · {article.year}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleSaveToggle(article)}
                              className={`p-2 rounded-xl border transition-all ${isSaved ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-stone-50 border-stone-200 text-stone-400 hover:text-stone-700"}`}
                              title={isSaved ? "Saved to Library" : "Save to Library"}
                            >
                              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                            </button>
                            <button onClick={() => toggleCard(article)} className="p-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-400 hover:text-stone-700 transition">
                              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-5 border-t border-stone-100 pt-4 space-y-4">
                              {article.abstract && (
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1">
                                    <BookOpen size={12} /> Abstract
                                  </h4>
                                  <p className="text-sm text-stone-600 leading-relaxed">{article.abstract}</p>
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1">
                                  <Sparkles size={12} /> Plain Language Summary
                                </h4>
                                {cardState?.loadingLayman ? (
                                  <div className="flex items-center gap-2 text-sm text-stone-400">
                                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                                    Generating plain language summary...
                                  </div>
                                ) : (
                                  <p className="text-sm text-stone-700 leading-relaxed bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                                    {cardState?.laymanDesc || "No abstract available to summarize."}
                                  </p>
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-1">
                                  <Quote size={12} /> Generate Citation
                                </h4>
                                <div className="flex items-center gap-2 mb-2">
                                  {["APA", "MLA", "Chicago"].map((fmt) => (
                                    <button
                                      key={fmt}
                                      onClick={() => setExpandedCards((prev) => ({ ...prev, [article.id]: { ...prev[article.id], citationFormat: fmt, generatedCitation: "" } }))}
                                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${(cardState?.citationFormat || "APA") === fmt ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-600 border-stone-200 hover:border-stone-400"}`}
                                    >
                                      {fmt}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => generateCitation(article)}
                                    disabled={cardState?.loadingCitation}
                                    className="ml-auto px-4 py-1.5 rounded-lg text-xs font-bold bg-stone-900 text-white hover:bg-rose-900 transition disabled:opacity-50"
                                  >
                                    {cardState?.loadingCitation ? "Generating..." : "Generate"}
                                  </button>
                                </div>
                                {cardState?.generatedCitation && (
                                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-700 font-mono leading-relaxed flex items-start justify-between gap-2">
                                    <span>{cardState.generatedCitation}</span>
                                    <button onClick={() => navigator.clipboard.writeText(cardState.generatedCitation)} className="shrink-0 text-xs text-stone-400 hover:text-stone-700 transition">Copy</button>
                                  </div>
                                )}
                              </div>
                              {article.url && (
                                <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-rose-900 hover:text-rose-700 transition">
                                  <ExternalLink size={14} /> View Full Paper
                                </a>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {displayedArticles.length === 0 && articles.length > 0 && (
                <div className="text-center py-16 text-stone-400">
                  <Filter size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No results match your filter. Try changing the filter options.</p>
                  <button onClick={() => setFilterBy("all")} className="mt-3 text-sm text-rose-900 font-bold hover:underline">Clear filter</button>
                </div>
              )}

              {articles.length === 0 && (
                <div className="text-center py-16 text-stone-400">
                  <Search size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No results found. Try a different search term.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Agent Panel */}
      <AnimatePresence>
        {showAgentPanel && (isSearching || resultsMode) && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-80 bg-white border-l border-stone-200 shadow-2xl flex flex-col h-screen sticky top-0 shrink-0 z-40 overflow-hidden"
          >
            <div className="p-5 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-stone-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-500" /> Agent Thinking
                </h3>
                <p className="text-xs text-stone-500 font-medium mt-0.5">Live reasoning log</p>
              </div>
              <button onClick={() => setShowAgentPanel(false)} className="text-xs font-bold text-stone-400 hover:text-stone-900 transition bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg">
                Hide
              </button>
            </div>
            <div className="flex-1 overflow-y-auto w-full p-5">
              <AgentThinking logs={agentLogs} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}