"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, MapPin, Search, Loader2, Sparkles, BookOpen, Zap, CheckCircle2, AlertTriangle } from "lucide-react";

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
    <div className="flex items-start gap-4 mb-10 px-1">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-3">
          <div className="flex items-center w-full">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all duration-500 flex-shrink-0 shadow-sm
                ${i < current ? "bg-[#521118] text-[#e8e4df]" : i === current ? "bg-[#521118] text-[#e8e4df] ring-4 ring-[#e8e4df]/60" : "bg-white border border-[#2b090d]/5 text-stone-400"}`}
            >
              {i < current ? <CheckCircle2 size={16} /> : i + 1}
            </div>
            {i < total - 1 && (
              <div className={`h-1 flex-1 transition-all duration-700 mx-2 rounded-full ${i < current ? "bg-[#521118]" : "bg-[#2b090d]/5"}`} />
            )}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-center leading-tight transition-colors duration-300 ${i === current ? "text-[#521118]" : "text-stone-400"}`}>
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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-3xl font-black text-stone-900 mb-2 leading-tight" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Research Field(s)</h2>
      <p className="text-stone-500 text-sm mb-8 font-medium">Select disciplines you want to research. Your topics will be tailored to these areas.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
        {ALL_FIELDS.map(f => (
          <button
            key={f.id}
            onClick={() => toggle(f.id)}
            className={`flex items-center gap-3 p-4 rounded-[1.5rem] border text-left transition-all duration-300 text-sm font-bold active:scale-95 group
              ${selected.includes(f.id)
                ? "bg-[#521118] border-[#521118] text-[#e8e4df] shadow-xl shadow-[#521118]/20"
                : "bg-white border-[#2b090d]/5 text-stone-800 hover:border-[#521118]/30 hover:bg-[#521118]/5 shadow-sm"
              }`}
          >
            <span className="text-xl flex-shrink-0 transition-transform group-hover:scale-110">{f.icon}</span>
            <span className="leading-tight text-[11px] uppercase tracking-wider">{f.label}</span>
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="text-[10px] text-[#521118] font-black uppercase tracking-[0.2em] mt-6 flex items-center gap-2">
           <div className="w-1 h-1 rounded-full bg-[#521118] animate-pulse" />
           {selected.length} field{selected.length > 1 ? "s" : ""} selected
        </div>
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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-3xl font-black text-stone-900 mb-2 leading-tight" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Pin Your Location</h2>
      <p className="text-stone-500 text-sm mb-8 font-medium">Search for your city/municipality or click on the map to pin your research area.</p>

      {/* Search bar */}
      <div className="flex gap-3 mb-6 bg-white/60 p-2 rounded-2xl border border-[#2b090d]/5 shadow-sm backdrop-blur-sm">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#521118]/40" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search city/municipality in Philippines…"
            className="w-full pl-11 pr-4 py-3 rounded-xl border-none text-sm bg-transparent focus:outline-none placeholder:text-stone-400 font-medium"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-6 py-3 bg-[#521118] text-[#e8e4df] rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-[#2b090d] transition-all disabled:opacity-40 flex items-center gap-2 active:scale-95 shadow-lg shadow-[#521118]/10"
        >
          {searching ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
          {searching ? "" : "Search"}
        </button>
      </div>

      {error && <p className="text-red-500 text-xs mb-3">{error}</p>}

      {/* Map */}
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div ref={mapRef} className="w-full rounded-[2rem] overflow-hidden border border-[#2b090d]/10 shadow-inner" style={{ height: "320px" }} />

      {location && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-[#521118]/5 rounded-2xl border border-[#521118]/10 animate-in fade-in slide-in-from-top-2">
          <MapPin size={18} className="text-[#521118] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#521118]">Selected Location</p>
            <p className="text-[13px] text-stone-900 mt-1 font-bold leading-tight">{location.name}</p>
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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
      <h2 className="text-3xl font-black text-stone-900 mb-2 leading-tight" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Choose Your Focus</h2>
      <p className="text-stone-500 text-sm mb-6 font-medium">
        Select <span className="text-[#521118] font-bold">local problems</span> and <span className="text-[#521118] font-bold">resources</span> in{" "}
        <span className="font-bold text-[#521118]">{location.name.split(",")[0]}</span> to shape your topics.
      </p>

      <div className="space-y-5">
        {/* Selected fields reminder */}
        <div className="flex flex-wrap gap-2 p-4 rounded-3xl bg-[#521118]/5 border border-[#521118]/10">
          <BookOpen size={16} className="text-[#521118] mt-0.5 flex-shrink-0 opacity-40" />
          <div className="flex flex-wrap gap-1.5 flex-1">
            {fieldLabels.map((label, i) => (
              <span key={i} className="text-[9px] px-3 py-1 rounded-full bg-[#521118] text-[#e8e4df] font-black uppercase tracking-[0.1em]">{label}</span>
            ))}
          </div>
        </div>

        {/* Problems multi-select */}
        <div className="rounded-[1.5rem] border border-[#2b090d]/10 overflow-hidden bg-white/60 backdrop-blur-sm shadow-sm ring-4 ring-transparent hover:ring-[#e8e4df]/40 transition-all duration-500">
          <div className="flex items-center justify-between px-5 py-4 bg-[#521118]/5 border-b border-[#2b090d]/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-800 flex items-center gap-2">
              <Zap size={14} className="text-amber-500" /> Local Problems
              {selectedProblems.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-[#521118] text-[#e8e4df] text-[9px] font-black">{selectedProblems.length}</span>
              )}
            </h3>
            <div className="flex gap-3">
              <button onClick={selectAllProblems} className="text-[10px] font-black uppercase tracking-widest text-[#521118] hover:underline">All</button>
              <div className="w-px h-3 bg-[#2b090d]/10" />
              <button onClick={clearProblems} className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-[#521118]">Clear</button>
            </div>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {location.problems.map((p, i) => {
              const active = selectedProblems.includes(p);
              return (
                <button
                  key={i}
                  onClick={() => toggleProblem(p)}
                  className={`flex items-center gap-4 w-full text-left px-5 py-4 rounded-2xl border transition-all duration-300 text-[13px] font-bold group
                    ${active
                      ? "bg-[#521118] border-[#521118] text-[#e8e4df] shadow-xl shadow-[#521118]/15"
                      : "bg-white border-[#2b090d]/5 text-stone-700 hover:border-[#521118]/30 hover:bg-[#521118]/5"
                    }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300
                    ${active ? "border-[#e8e4df] bg-[#e8e4df]" : "border-stone-300 group-hover:border-[#521118]"}`}>
                    {active && <span className="w-2.5 h-2.5 rounded-full bg-[#521118]" />}
                  </span>
                  <span className="capitalize leading-tight">{p}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Resources multi-select */}
        <div className="rounded-[1.5rem] border border-[#2b090d]/10 overflow-hidden bg-white/60 backdrop-blur-sm shadow-sm ring-4 ring-transparent hover:ring-[#e8e4df]/40 transition-all duration-500">
          <div className="flex items-center justify-between px-5 py-4 bg-[#521118]/5 border-b border-[#2b090d]/5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-800 flex items-center gap-2">
              <Sparkles size={14} className="text-[#521118]" /> Raw Materials & Resources
              {selectedResources.length > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-[#521118] text-[#e8e4df] text-[9px] font-black">{selectedResources.length}</span>
              )}
            </h3>
            <div className="flex gap-3">
              <button onClick={selectAllResources} className="text-[10px] font-black uppercase tracking-widest text-[#521118] hover:underline">All</button>
              <div className="w-px h-3 bg-[#2b090d]/10" />
              <button onClick={clearResources} className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-[#521118]">Clear</button>
            </div>
          </div>
          <div className="p-3 flex flex-col gap-2">
            {location.resources.map((r, i) => {
              const active = selectedResources.includes(r);
              return (
                <button
                  key={i}
                  onClick={() => toggleResource(r)}
                  className={`flex items-center gap-4 w-full text-left px-5 py-3 rounded-2xl border text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95 group
                    ${active
                      ? "bg-[#521118] border-[#521118] text-[#e8e4df] shadow-md shadow-[#521118]/15"
                      : "bg-white border-[#2b090d]/5 text-stone-700 hover:border-[#521118]/30 hover:bg-[#521118]/5"
                    }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-300
                    ${active ? "border-[#e8e4df] bg-[#e8e4df]" : "border-stone-300 group-hover:border-[#521118]"}`}>
                    {active && <span className="w-2 h-2 rounded-full bg-[#521118]" />}
                  </span>
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        {/* Summary hint */}
        {(selectedProblems.length > 0 || selectedResources.length > 0) && (
          <div className="text-[10px] text-stone-400 font-black uppercase tracking-widest leading-relaxed flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-[#521118] animate-pulse" />
             {selectedProblems.length} problem{selectedProblems.length !== 1 ? "s" : ""} · {selectedResources.length} resource{selectedResources.length !== 1 ? "s" : ""} selected
          </div>
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
    <div className="flex flex-col items-center justify-center py-20 gap-8 animate-in fade-in duration-700">
      <div className="relative">
        <div className="absolute inset-0 bg-[#521118]/10 blur-2xl rounded-full scale-110 animate-pulse" />
        <div className="w-20 h-20 rounded-[2rem] border-4 border-[#e8e4df] border-t-[#521118] animate-spin relative" />
        <Sparkles size={24} className="absolute inset-0 m-auto text-[#521118] animate-pulse" />
      </div>
      <div className="text-center space-y-3">
        <p className="font-black text-stone-900 text-xl" style={{ fontFamily: "'Neue Montreal', sans-serif" }}>Analyzing your context…</p>
        <p className="text-sm text-stone-500 max-w-xs mx-auto leading-relaxed font-medium">
          AI is generating problems and raw materials specific to{" "}
          <span className="font-bold text-[#521118]">{location.split(",")[0]}</span>{" "}
          for <span className="font-bold text-stone-700">{fieldLabels}</span>
        </p>
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-[10px] text-[#521118]/60 font-black uppercase tracking-[0.2em] animate-pulse">{dots[dotIdx]}…</p>
        </div>
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
        setSelectedProblems([]);
        setSelectedResources([]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[92vh] border border-[#2b090d]/10 ring-8 ring-[#e8e4df]/40"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-10 pt-10 pb-2 flex-shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#521118]/5 border border-[#521118]/10 text-[10px] font-black uppercase tracking-[0.25em] text-[#521118]">
            <Sparkles size={12} />
            <span>AI Research Generator</span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-[#521118]/5 hover:bg-[#521118]/10 text-[#521118]/40 hover:text-[#521118] transition-all duration-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-10 pt-10 pb-0 flex-shrink-0">
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
        <div className="px-10 pb-10 pt-6 flex-shrink-0 border-t border-[#2b090d]/5">
          {(genError || contextError) && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
               <AlertTriangle size={14} />
               {genError || contextError}
            </div>
          )}
          <div className="flex justify-between items-center">
            {step > 0 && !loadingContext ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-2 text-[#521118]/60 hover:text-[#521118] font-black uppercase tracking-widest text-[11px] transition-all duration-300 hover:-translate-x-1"
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : <div />}

            {!loadingContext && (
              <button
                onClick={handleNext}
                disabled={!canNext() || generating}
                className="group relative flex items-center gap-3 bg-[#521118] hover:bg-[#2b090d] disabled:bg-stone-100 disabled:text-stone-400 text-[#e8e4df] px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 shadow-xl shadow-[#521118]/20 overflow-hidden active:scale-95"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
                {generating ? (
                  <><Loader2 size={16} className="animate-spin relative z-10" /> <span className="relative z-10">Processing…</span></>
                ) : step === 2 ? (
                   <><Sparkles size={16} className="transition-transform group-hover:scale-125 group-hover:rotate-12 relative z-10" /> <span className="relative z-10">Generate Topics</span></>
                ) : (
                  <><span className="relative z-10">Next Step</span> <ChevronRight size={16} className="transition-transform group-hover:translate-x-1 relative z-10" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
