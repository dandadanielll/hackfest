"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, MapPin, Search, Loader2, Sparkles, BookOpen, Zap, CheckCircle2 } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────── */
interface GeneratedTopic {
  title: string;
  field: string;
  problem: string;
  opportunity: string;
  resourceLink: string;
  difficulty: string;
  novelty: string;
  nextSteps: string[];
}

interface LocationData {
  name: string;
  lat: number;
  lng: number;
  problems: string[];
  resources: string[];
}

export interface GeneratedData {
  topics: GeneratedTopic[];
  location: LocationData;
  fields: string[];
}

/* ─── All research fields ───────────────────────────────────── */
const ALL_FIELDS = [
  { id: "agriculture", label: "Agriculture & Food Science", icon: "🌾" },
  { id: "marine", label: "Marine & Fisheries Science", icon: "🐟" },
  { id: "environmental", label: "Environmental Science", icon: "🌿" },
  { id: "public-health", label: "Public Health & Epidemiology", icon: "🏥" },
  { id: "computer-science", label: "Computer Science & AI", icon: "💻" },
  { id: "civil-engineering", label: "Civil & Structural Engineering", icon: "🏗️" },
  { id: "electrical-engineering", label: "Electrical & Electronics Engineering", icon: "⚡" },
  { id: "chemical-engineering", label: "Chemical & Process Engineering", icon: "⚗️" },
  { id: "mechanical-engineering", label: "Mechanical Engineering", icon: "⚙️" },
  { id: "nursing", label: "Nursing & Allied Health", icon: "🩺" },
  { id: "pharmacy", label: "Pharmacy & Pharmacology", icon: "💊" },
  { id: "medicine", label: "Medicine & Clinical Research", icon: "🔬" },
  { id: "education", label: "Education & Pedagogy", icon: "📚" },
  { id: "economics", label: "Economics & Finance", icon: "📈" },
  { id: "business", label: "Business Administration & Management", icon: "💼" },
  { id: "political-science", label: "Political Science & Governance", icon: "🏛️" },
  { id: "sociology", label: "Sociology & Social Work", icon: "🤝" },
  { id: "psychology", label: "Psychology & Behavioral Science", icon: "🧠" },
  { id: "anthropology", label: "Anthropology & Cultural Studies", icon: "🗿" },
  { id: "law", label: "Law & Legal Studies", icon: "⚖️" },
  { id: "linguistics", label: "Linguistics & Language Studies", icon: "🗣️" },
  { id: "communication", label: "Communication & Media Studies", icon: "📡" },
  { id: "architecture", label: "Architecture & Urban Planning", icon: "🏙️" },
  { id: "geology", label: "Geology & Earth Sciences", icon: "🪨" },
  { id: "physics", label: "Physics & Materials Science", icon: "⚛️" },
  { id: "chemistry", label: "Chemistry & Biochemistry", icon: "🧪" },
  { id: "biology", label: "Biology & Life Sciences", icon: "🧬" },
  { id: "forestry", label: "Forestry & Natural Resources", icon: "🌲" },
  { id: "veterinary", label: "Veterinary Science & Animal Science", icon: "🐄" },
  { id: "statistics", label: "Statistics & Data Science", icon: "📊" },
  { id: "disaster", label: "Disaster Risk Reduction", icon: "⛑️" },
  { id: "energy", label: "Renewable Energy & Power Systems", icon: "☀️" },
  { id: "mining", label: "Mining & Minerals Engineering", icon: "⛏️" },
  { id: "tourism", label: "Tourism & Hospitality", icon: "✈️" },
  { id: "social-enterprise", label: "Social Enterprise & NGO Studies", icon: "🌍" },
  { id: "indigenous", label: "Indigenous Studies & IP Rights", icon: "🪶" },
  { id: "gender", label: "Gender & Development Studies", icon: "♀️" },
];

