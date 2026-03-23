"use client";

import {
  Search, Sparkles, Filter, ArrowRight, ArrowLeft, Globe,
  Eye, EyeOff, BookOpen, Quote, ExternalLink,
  ChevronDown, ChevronUp, Bookmark, BookmarkCheck, X, FolderOpen, Check, Unlock
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheck } from 'react-icons/fa6';
import AgentThinking from "@/components/AgentThinking";
import { useLibrary } from "@/lib/libraryContext";
import FolderPickerPopup from "@/components/FolderPickerPopup";

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

function saveSession(data: object) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("dunong_search", JSON.stringify(data));
}


export default function ResearcherPage() {
  const { folders, saveArticle } = useLibrary();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [resultsMode, setResultsMode] = useState(false);
  const [localOnly, setLocalOnly] = useState(true);
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);
  const [expandedCards, setExpandedCards] = useState<ExpandedCardState>({});
  const [bookmarkPopupArticle, setBookmarkPopupArticle] = useState<Article | null>(null);
  const [recentlySaved, setRecentlySaved] = useState<Record<string, boolean>>({});

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("credibility");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");

  const [inputFocused, setInputFocused] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsDebounce = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Mount + restore session
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("dunong_search");
      if (raw) {
        const session = JSON.parse(raw);
        if (session.query) setQuery(session.query);
        if (session.articles?.length) setArticles(session.articles);
        if (session.agentLogs?.length) setAgentLogs(session.agentLogs);
        if (session.localOnly !== undefined) setLocalOnly(session.localOnly); // Updated for localOnly
        if (session.resultsMode) setResultsMode(session.resultsMode);
      }
    } catch { /* ignore */ }
    setMounted(true);
  }, []);

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

  // AI suggestions with debounce
  useEffect(() => {
    if (!inputFocused) {
      setFilteredSuggestions([]);
      return;
    }
    if (suggestionsDebounce.current) clearTimeout(suggestionsDebounce.current);
    suggestionsDebounce.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });
        const data = await res.json();
        setFilteredSuggestions(data.suggestions || []);
      } catch {
        setFilteredSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);
    return () => {
      if (suggestionsDebounce.current) clearTimeout(suggestionsDebounce.current);
    };
  }, [query, inputFocused]);

  const runSearch = useCallback(async (searchQuery: string, local: boolean) => { // Parameter renamed
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setResultsMode(true);
    setInputFocused(false);

    const logs: string[] = [
      `Initializing search for: "${searchQuery}"`,
      local ? "Restricting to Philippine academic databases (HERDIN, PHILJOL)..." : "Searching international and local databases...",
      "Analyzing query context...",
    ];
    setAgentLogs(logs);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, localSourcesOnly: local }), // Match backend name
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
        saveSession({ query: searchQuery, resultsMode: true, localOnly: local, articles: data.articles, agentLogs: finalLogs }); // Updated for localOnly
      } else {
        setAgentLogs([...updatedLogs, "No results found. Try a different query."]);
      }
    } catch (err) {
      console.error(err);
      setAgentLogs([...logs, "Network error. Please try again."]);
    } finally {
      setTimeout(() => { setIsSearching(false); }, 1500);
    }
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(query, localOnly); // Updated to localOnly
  };

  const handleSuggestionClick = (s: string) => {
    setQuery(s);
    setFilteredSuggestions([]);
    runSearch(s, localOnly); // Updated to localOnly
  };

  const handleLocalToggle = () => {
    const nextLocalOnly = !localOnly;
    setLocalOnly(nextLocalOnly);
    if (resultsMode && query.trim()) {
      runSearch(query, nextLocalOnly);
    }
  };

  const handleNewSearch = () => {
    setResultsMode(false);
    setIsSearching(false);
    setArticles([]);
    setQuery("");
    setAgentLogs([]);
    setExpandedCards({});
    setShowAgentPanel(false);
    setFilterBy("all");
    setSortBy("credibility");
    sessionStorage.removeItem("dunong_search");
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
        saved: isArticleSavedInAnyFolder(id),
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

  const isArticleSavedInAnyFolder = (id: string) =>
    recentlySaved[id] ??
    folders.some((f) => f.articles.some((a) => a.id === id));

  const handleBookmarkClick = (article: Article) => {
    setBookmarkPopupArticle(article);
  };

  const handlePickFolder = (folderId: string) => {
    if (!bookmarkPopupArticle) return;
    const article = bookmarkPopupArticle;
    saveArticle(folderId, {
      id: article.id,
      title: article.title,
      authors: article.authors.split(",").map(name => {
        const parts = name.trim().split(/\s+/);
        if (parts.length <= 1) return { firstName: "", lastName: parts[0] || "Unknown" };
        return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
      }),
      year: article.year,
      journal: article.journal,
      credibility: article.credibility,
      abstract: article.abstract,
      keywords: [],
      localSource: article.localSource,
      openAccess: article.openAccess,
      url: article.url,
    });
    setRecentlySaved((prev) => ({ ...prev, [article.id]: true }));
    setBookmarkPopupArticle(null);
  };

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

  const isHeroVisible = !resultsMode && !isSearching;

  if (!mounted) return null;

  return (
    <main className="min-h-screen w-full pb-24 relative flex font-sans bg-[#e8e4df]/30">


      {/* Bookmark folder picker popup */}
      {bookmarkPopupArticle && (
        <FolderPickerPopup
          articleTitle={bookmarkPopupArticle.title}
          savedFolderIds={folders
            .filter((f) => f.articles.some((a) => a.id === bookmarkPopupArticle.id))
            .map((f) => f.id)}
          onPick={handlePickFolder}
          onClose={() => setBookmarkPopupArticle(null)}
        />
      )}

      <div className={`flex-1 flex flex-col items-center ${resultsMode ? "px-8 py-8 justify-start" : "justify-center px-4"} relative`}>
        {/* New Search Button (Top Left) */}
        <AnimatePresence>
          {resultsMode && (
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={handleNewSearch}
              className="absolute top-8 left-8 z-30 flex items-center gap-1.5 text-sm font-bold text-[#521118]/70 hover:text-[#521118] transition bg-white/80 backdrop-blur-md border border-[#2b090d]/10 px-4 py-2 rounded-xl shadow-md shadow-[#2b090d]/5 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              New Search
            </motion.button>
          )}
        </AnimatePresence>

        {/* Hero */}
        <AnimatePresence mode="popLayout">
          {isHeroVisible && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.4 } }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl text-center mb-10 w-full"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#e8e4df]/60 border border-[#e8e4df] shadow-sm backdrop-blur-md mb-6 text-sm font-bold text-[#2b090d]/70 tracking-wide uppercase">
                <Sparkles size={16} className="text-amber-500" />
                <span>Philippine Academic Context</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black text-[#2b090d] tracking-tight leading-[1.1] font-serif">
                Research for the
                <span className="relative inline-block ml-4 text-[#521118]">
                  Iskolar.
                  <svg className="absolute -bottom-2 inset-x-0 w-full text-amber-500/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 10 Q 50 20 100 10" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mt-5 text-lg text-stone-500 max-w-2xl mx-auto font-medium leading-relaxed">
                Find credible local studies, check for contradictions, and synthesize verified insights.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <motion.div
          layout
          initial={false}
          animate={{
            scale: inputFocused && !resultsMode ? 1.02 : 1,
            y: inputFocused && !resultsMode ? -5 : 0
          }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full max-w-4xl relative z-[60] mx-auto ${resultsMode ? "mb-6" : ""}`}
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className={`relative transition-all duration-500 rounded-[2.5rem] p-3 flex ring-4 ${inputFocused
              ? "bg-[#f4f2f0] border-[#521118]/40 shadow-[0_20px_80px_-15px_rgba(82,17,24,0.35)] ring-[#521118]/15"
              : "bg-[#e8e4df]/85 backdrop-blur-md border-[#2b090d]/20 shadow-[0_20px_80px_-15px_rgba(43,9,13,0.30)] ring-[#e8e4df]/60"
              } border`}>
              <div className="pl-6 pr-4 flex items-center justify-center text-[#521118]/60">
                <Search size={24} strokeWidth={2.5} />
              </div>
              <input
                ref={inputRef}
                className="flex-1 bg-transparent border-none outline-none text-lg lg:text-xl py-4 text-[#2b090d] placeholder:text-[#2b090d]/30 font-serif"
                placeholder="What topic are you researching today?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 150)}
                disabled={isSearching && !resultsMode}
              />
              <div className="flex items-center gap-3 pr-2 border-l border-[#2b090d]/10 pl-4 py-2">
                <button
                  type="submit"
                  disabled={!query.trim() || isSearching}
                  className="bg-[#521118] text-[#e8e4df] h-full px-7 rounded-2xl text-base font-bold shadow-md hover:bg-[#2b090d] transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-2 group/btn"
                >
                  {isSearching && !resultsMode ? <span className="animate-pulse">Searching</span> : <span>Research</span>}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>

            {/* AI Suggestions dropdown */}
            <AnimatePresence>
              {inputFocused && (loadingSuggestions || filteredSuggestions.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-[#e8e4df] border border-[#e8e4df] rounded-2xl shadow-xl overflow-hidden z-50"
                >
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {loadingSuggestions ? (
                      <div className="px-4 py-3 flex gap-2 items-center">
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse delay-75" />
                        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse delay-150" />
                      </div>
                    ) : (
                      filteredSuggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onMouseDown={() => handleSuggestionClick(s)}
                          className="w-full text-left px-4 py-3 text-sm text-[#2b090d] hover:bg-[#e8e4df]/60 transition flex items-center gap-3 border-b border-[#2b090d]/10 last:border-0"
                        >
                          <Search size={13} className="text-stone-300" />
                          {s}
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>
        </motion.div>

        {/* Filter/Sort Bar */}
        <AnimatePresence>
          {(resultsMode || isSearching) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              className="w-full max-w-4xl mt-3 flex items-center justify-between px-2 relative z-20"
            >
              <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                <div
                  onClick={handleLocalToggle}
                  className={`w-9 h-5 rounded-full transition-colors relative flex items-center cursor-pointer ${localOnly ? "bg-[#521118]" : "bg-[#e8e4df]"}`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm absolute transition-transform ${localOnly ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </div>
                <span className="text-xs font-semibold text-[#2b090d]/70 flex items-center gap-1.5 leading-none">
                  <Globe size={13} />
                  {localOnly ? "Local sources only" : "All sources"}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <div className="relative" ref={filterMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className="group flex items-center gap-2 text-sm font-bold text-[#521118] hover:text-[#2b090d] hover:bg-[#521118]/5 transition-all bg-white border border-[#2b090d]/20 px-3 py-1.5 rounded-xl shadow-sm hover:shadow-md shadow-[#2b090d]/5"
                  >
                    <Filter size={13} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12" />
                    Filter & Sort
                    <ChevronDown size={13} className={`transition-transform duration-300 ease-out ${showFilterMenu ? "rotate-180" : "group-hover:translate-y-[2px]"}`} />
                  </button>

                  <AnimatePresence>
                    {showFilterMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-[#e8e4df] border border-[#e8e4df] rounded-2xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-[#2b090d]/10">
                          <p className="text-xs font-bold text-[#521118]/60 uppercase tracking-wider">Sort by</p>
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
                            className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between ${sortBy === opt.value ? "bg-[#521118]/10 font-semibold text-[#2b090d]" : "text-[#2b090d]/70 hover:bg-[#521118]/10"}`}
                          >
                            {opt.label}
                            {sortBy === opt.value && <span className="w-2 h-2 rounded-full bg-[#521118]" />}
                          </button>
                        ))}
                        <div className="px-3 py-2 border-t border-[#2b090d]/10 mt-1">
                          <p className="text-xs font-bold text-[#521118]/60 uppercase tracking-wider">Filter by</p>
                        </div>
                        {[
                          { value: "all", label: "All results" },
                          { value: "local", label: "Local sources only" },
                          { value: "open_access", label: "Open access only" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => { setFilterBy(opt.value as FilterOption); setShowFilterMenu(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between ${filterBy === opt.value ? "bg-[#521118]/10 font-semibold text-[#2b090d]" : "text-[#2b090d]/70 hover:bg-[#521118]/10"}`}
                          >
                            {opt.label}
                            {filterBy === opt.value && <span className="w-2 h-2 rounded-full bg-[#521118]" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => setShowAgentPanel(!showAgentPanel)}
                  className="group flex items-center gap-2 text-sm font-bold text-[#521118] hover:text-[#2b090d] hover:bg-[#521118]/5 transition-all bg-white border border-[#2b090d]/20 px-3 py-1.5 rounded-xl shadow-sm hover:shadow-md shadow-[#2b090d]/5"
                >
                  {showAgentPanel ? <EyeOff size={13} className="transition-all duration-300 ease-out group-hover:scale-90 opacity-70 group-hover:opacity-100" /> : <Eye size={13} className="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:rotate-12" />}
                  Agent Thinking
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {resultsMode && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto w-full pb-20"
            >
              <div className="flex items-end justify-between mb-8 mt-6 border-b border-[#2b090d]/10 pb-4">
                <h2 className="text-3xl font-black font-serif text-[#2b090d] flex items-center gap-4 flex-wrap">
                  {displayedArticles.length} Results
                  <div className="flex items-center gap-2 mt-1">
                    {filterBy !== "all" && (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {filterBy === "local" ? "Local only" : "Open access only"}
                      </span>
                    )}
                    {localOnly && filterBy === "all" && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        PH sources
                      </span>
                    )}
                  </div>
                </h2>
                {isSearching && (
                  <span className="text-sm font-bold text-[#521118]/40 animate-pulse pb-1">Re-searching...</span>
                )}
              </div>

              <div className="space-y-3">
                {displayedArticles.map((article) => {
                  const cardState = expandedCards[article.id];
                  const isOpen = cardState?.open || false;
                  const isSaved = isArticleSavedInAnyFolder(article.id);

                  return (
                    <div key={article.id} className="bg-[#e8e4df]/50 border border-[#e8e4df] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {article.localSource && (
                                <span className="h-6 inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2.5 rounded-full bg-[#521118]/5 text-[#521118]/60 border border-[#2b090d]/10">
                                  {article.source || "Local Source"}
                                </span>
                              )}
                              {article.openAccess && (
                                <span className="h-6 inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2.5 rounded-full bg-[#2e1065]/5 text-[#2e1065] border border-[#2e1065]/10 gap-1.5">
                                  <Unlock size={10} strokeWidth={3} /> Open Access
                                </span>
                              )}
                              <span className={`h-6 inline-flex items-center text-[10px] font-black uppercase tracking-widest px-2.5 rounded-full border gap-1.5 ${credibilityColor(article.credibility).replace('px-2 py-0.5', '')}`}>
                                <FaCheck size={10} strokeWidth={3} /> {article.credibility}/100
                              </span>
                              {article.citationCount !== undefined && article.citationCount > 0 && (
                                <span className="h-6 inline-flex items-center text-[10px] font-black uppercase tracking-widest text-[#521118]/30 px-1">{article.citationCount} citations</span>
                              )}
                            </div>
                            <button onClick={() => toggleCard(article)} className="text-left font-bold text-[#2b090d] text-base leading-snug hover:text-[#521118] transition-colors line-clamp-6">
                              {article.title}
                            </button>
                            <p className="text-sm text-[#2b090d]/60 mt-1">{article.authors} · {article.journal} · {article.year}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleBookmarkClick(article)}
                              className={`p-2 rounded-xl border transition-all ${isSaved ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-[#e8e4df]/80 border-[#e8e4df] text-[#521118]/40 hover:text-[#521118]"}`}
                              title={isSaved ? "Saved to Library" : "Save to Library"}
                            >
                              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                            </button>
                            <button onClick={() => toggleCard(article)} className="p-2 rounded-xl border border-[#e8e4df] bg-[#e8e4df]/80 text-[#521118]/40 hover:text-[#521118] transition">
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
                            <div className="px-5 pb-5 border-t border-[#2b090d]/10 pt-4 space-y-4">
                              {article.abstract && (
                                <div>
                                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#521118]/50 mb-2 flex items-center gap-1">
                                    <BookOpen size={12} /> Abstract
                                  </h4>
                                  <p className="text-sm text-[#2b090d]/70 leading-relaxed">{article.abstract}</p>
                                </div>
                              )}
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1">
                                  <Sparkles size={12} /> Plain Language Summary
                                </h4>
                                {cardState?.loadingLayman ? (
                                  <div className="flex items-center gap-2 text-sm text-[#521118]/50">
                                    <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse" />
                                    Generating plain language summary...
                                  </div>
                                ) : (
                                  <p className="text-sm text-[#2b090d]/80 leading-relaxed bg-[#521118]/5 border border-[#521118]/10 rounded-xl p-3">
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
                                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition ${(cardState?.citationFormat || "APA") === fmt ? "bg-[#521118] text-[#e8e4df] border-[#521118]" : "bg-[#e8e4df]/60 text-[#2b090d]/70 border-[#e8e4df] hover:border-[#521118]/40"}`}
                                    >
                                      {fmt}
                                    </button>
                                  ))}
                                  <button
                                    onClick={() => generateCitation(article)}
                                    disabled={cardState?.loadingCitation}
                                    className="ml-auto px-4 py-1.5 rounded-lg text-xs font-bold bg-[#521118] text-[#e8e4df] hover:bg-[#2b090d] transition disabled:opacity-50"
                                  >
                                    {cardState?.loadingCitation ? "Generating..." : "Generate"}
                                  </button>
                                </div>
                                {cardState?.generatedCitation && (
                                  <div className="bg-[#e8e4df]/60 border border-[#e8e4df] rounded-xl p-3 text-sm text-[#2b090d]/80 font-mono leading-relaxed flex items-start justify-between gap-2">
                                    <span>{cardState.generatedCitation}</span>
                                    <button onClick={() => navigator.clipboard.writeText(cardState.generatedCitation)} className="shrink-0 text-xs text-[#521118]/50 hover:text-[#521118] transition">Copy</button>
                                  </div>
                                )}
                              </div>
                              {article.url && (
                                <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-bold text-[#521118] hover:text-[#2b090d] transition">
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
                <div className="text-center py-16 text-[#521118]/40">
                  <Filter size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="font-semibold">No results match your filter.</p>
                  <button onClick={() => setFilterBy("all")} className="mt-3 text-sm text-[#521118] font-bold hover:underline">Clear filter</button>
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
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="w-80 bg-[#e8e4df] border-l border-[#2b090d]/10 shadow-2xl flex flex-col h-screen sticky top-0 shrink-0 z-40 overflow-hidden"
          >
            <div className="p-5 border-b border-[#2b090d]/10 bg-[#e8e4df]/80 flex justify-between items-center">
              <h3 className="font-bold text-[#2b090d] flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" /> Agent Thinking
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <AgentThinking logs={agentLogs} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
