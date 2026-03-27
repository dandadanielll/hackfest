"use client";

import {
  Search, Sparkles, Filter, ArrowRight, ArrowLeft, Globe,
  Eye, EyeOff, BookOpen, Quote, ExternalLink,
  ChevronDown, ChevronUp, Bookmark, BookmarkCheck, X, FolderOpen, Check, Unlock, RefreshCw
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCheck } from 'react-icons/fa6';
import { useLibrary } from "@/lib/libraryContext";
import { useDevMode } from "@/lib/devModeContext";
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


const SENSITIVE_KEYWORDS = [
  // Self-harm & Suicide
  "suicide", "suicidal", "kill myself", "end my life", "want to die", 
  "self harm", "cutting myself", "overdose", "slit my wrists",
  // Mental Health Crises
  "depressed", "depression", "severe anxiety", "panic attack", 
  "schizophrenia", "eating disorder", "anorexia", "bulimia",
  // Abuse & Violence
  "domestic abuse", "domestic violence", "battered", "abusive relationship", 
  "child abuse", "physical abuse", "emotional abuse", "spouse abuse",
  // Sexual Assault & Harassment
  "rape", "raped", "sexual assault", "molestation", "molested", "incest", "sexual abuse"
];

export default function ResearchDashboard() {
  const { saveArticle, folders } = useLibrary();
  const { addLog, startLogGroup } = useDevMode();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = sessionStorage.getItem("dunong_search");
      return raw ? JSON.parse(raw).query || "" : "";
    } catch { return ""; }
  });
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [resultsMode, setResultsMode] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = sessionStorage.getItem("dunong_search");
      return raw ? !!JSON.parse(raw).resultsMode : false;
    } catch { return false; }
  });
  const [localOnly, setLocalOnly] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = sessionStorage.getItem("dunong_search");
      return raw ? JSON.parse(raw).localOnly !== false : true;
    } catch { return true; }
  });
  const [articles, setArticles] = useState<Article[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = sessionStorage.getItem("dunong_search");
      return raw ? JSON.parse(raw).articles || [] : [];
    } catch { return []; }
  });
  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      const raw = sessionStorage.getItem("dunong_search");
      return raw ? JSON.parse(raw).page || 1 : 1;
    } catch { return 1; }
  });
  const [hasMore, setHasMore] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const raw = sessionStorage.getItem("dunong_search");
      return raw ? JSON.parse(raw).hasMore !== false : true;
    } catch { return true; }
  });
  const [expandedCards, setExpandedCards] = useState<ExpandedCardState>({});
  const [bookmarkPopupArticle, setBookmarkPopupArticle] = useState<Article | null>(null);
  const [recentlySaved, setRecentlySaved] = useState<Record<string, boolean>>({});

  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("credibility");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [domainFilter, setDomainFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    try {
      const raw = sessionStorage.getItem("dunong_search");
      return raw ? JSON.parse(raw).domainFilter || "all" : "all";
    } catch { return "all"; }
  });

  const [inputFocused, setInputFocused] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const suggestionsDebounce = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Mount management
  useEffect(() => {
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

  const runSearch = useCallback(async (searchQuery: string, local: boolean, fetchPage = 1, currentArticles: Article[] = []) => { 
    if (!searchQuery.trim()) return;
    
    if (fetchPage === 1) setIsSearching(true);
    else setLoadingMore(true);

    if (fetchPage === 1) {
      setResultsMode(true);
      setInputFocused(false);
      setPage(1);
      setHasMore(true);
    }

    const source = "Search Engine";
    const groupId = startLogGroup("/researcher", fetchPage === 1 ? `Query: "${searchQuery}"` : `Fetching page ${fetchPage} for: "${searchQuery}"`, source);
    if (fetchPage === 1) {
       addLog(`Initiating search routing...`, groupId);
       addLog(local ? "Restricting to Philippine academic databases (HERDIN, PHILJOL)..." : "Searching international and local databases...", groupId);
    } else {
       addLog(`Retrieving next batch of results from upstream APIs...`, groupId);
    }

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, localSourcesOnly: local, page: fetchPage }), 
      });

      if (fetchPage === 1) addLog("Deduplicating results by DOI and title...", groupId);
      if (fetchPage === 1) addLog("Scoring credibility across all sources...", groupId);
      if (fetchPage === 1) addLog(local ? "Surfacing Philippine-authored papers first..." : "Ranking global results by impact factor and credibility...", groupId);

      const data = await res.json();
      if (data.articles) {
        const hasNext = data.articles.length >= 10;
        setHasMore(hasNext);
        const newArticles = fetchPage === 1 ? data.articles : [...currentArticles, ...data.articles];
        setArticles(newArticles);
        if (fetchPage === 1) setPage(1); 
        
        addLog(fetchPage === 1 ? `Returned ${data.articles.length} verified results.` : `Appended ${data.articles.length} additional results.`, groupId);
        if (fetchPage === 1) addLog("Ready for review.", groupId);
        
        saveSession({ query: searchQuery, resultsMode: true, localOnly: local, articles: newArticles, page: fetchPage, hasMore: hasNext, domainFilter: "all" });
      } else {
        if (fetchPage === 1) addLog("No results found. Try a different query.", groupId);
        setHasMore(false);
      }
    } catch (err) {
      console.error(err);
      addLog("Network error. Please try again.", groupId);
    } finally {
      if (fetchPage === 1) {
        setTimeout(() => { setIsSearching(false); }, 1500);
      } else {
        setLoadingMore(false);
      }
    }
  }, [addLog, saveSession, startLogGroup]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await runSearch(query, localOnly, 1, []); 
  };

  const handleSuggestionClick = (s: string) => {
    setQuery(s);
    setFilteredSuggestions([]);
    runSearch(s, localOnly, 1, []); 
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
    setExpandedCards({});
    setFilterBy("all");
    setSortBy("credibility");
    setDomainFilter("all");
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
      const groupId = startLogGroup('/researcher', `Generating Layman Summary: ${article.title.substring(0, 30)}...`, 'AI Summarizer');
      addLog('Extracting academic abstract and sending to LLM for simplification...', groupId);
      try {
        const res = await fetch("/api/layman", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: article.title, abstract: article.abstract }),
        });
        const data = await res.json();
        addLog('Successfully simplified abstract to layman terms.', groupId);
        setExpandedCards((prev) => ({
          ...prev,
          [id]: { ...prev[id], laymanDesc: data.description || "Could not generate description.", loadingLayman: false },
        }));
      } catch {
        addLog('Failed to generate layman description.', groupId);
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
    
    const groupId = startLogGroup('/researcher', `Formatting Citation: ${article.title.substring(0, 30)}...`, 'Citation Generator');
    addLog(`Generating ${format} citation for article...`, groupId);

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
      addLog(`Citation compilation successful.`, groupId);
      setExpandedCards((prev) => ({
        ...prev,
        [id]: { ...prev[id], generatedCitation: citation || "Could not generate citation.", loadingCitation: false },
      }));
    } catch {
      addLog(`Failed to compile citation data.`, groupId);
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

  const parseAuthors = (authorStr: string): { firstName: string, lastName: string }[] => {
    if (!authorStr) return [];
    return authorStr.split(/[,;]+/).map(a => {
      const parts = a.trim().split(/\s+/);
      const lastName = parts.pop() || "";
      const firstName = parts.join(" ");
      return { firstName, lastName };
    }).filter(a => a.lastName);
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

  const isSensitive = SENSITIVE_KEYWORDS.some(k => query.toLowerCase().includes(k));

  const displayedArticles = [...articles]
    .filter((a) => {
      if (filterBy === "local") return a.localSource;
      if (filterBy === "open_access") return a.openAccess;
      return true;
    })
    .filter((a) => {
      if (domainFilter === "all") return true;
      if (!a.url) return false;
      try {
        const urlObj = new URL(a.url.startsWith('http') ? a.url : `https://${a.url}`);
        return urlObj.hostname.endsWith(domainFilter) || urlObj.hostname.includes(domainFilter + ".");
      } catch {
        return a.url.toLowerCase().includes(domainFilter);
      }
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

  const isHeroVisible = !resultsMode;

  if (!mounted) return null;

  return (
    <main className="min-h-screen w-full pb-24 relative flex font-sans">


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

      <div className={`flex-1 flex flex-col items-center ${resultsMode ? "px-4 py-8 md:px-8 md:py-8 justify-start" : "justify-center px-4 mt-6 md:mt-0"} relative w-full`}>
        {/* New Research Button (Top Left) */}
        <AnimatePresence>
          {resultsMode && (
            <motion.button
              key="new-research-btn"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={handleNewSearch}
              className="group absolute top-4 left-4 md:top-8 md:left-8 z-[80] flex items-center gap-2 text-sm font-bold text-[#521118] hover:text-[#2b090d] hover:bg-[#521118]/5 transition-all bg-white border border-[#2b090d]/20 px-3 py-1.5 rounded-xl shadow-sm hover:shadow-md shadow-[#2b090d]/5 active:scale-95"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span>New Research</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Hero */}
        <AnimatePresence>
          {isHeroVisible && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.4 } }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-between mb-16 gap-12"
            >
              {/* Left Content Side */}
              <div className="flex-1 text-left flex flex-col items-start">
                <div className="inline-block px-4 py-1.5 rounded-full bg-[#521118]/5 border border-[#521118]/10 text-[#521118]/70 text-[11px] font-black uppercase tracking-[0.2em] mb-8">
                  For Filipino Researchers
                </div>
                <h1 className="text-5xl md:text-8xl font-black text-[#2b090d] tracking-tight leading-[0.9] mb-10 font-serif">
                  Research <span className="text-[#521118]/60 italic font-medium">for</span> <br />
                  the <span className="text-[#D97706] italic">Iskolar.</span>
                </h1>
                
                <div className="space-y-3.5 border-t border-[#2b090d]/10 pt-10 w-full max-w-sm">
                  {[
                    "Discover credible local research.",
                    "Analyze contradictions.",
                    "Synthesize real insights."
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#521118]/30" />
                      <p className="text-stone-600 text-lg font-medium leading-tight">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Branding Side */}
              <div className="flex flex-col items-center text-center relative">
                <div className="relative mb-0.5">
                  {/* Sun Rays Background */}
                  <div className="absolute inset-0 z-0 flex items-center justify-center scale-[1.7]">
                    <svg 
                      viewBox="0 0 100 100" 
                      className="w-full h-full text-[#521118]/[0.07] animate-spin"
                      style={{ animationDuration: '180s' }}
                    >
                      <circle cx="50" cy="50" r="16" fill="currentColor" />
                      {/* Thick Rays */}
                      {[...Array(8)].map((_, i) => (
                         <polygon
                           key={`thick-${i}`}
                           points="50,0 54,45 46,45"
                           fill="currentColor"
                           transform={`rotate(${i * 45} 50 50)`}
                         />
                      ))}
                      {/* Thin Rays */}
                      {[...Array(24)].map((_, i) => (
                        <rect
                          key={`thin-${i}`}
                          x="49.7"
                          y="0"
                          width="0.6"
                          height="50"
                          fill="currentColor"
                          transform={`rotate(${i * 15} 50 50)`}
                        />
                      ))}
                    </svg>
                  </div>
                  
                  <img
                    src="/logo.png"
                    alt="SaLiksi Logo"
                    className="w-48 h-48 md:w-80 md:h-80 object-contain select-none pointer-events-none drop-shadow-sm transition-transform duration-700 hover:scale-105"
                    draggable="false"
                  />
                </div>
                <div className="flex flex-col items-center -mt-4 md:-mt-6">
                  <h2 className="text-5xl md:text-7xl font-black text-[#2b090d] tracking-tight leading-none mb-2">
                    <span className="font-serif">sa</span><span className="italic" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Liksi</span>
                  </h2>
                  <p className="text-lg font-bold italic text-[#521118]/80 leading-none">
                    ang mabilisang pananaliksik
                  </p>
                </div>
              </div>
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
          <form onSubmit={handleSearch} className="relative">
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
                  className="group relative bg-[#521118] text-[#e8e4df] h-full px-8 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-[#521118]/20 hover:bg-[#2b090d] transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center gap-3 overflow-hidden"
                >
                  <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                  {isSearching && !resultsMode ? <span className="animate-pulse">Searching</span> : <span>Research</span>}
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
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
                        <div className="px-3 py-2 border-t border-[#2b090d]/10 mt-1">
                          <p className="text-xs font-bold text-[#521118]/60 uppercase tracking-wider">Domain</p>
                        </div>
                        {[
                          { value: "all", label: "All domains" },
                          { value: ".gov", label: "Government (.gov)" },
                          { value: ".edu", label: "Education (.edu)" },
                          { value: ".com", label: "Commercial (.com)" },
                          { value: ".org", label: "Non-profit (.org)" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => { 
                              setDomainFilter(opt.value); 
                              setShowFilterMenu(false); 
                              try {
                                const raw = sessionStorage.getItem("dunong_search");
                                if (raw) {
                                  const data = JSON.parse(raw);
                                  data.domainFilter = opt.value;
                                  sessionStorage.setItem("dunong_search", JSON.stringify(data));
                                }
                              } catch {}
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between ${domainFilter === opt.value ? "bg-[#521118]/10 font-semibold text-[#2b090d]" : "text-[#2b090d]/70 hover:bg-[#521118]/10"}`}
                          >
                            {opt.label}
                            {domainFilter === opt.value && <span className="w-2 h-2 rounded-full bg-[#521118]" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
              {isSensitive && (
                <div className="mb-6 mt-4 bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4 shadow-sm text-left">
                  <div className="p-2 bg-rose-100 rounded-lg text-rose-700 mt-0.5">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                  </div>
                  <div>
                    <h3 className="text-rose-900 font-bold text-base mb-1 tracking-tight">Help is available. You are not alone.</h3>
                    <p className="text-rose-800 text-sm leading-relaxed max-w-2xl">
                      If you or someone you know is going through a tough time, please reach out for help. Connect with the National Center for Mental Health (NCMH) Crisis Hotline at <strong className="font-bold">1553</strong> (Luzon-wide landline toll-free) or <strong className="font-bold">0917-899-USAP (8727)</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-end justify-between mb-8 mt-6 border-b border-[#2b090d]/10 pb-4">
                <h2 className="text-3xl font-black font-serif text-[#2b090d] flex items-center gap-4 flex-wrap">
                  Top Results
                  <div className="flex items-center gap-2 mt-1">
                    {filterBy !== "all" && (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {filterBy === "local" ? "Local only" : "Open access only"}
                      </span>
                    )}
                    {domainFilter !== "all" && (
                      <span className="text-xs font-bold text-[#2e1065] bg-[#2e1065]/5 border border-[#2e1065]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {domainFilter} only
                      </span>
                    )}
                    {localOnly && filterBy === "all" && domainFilter === "all" && (
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

              {hasMore && displayedArticles.length > 0 && !isSearching && (
                <div className="flex justify-center mt-10 mb-6">
                  <button
                    onClick={() => {
                      const nextPage = page + 1;
                      setPage(nextPage);
                      runSearch(query, localOnly, nextPage, articles);
                    }}
                    disabled={loadingMore}
                    className="group relative flex items-center gap-3 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] bg-white border border-[#2b090d]/10 text-[#521118] hover:bg-[#521118]/5 hover:border-[#521118]/30 transition-all duration-500 shadow-xl shadow-[#2b090d]/5 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden active:scale-95"
                  >
                    <div className="absolute inset-0 w-1/2 h-full bg-[#521118]/5 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                    {loadingMore ? (
                      <>
                        <div className="w-4 h-4 border-2 border-[#521118]/30 border-t-[#521118] rounded-full animate-spin" />
                        <span className="opacity-70">Loading sources...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} className="text-[#521118]/60 group-hover:rotate-180 transition-transform duration-500" />
                        Load More Results
                      </>
                    )}
                  </button>
                </div>
              )}

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

    </main>
  );
}