/* ─── Location search helper ─────────────────────────────────── */
async function geocodeLocation(query: string): Promise<{ name: string; lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + " Philippines")}&format=json&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      return { name: data[0].display_name.split(",").slice(0, 3).join(", "), lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchAIContext(
  locationName: string,
  fieldLabels: string[]
): Promise<{ problems: string[]; resources: string[] }> {
  const res = await fetch("/api/generate-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ location: locationName, fields: fieldLabels }),
  });
  if (!res.ok) throw new Error("Context fetch failed");
  return res.json();
}

/* ─── Stepper progress indicator ────────────────────────────── */
function StepIndicator({ current, total }: { current: number; total: number }) {
  const labels = ["Research Field", "Your Location", "Local Focus"];
  return (
    <div className="flex items-start gap-2 mb-8 px-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center w-full">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 flex-shrink-0
                ${i < current ? "bg-[#8B1538] text-white" : i === current ? "bg-[#8B1538] text-white ring-4 ring-rose-100" : "bg-stone-100 text-stone-400"}`}
            >
              {i < current ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`h-0.5 flex-1 transition-all duration-500 ${i < current ? "bg-[#8B1538]" : "bg-stone-200"}`} />
            )}
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-widest text-center leading-tight ${i === current ? "text-[#8B1538]" : "text-stone-400"}`}>
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Step 1: Field selector ─────────────────────────────────── */
function FieldSelector({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(f => f !== id) : [...selected, id]);
  return (
    <div>
      <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Choose Your Research Field(s)</h2>
      <p className="text-stone-500 text-sm mb-6">Select one or more fields you want to research. Your topics will be tailored to these disciplines.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        {ALL_FIELDS.map(f => (
          <button
            key={f.id}
            onClick={() => toggle(f.id)}
            className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all duration-200 text-sm font-semibold
              ${selected.includes(f.id)
                ? "bg-[#8B1538] border-[#8B1538] text-white shadow-lg shadow-rose-900/20"
                : "bg-white border-stone-200 text-stone-700 hover:border-[#8B1538] hover:bg-rose-50"
              }`}
          >
            <span className="text-lg flex-shrink-0">{f.icon}</span>
            <span className="leading-tight text-xs">{f.label}</span>
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <p className="text-xs text-[#8B1538] font-bold mt-4">{selected.length} field{selected.length > 1 ? "s" : ""} selected</p>
      )}
    </div>
  );
}

/* ─── Step 2: Map + location search ─────────────────────────── */
function LocationPicker({ location, onChange }: { location: LocationData | null; onChange: (l: LocationData) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || leafletRef.current) return;
    let L: any;
    import("leaflet").then(mod => {
      L = mod.default;
      // Fix Leaflet default icon issue in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current) return;
      // Clear any stale Leaflet initialization marker left on the DOM node
      // (happens when the component unmounts/remounts, e.g. user goes Back then Next)
      if ((mapRef.current as any)._leaflet_id) {
        (mapRef.current as any)._leaflet_id = undefined;
      }
      const map = L.map(mapRef.current, { zoomControl: true }).setView([12.8797, 121.774], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Restore existing marker
      if (location) {
        markerRef.current = L.marker([location.lat, location.lng]).addTo(map).bindPopup(location.name).openPopup();
        map.setView([location.lat, location.lng], 12);
      }

      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          const name = data.display_name?.split(",").slice(0, 3).join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          onChange({ name, lat, lng, problems: [], resources: [] });
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = L.marker([lat, lng]).addTo(map).bindPopup(name).openPopup();
        } catch {
          const name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          onChange({ name, lat, lng, problems: [], resources: [] });
          if (markerRef.current) markerRef.current.remove();
          markerRef.current = L.marker([lat, lng]).addTo(map).bindPopup(name).openPopup();
        }
      });

      leafletRef.current = map;
    });

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove();
        leafletRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = useCallback(async () => {
    if (!search.trim()) return;
    setSearching(true);
    setError("");
    const result = await geocodeLocation(search);
    if (result) {
      onChange({ ...result, problems: [], resources: [] });
      if (leafletRef.current) {
        const L = (await import("leaflet")).default;
        leafletRef.current.setView([result.lat, result.lng], 13);
        if (markerRef.current) markerRef.current.remove();
        markerRef.current = L.marker([result.lat, result.lng]).addTo(leafletRef.current).bindPopup(result.name).openPopup();
      }
    } else {
      setError("Location not found. Try a different name (e.g. 'Cebu City', 'Iloilo', 'Davao').");
    }
    setSearching(false);
  }, [search, onChange]);

  return (
    <div>
      <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Pin Your Location</h2>
      <p className="text-stone-500 text-sm mb-5">Search for your city/municipality or click on the map to pin your location.</p>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search city or municipality in Philippines…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm bg-white focus:outline-none focus:border-[#8B1538] focus:ring-2 focus:ring-rose-100"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-2.5 bg-[#8B1538] text-white rounded-xl text-sm font-bold hover:bg-[#6D102C] transition-colors disabled:opacity-60 flex items-center gap-2"
        >
          {searching ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
          {searching ? "" : "Search"}
        </button>
      </div>

      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      {/* Map */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full rounded-2xl overflow-hidden border border-stone-200" style={{ height: "300px" }} />

      {location && (
        <div className="mt-4 flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-100">
          <MapPin size={14} className="text-[#8B1538] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#8B1538]">Selected Location</p>
            <p className="text-xs text-stone-600 mt-0.5 leading-tight">{location.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Step 3: Interactive context selector ───────────────────── */
function ContextSelector({
  location,
  fields,
  selectedProblems,
  onProblemsChange,
  selectedResources,
  onResourcesChange,
}: {
  location: LocationData;
  fields: string[];
  selectedProblems: string[];
  onProblemsChange: (v: string[]) => void;
  selectedResources: string[];
  onResourcesChange: (v: string[]) => void;
}) {
  const fieldLabels = fields.map(id => ALL_FIELDS.find(f => f.id === id)?.label || id);

  const toggleProblem = (p: string) =>
    onProblemsChange(selectedProblems.includes(p) ? selectedProblems.filter(x => x !== p) : [...selectedProblems, p]);

  const toggleResource = (r: string) =>
    onResourcesChange(selectedResources.includes(r) ? selectedResources.filter(x => x !== r) : [...selectedResources, r]);

  const selectAllProblems = () => onProblemsChange([...location.problems]);
  const clearProblems = () => onProblemsChange([]);
  const selectAllResources = () => onResourcesChange([...location.resources]);
  const clearResources = () => onResourcesChange([]);

  return (
    <div>
      <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1">Choose Your Focus</h2>
      <p className="text-stone-500 text-sm mb-5">
        Select the <span className="font-bold text-stone-700">local problems</span> and <span className="font-bold text-stone-700">raw materials / resources</span> in{" "}
        <span className="font-bold text-[#8B1538]">{location.name.split(",")[0]}</span> that your research will address. These directly shape the AI-generated topics.
      </p>

      <div className="space-y-5">
        {/* Selected fields reminder */}
        <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-rose-50 border border-rose-100">
          <BookOpen size={12} className="text-[#8B1538] mt-0.5 flex-shrink-0" />
          {fieldLabels.map((label, i) => (
            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#8B1538] text-white font-bold">{label}</span>
          ))}
        </div>

        {/* Problems multi-select */}
        <div className="rounded-2xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-200">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-800 flex items-center gap-2">
              <Zap size={12} className="text-amber-500" /> Local Problems
              {selectedProblems.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#8B1538] text-white text-[9px] font-black">{selectedProblems.length}</span>
              )}
            </h3>
            <div className="flex gap-2">
              <button onClick={selectAllProblems} className="text-[10px] font-bold text-[#8B1538] hover:underline">All</button>
              <span className="text-stone-300">|</span>
              <button onClick={clearProblems} className="text-[10px] font-bold text-stone-400 hover:text-stone-700">Clear</button>
            </div>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {location.problems.map((p, i) => {
              const active = selectedProblems.includes(p);
              return (
                <button
                  key={i}
                  onClick={() => toggleProblem(p)}
                  className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-200 text-sm
                    ${active
                      ? "bg-[#8B1538] border-[#8B1538] text-white shadow-md shadow-rose-900/15"
                      : "bg-white border-stone-200 text-stone-700 hover:border-[#8B1538] hover:bg-rose-50"
                    }`}
                >
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                    ${active ? "border-white bg-white" : "border-stone-300"}`}>
                    {active && <span className="w-2 h-2 rounded-full bg-[#8B1538]" />}
                  </span>
                  <span className="capitalize leading-tight">{p}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resources multi-select */}
        <div className="rounded-2xl border border-stone-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-200">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-800 flex items-center gap-2">
              <Sparkles size={12} className="text-[#8B1538]" /> Raw Materials &amp; Resources
              {selectedResources.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#8B1538] text-white text-[9px] font-black">{selectedResources.length}</span>
              )}
            </h3>
            <div className="flex gap-2">
              <button onClick={selectAllResources} className="text-[10px] font-bold text-[#8B1538] hover:underline">All</button>
              <span className="text-stone-300">|</span>
              <button onClick={clearResources} className="text-[10px] font-bold text-stone-400 hover:text-stone-700">Clear</button>
            </div>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {location.resources.map((r, i) => {
              const active = selectedResources.includes(r);
              return (
                <button
                  key={i}
                  onClick={() => toggleResource(r)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200 capitalize
                    ${active
                      ? "bg-[#8B1538] border-[#8B1538] text-white shadow-md shadow-rose-900/15"
                      : "bg-white border-stone-200 text-stone-700 hover:border-[#8B1538] hover:bg-rose-50"
                    }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                    ${active ? "border-white bg-white" : "border-stone-300"}`}>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-[#8B1538]" />}
                  </span>
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary hint */}
        {(selectedProblems.length > 0 || selectedResources.length > 0) && (
          <p className="text-xs text-stone-400 font-medium leading-relaxed">
            ✅ {selectedProblems.length} problem{selectedProblems.length !== 1 ? "s" : ""} · {selectedResources.length} resource{selectedResources.length !== 1 ? "s" : ""} selected — click <span className="text-[#8B1538] font-bold">Generate Topics</span> to continue.
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Context loading screen ─────────────────────────────────── */
function ContextLoader({ location, fields }: { location: string; fields: string[] }) {
  const fieldLabels = fields.join(" · ");
  const dots = ["Analyzing local conditions", "Identifying field-relevant problems", "Sourcing raw materials", "Tailoring to your research"];
  const [dotIdx, setDotIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDotIdx(i => (i + 1) % dots.length), 1800);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-rose-100 border-t-[#8B1538] animate-spin" />
        <Sparkles size={20} className="absolute inset-0 m-auto text-[#8B1538]" />
      </div>
      <div className="text-center space-y-2">
        <p className="font-bold text-stone-900 text-lg">Analyzing your context…</p>
        <p className="text-sm text-stone-500 max-w-xs leading-relaxed">
          AI is generating problems and raw materials specific to{" "}
          <span className="font-bold text-[#8B1538]">{location.split(",")[0]}</span>{" "}
          for <span className="font-bold text-stone-700">{fieldLabels}</span>
        </p>
        <p className="text-[11px] text-stone-400 font-medium animate-pulse">{dots[dotIdx]}…</p>
      </div>
    </div>
  );
}

/* ─── Main modal component ───────────────────────────────────── */
export default function GenerateResearchModal({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (data: GeneratedData) => void;
}) {
  const [step, setStep] = useState(0); // 0=field, 1=location, 1.5=loading-context, 2=context
  const [loadingContext, setLoadingContext] = useState(false);
  const [contextError, setContextError] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  const handleLocationChange = (loc: LocationData) => {
    setLocation(loc);
    // problems/resources will be filled by AI when advancing
    setSelectedProblems([]);
    setSelectedResources([]);
  };

  const canNext = () => {
    if (step === 0) return selectedFields.length > 0;
    if (step === 1) return location !== null;
    if (step === 2) return selectedProblems.length > 0 || selectedResources.length > 0;
    return false;
  };

  const handleNext = async () => {
    if (step === 1) {
      // Transition: call AI to generate context before showing step 3
      setLoadingContext(true);
      setContextError("");
      try {
        const fieldLabels = selectedFields.map(id => ALL_FIELDS.find(f => f.id === id)?.label || id);
        const ctx = await fetchAIContext(location!.name, fieldLabels);
        const enrichedLoc: LocationData = {
          ...location!,
          problems: ctx.problems,
          resources: ctx.resources,
        };
        setLocation(enrichedLoc);
        setSelectedProblems([...ctx.problems]);
        setSelectedResources([...ctx.resources]);
        setStep(2);
      } catch {
        setContextError("Failed to generate local context. Please try again.");
      } finally {
        setLoadingContext(false);
      }
      return;
    }

    if (step === 2) {
      setGenerating(true);
      setGenError("");
      try {
        const fieldLabels = selectedFields.map(id => ALL_FIELDS.find(f => f.id === id)?.label || id);
        const res = await fetch("/api/generate-topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: fieldLabels,
            location: location?.name,
            problems: selectedProblems,
            resources: selectedResources,
          }),
        });
        const data = await res.json();
        if (data.topics) {
          onComplete({
            topics: data.topics,
            location: location!,
            fields: selectedFields,
          });
        } else {
          setGenError(data.error || "Failed to generate topics. Please try again.");
        }
      } catch {
        setGenError("Network error. Please try again.");
      } finally {
        setGenerating(false);
      }
      return;
    }

    setStep(s => s + 1);
  };

  const handleStartOver = () => {
    setStep(0);
    setSelectedFields([]);
    setLocation(null);
    setSelectedProblems([]);
    setSelectedResources([]);
    setLoadingContext(false);
    setContextError("");
    setGenError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-0 flex-shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-[#8B1538]">
            <Sparkles size={12} />
            <span>AI Research Generator</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-8 pt-6 pb-0 flex-shrink-0">
          <StepIndicator current={step} total={3} />
        </div>

        {/* Step content (scrollable) */}
        <div className="px-8 py-2 overflow-y-auto flex-1">
          {step === 0 && <FieldSelector selected={selectedFields} onChange={setSelectedFields} />}
          {step === 1 && !loadingContext && <LocationPicker location={location} onChange={handleLocationChange} />}
          {step === 1 && loadingContext && location && (
            <ContextLoader
              location={location.name}
              fields={selectedFields.map(id => ALL_FIELDS.find(f => f.id === id)?.label || id)}
            />
          )}
          {step === 2 && location && (
            <ContextSelector
              location={location}
              fields={selectedFields}
              selectedProblems={selectedProblems}
              onProblemsChange={setSelectedProblems}
              selectedResources={selectedResources}
              onResourcesChange={setSelectedResources}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-8 pt-4 flex-shrink-0 border-t border-stone-100">
          {(genError || contextError) && (
            <p className="text-red-500 text-xs mb-3 font-semibold">{genError || contextError}</p>
          )}
          <div className="flex justify-between items-center">
            {step > 0 && !loadingContext ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-900 font-bold text-sm transition-colors"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}

            {!loadingContext && (
              <button
                onClick={handleNext}
                disabled={!canNext() || generating}
                className="flex items-center gap-2 bg-[#8B1538] hover:bg-[#6D102C] disabled:bg-stone-200 disabled:text-stone-400 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all"
              >
                {generating ? (
                  <><Loader2 size={16} className="animate-spin" /> Generating…</>
                ) : step === 2 ? (
                  <><Sparkles size={16} /> Generate Topics</>
                ) : (
                  <>Next <ChevronRight size={16} /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
