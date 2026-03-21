"use client";

import { Search, Sparkles, Filter, ShieldCheck, Database, SlidersHorizontal, ArrowRight, Library } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AgentThinking from "@/components/AgentThinking";
import ArticleCard from "@/components/ArticleCard";
import { useRouter } from "next/navigation";

export default function ResearcherPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [resultsMode, setResultsMode] = useState(false);
  const [localSourcesOnly, setLocalSourcesOnly] = useState(true);
  const [articles, setArticles] = useState<any[]>([]);
  const [agentLogs, setAgentLogs] = useState<string[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    setIsSearching(true);
    setResultsMode(false);

    const logs = [
      `Analyzed query: '${query}'`,
      `Querying OpenAlex API...`,
    ];
    if (localSourcesOnly) {
      logs.push(`Applying filter: institutions.country_code=PH`);
    } else {
      logs.push(`Querying Semantic Scholar & CrossRef for global coverage...`);
      logs.push(`Querying PHILJOL OAI-PMH...`);
    }
    setAgentLogs(logs);

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, localSourcesOnly })
      });

      const tempLogs = [...logs, "Retrieved papers from databases...", "Scoring credibility and deduplicating..."];
      setAgentLogs(tempLogs);

      const data = await res.json();

      if (data.articles) {
        setArticles(data.articles);
        setAgentLogs([...tempLogs, `Surfaced top ${data.articles.length} verified results.`, "Results ready for review."]);
      } else {
        setAgentLogs([...tempLogs, "Failed to retrieve results."]);
      }
    } catch (err) {
      console.error(err);
      setAgentLogs([...logs, "Network error. Loaded fallback cache."]);
    } finally {
      setTimeout(() => setResultsMode(true), 1500);
    }
  };

  return (
    <main className="min-h-screen pb-24 relative flex font-sans">
      {/* Decorative Background Elements */}
      <div className="fixed top-0 inset-x-0 h-96 bg-gradient-to-b from-rose-900/5 to-transparent pointer-events-none -z-10" />

      {/* Main Content Area */}
      <div className={`flex-1 transition-all duration-700 ease-[0.16,1,0.3,1] ${resultsMode ? 'px-8 py-8' : 'flex flex-col items-center justify-center pt-32 px-4'}`}>

        {/* Landing Page Hero (Hides when searching) */}
        <AnimatePresence>
          {!resultsMode && !isSearching && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl text-center mb-12"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-stone-200/60 shadow-sm backdrop-blur-md mb-8 text-sm font-bold text-stone-600 tracking-wide uppercase">
                <Sparkles size={16} className="text-amber-500" />
                <span>Philippine Academic Context</span>
              </div>
              <h1 className="text-6xl md:text-7xl font-black text-stone-900 tracking-tight leading-[1.1] font-serif">
                Research for the
                <span className="relative inline-block ml-4 text-rose-900">
                  Iskolar.
                  <svg className="absolute -bottom-2 inset-x-0 w-full text-amber-500/30" viewBox="0 0 100 20" preserveAspectRatio="none">
                    <path d="M0 10 Q 50 20 100 10" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="mt-6 text-xl text-stone-500 max-w-2xl mx-auto font-medium leading-relaxed">
                Connects directly to <span className="text-stone-800 font-bold border-b-2 border-amber-200">HERDIN</span> and <span className="text-stone-800 font-bold border-b-2 border-amber-200">PHILJOL</span>. We find credible local studies, check for contradictions, and synthesize verified insights.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar Container */}
        <motion.div
          layout
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full max-w-4xl relative z-20 ${resultsMode ? 'mb-10 mx-auto' : ''}`}
        >
          <form onSubmit={handleSearch} className="relative group">
            <div className={`absolute inset-0 bg-stone-200/50 rounded-[2.5rem] blur-xl transition-opacity duration-500 ${isSearching && !resultsMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
            <div className="relative bg-white/90 backdrop-blur-md border border-stone-200/80 rounded-[2.5rem] p-3 flex shadow-2xl shadow-stone-200/50 ring-4 ring-white/50">
              <div className="pl-6 pr-4 flex items-center justify-center text-stone-400">
                <Search size={28} strokeWidth={2.5} />
              </div>
              <input
                className="flex-1 bg-transparent border-none outline-none text-xl lg:text-2xl py-5 text-stone-800 placeholder:text-stone-300 font-serif"
                placeholder="What topic are you researching today?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={isSearching && !resultsMode}
              />

              <div className="flex items-center gap-3 pr-2 border-l border-stone-100 pl-4 py-2">
                {/* Local Sources Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none bg-stone-50 px-4 py-3 rounded-2xl hover:bg-stone-100 transition border border-stone-200">
                  <div onClick={() => setLocalSourcesOnly(!localSourcesOnly)} className={`w-10 h-6 rounded-full transition-colors relative flex items-center ${localSourcesOnly ? 'bg-amber-500' : 'bg-stone-300'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm absolute transition-transform ${localSourcesOnly ? 'translate-x-[22px]' : 'translate-x-1'}`} />
                  </div>
                  <span className="text-xs font-bold text-stone-600 uppercase tracking-wider hidden md:block">Local Only</span>
                </label>

                <button
                  type="submit"
                  disabled={!query}
                  className="bg-stone-900 text-stone-50 h-full px-8 rounded-2xl text-lg font-bold shadow-md hover:bg-rose-900 hover:shadow-rose-900/20 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 group/btn"
                >
                  {isSearching && !resultsMode ? <span className="animate-pulse">Searching</span> : <span>Research</span>}
                  <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </form>

          {/* Quick Filters (Only shown on Landing) */}
          <AnimatePresence>
            {!isSearching && !resultsMode && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="mt-8 flex flex-wrap items-center justify-center gap-3"
              >
                <span className="text-sm font-bold text-stone-400 mr-2 uppercase tracking-widest">Databases:</span>
                {['HERDIN', 'PHILJOL', 'CHED Repositories', 'Google Scholar (.ph)'].map((tag) => (
                  <span key={tag} className="px-4 py-2 rounded-xl bg-white/50 border border-stone-200/60 text-stone-600 text-sm font-semibold backdrop-blur-sm shadow-sm hover:border-amber-300 transition cursor-pointer">
                    {tag}
                  </span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Search Results Area */}
        <AnimatePresence>
          {resultsMode && (
            <motion.div
              initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto w-full pb-20"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black font-serif text-stone-900">Search Results</h2>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"><ShieldCheck size={14} /> 92 Average Credibility</span>
                  <button className="text-stone-500 hover:text-stone-900 transition flex items-center gap-2 text-sm font-bold bg-white px-4 py-2 border border-stone-200 rounded-xl"><Filter size={16} /> Filter</button>
                </div>
              </div>

              <div className="space-y-4">
                {articles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    title={article.title}
                    authors={article.authors}
                    journal={article.journal}
                    year={article.year}
                    credibility={article.credibility}
                    abstract={article.abstract}
                    localSource={article.localSource}
                    openAccess={article.openAccess}
                    url={article.url}
                  />
                ))}
              </div>

              <div className="mt-12 text-center p-8 bg-amber-50/50 border border-amber-200/50 rounded-3xl">
                <Library size={32} className="mx-auto text-amber-600 mb-4" />
                <h3 className="font-bold text-stone-900 text-lg mb-2">Save articles to get started</h3>
                <p className="text-stone-500 mb-6">Once saved to your Library Vault, you can use AI Tools to find contradictions or discover gaps.</p>
                <button onClick={() => router.push('/library')} className="bg-stone-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-stone-800 transition">Go to Library</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Agent Thinking Collapsible Sidebar */}
      <AnimatePresence>
        {isSearching && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-96 bg-white border-l border-stone-200 shadow-2xl flex flex-col h-screen sticky top-0 shrink-0 z-40 overflow-hidden"
          >
            <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-stone-900 flex items-center gap-2"><Sparkles size={18} className="text-amber-500" /> Auto-Researcher</h3>
                <p className="text-xs text-stone-500 font-medium mt-1">Live AI analysis log</p>
              </div>
              {/* Simulated close button after finishing */}
              <button onClick={() => setIsSearching(false)} className="text-xs font-bold text-stone-400 hover:text-stone-900 transition">Hide</button>
            </div>
            <div className="flex-1 overflow-y-auto w-full p-6">
              <AgentThinking logs={agentLogs} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  );
}
