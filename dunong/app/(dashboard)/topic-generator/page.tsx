"use client";


import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Sparkles, Lightbulb, ArrowRight, TrendingUp, FlaskConical, X, ChevronRight, Zap, Loader2, AlertTriangle
} from "lucide-react";


const GenerateResearchModal = dynamic(() => import("@/components/GenerateResearchModal"), { ssr: false });
import type { GeneratedData } from "@/components/GenerateResearchModal";


/* ─── Types ─────────────────────────────────────────────────── */
interface Topic {
  rank: number;
  title: string;
  tag: string;
  match: number;
  problem: string;
  opportunity: string;
  nextSteps: string[];
}


interface Frontier {
  title: string;
  desc: string;
  match: number;
  author: string;
  dark: boolean;
  problem: string;
  opportunity: string;
  nextSteps: string[];
}


/* ─── Data ───────────────────────────────────────────────────── */
const phTopics: Topic[] = [
  {
    rank: 1, title: "PUV Modernization Socio-Economic Displacement", tag: "Transport", match: 94,
    problem: "The government's Public Utility Vehicle Modernization Program (PUVMP) has displaced an estimated 70,000+ traditional jeepney drivers and operators nationwide. Many lack capital for new units and face abrupt loss of livelihood without sufficient social safety nets.",
    opportunity: "Using agent-based socio-economic modeling and GIS mapping, researchers can quantify displacement hotspots and propose targeted livelihood transition packages, reducing friction between modernization goals and worker welfare.",
    nextSteps: [
      "Survey displaced operators in NCR, Region III, and Region VII.",
      "Cross-reference LTFRB and DOLE displacement records.",
      "Model optimal transition subsidy amounts using census income data."
    ]
  },
  {
    rank: 2, title: "El Niño Impact on Central Luzon Rice Yields", tag: "Climate", match: 92,
    problem: "The 2023–2024 El Niño severely reduced rice production in Regions III and IV-A, the country's primary rice bowls. Irrigation systems are inadequate, and smallholders lack drought-resistant varieties, threatening national food security.",
    opportunity: "Satellite-derived NDVI and soil moisture data from DIWATA-2 can train predictive yield models, enabling pre-season intervention planning and targeted distribution of heat-tolerant seed varieties.",
    nextSteps: [
      "Collect 10-year yield data from PhilRice and DA-RCEF.",
      "Overlay PAGASA seasonal forecasts with irrigation coverage maps.",
      "Pilot test IR-72 and NSIC RC480 heat-tolerant varieties in Nueva Ecija."
    ]
  },
  {
    rank: 3, title: "West Philippine Sea Fisherfolk Livelihood Crisis", tag: "Maritime", match: 89,
    problem: "Ongoing maritime disputes in the WPS have restricted over 30,000 Filipino fisherfolk from ancestral fishing grounds near Bajo de Masinloc and the Spratly Islands, decimating household income in coastal Zambales and Palawan communities.",
    opportunity: "Legal technology tools and community-based marine spatial planning can define alternative livelihood corridors. Mariculture and eco-tourism integration can buffer income for displaced fishing households.",
    nextSteps: [
      "Document displacement through BFAR livelihood records and barangay surveys.",
      "Identify viable mariculture zones within EEZ using bathymetric maps.",
      "Partner with LGUs in Masinloc and Infanta for pilot mariculture projects."
    ]
  },
  {
    rank: 4, title: "Visayas Power Grid Stability and Blackouts", tag: "Energy", match: 88,
    problem: "The Visayas grid frequently experiences rotating blackouts due to over-reliance on aging coal plants in Cebu and insufficient inter-island power transmission capacity, affecting both industrial output and household welfare.",
    opportunity: "Demand-side management systems and small-scale solar-plus-storage microgrids in isolated Visayan municipalities can stabilize supply, reduce energy poverty, and defer expensive Visayas-Mindanao interconnection investments.",
    nextSteps: [
      "Audit Transco grid load data for blackout frequency and triggers.",
      "Identify barangays with highest solar potential using IRENA GIS tools.",
      "Design pilot 500 kWh battery storage procurement for two LGU sites."
    ]
  },
  {
    rank: 5, title: "Metro Cebu Solid Waste Management Failures", tag: "Environment", match: 85,
    problem: "Metro Cebu generates over 1,200 tons of solid waste daily, far exceeding landfill capacity. Informal waste pickers lack legal protection, and barangay-level collection compliance with RA 9003 remains below 40%.",
    opportunity: "Circular economy frameworks combining waste segregation gamification apps and formal integration of informal waste workers into municipal MRFs can dramatically improve diversion rates from landfills.",
    nextSteps: [
      "Audit waste diversion rates across all 14 Metro Cebu LGUs.",
      "Co-design MRF integration protocols with informal worker associations.",
      "Pilot a mobile waste tracking app under DENR technical assistance."
    ]
  },
  {
    rank: 6, title: "Bicol Cacao Farming Fungal Resilience", tag: "Agriculture", match: 82,
    problem: "Cacao production in Bicol is devastated by Black Pod Disease (Phytophthora palmivora), reducing yields by as much as 60% and threatening the region's emerging fine cacao export identity built around Camarines Norte genetics.",
    opportunity: "Biocontrol agents like Trichoderma asperellum, combined with AI-assisted early disease detection via drone hyperspectral imaging, can reduce fungicide costs and improve disease response time for smallholder cacao farmers.",
    nextSteps: [
      "Collect fungal pathogen samples from affected Bicol farms for lab profiling.",
      "Trial Trichoderma treatment in controlled plots in Camarines Norte.",
      "Train local extensionists on drone-sensor deployment and image analysis."
    ]
  },
  {
    rank: 7, title: "Microplastic Density in Manila Bay Ecosystem", tag: "Pollution", match: 80,
    problem: "Microplastic concentrations exceeding WHO safety thresholds have been detected in Manila Bay sediment and seafood samples. Point sources include the Pasig, San Juan, and Marikina rivers, threatening marine biodiversity and public health.",
    opportunity: "Spectroscopic identification of microplastic polymer types combined with hydrodynamic modeling can pinpoint pollution sources, enabling targeted intervention under the Manila Bay Rehabilitation Program.",
    nextSteps: [
      "Collect sediment core and water column samples across 12 transects in Manila Bay.",
      "Use FTIR spectroscopy to identify polymer types and source industries.",
      "Publish pollution maps to support barangay-level clean-up prioritization."
    ]
  },
  {
    rank: 8, title: "Mindanao Arabica Coffee Supply Chain Bottlenecks", tag: "Economy", match: 79,
    problem: "Despite Bukidnon and Mt. Apo Arabica beans winning international cupping awards, Philippine specialty coffee exports remain minimal due to poor post-harvest infrastructure, fragmented smallholder cooperatives, and limited access to certified Q-graders.",
    opportunity: "Blockchain-based traceability platforms and cooperative consolidation models can attract premium specialty buyers from South Korea and Japan, improving farmer gate prices by an estimated 35–50%.",
    nextSteps: [
      "Map existing cooperatives in Bukidnon and Davao del Sur with GPS coordinates.",
      "Estimate price premium potential through commodity benchmark comparison.",
      "Design pilot blockchain traceability with a specialty buyer proof-of-concept."
    ]
  },
  {
    rank: 9, title: "Indigenous Land Rights Mapping in Mindanao", tag: "Social", match: 78,
    problem: "Less than 15% of NCIP-recognized Ancestral Domain areas in Mindanao have complete, machine-readable CADT documents, leaving IP communities vulnerable to displacement by corporate land conversion and mining applications.",
    opportunity: "Community participatory GIS mapping using open-source QGIS tools combined with legal digitization of CADT records can protect ancestral domain boundaries and strengthen IP legal standing in court and DENR proceedings.",
    nextSteps: [
      "Partner with NCIP Region X/XII for CADT records access and data sharing.",
      "Train IP community members in GPS boundary marking and QGIS entry.",
      "Produce publicly archived digital boundary shapefiles per community."
    ]
  },
  {
    rank: 10, title: "Efficacy of Public School Nutrition Programs", tag: "Health", match: 77,
    problem: "Despite DepEd's School-Based Feeding Program reaching 1.9 million children, national stunting rates remain at 30.3% (PSA 2023). Program coverage gaps, poor food quality monitoring, and low caregiver nutrition IEC participation limit impact.",
    opportunity: "Longitudinal cohort tracking with biometric data (height-for-age z-scores) integrated with school feeding records can isolate program effect sizes and identify underperforming schools for targeted intervention.",
    nextSteps: [
      "Link PSA FNRI anthropometric data with DepEd SBFP beneficiary records.",
      "Conduct qualitative FGDs with parents and teachers in 5 underperforming regions.",
      "Recommend evidence-based menu improvements based on dietary diversity scoring."
    ]
  },
  {
    rank: 11, title: "Heavy Metal Contamination in Pasig River", tag: "Ecology", match: 76,
    problem: "Post-rehabilitation sampling of Pasig River sediment reveals persistent lead (Pb), cadmium (Cd), and mercury (Hg) levels above DENR water quality standards, originating from legacy industrial discharge along Manggahan Floodway.",
    opportunity: "Phytoremediation pilots using native vetiver grass and hyacinth plantings combined with permeable reactive barriers can gradually reduce sediment toxicity while simultaneously improving bank aesthetics and biodiversity.",
    nextSteps: [
      "Conduct heavy metal speciation analysis at 20 monitoring stations.",
      "Identify highest-concentration source sites using upstream-downstream gradients.",
      "Launch phytoremediation pilot in partnership with PRRC and BAI."
    ]
  },
  {
    rank: 12, title: "Fintech Adoption Rates in BARMM Region", tag: "Technology", match: 75,
    problem: "Despite 23 million Filipinos remaining unbanked, e-wallet penetration in BARMM remains below 8%—the lowest nationally—due to low smartphone penetration, poor connectivity, and trust deficits rooted in conflict-affected community histories.",
    opportunity: "Agent-banking models using USSD technology and community trust leaders as fintech ambassadors can extend digital financial services to unbanked populations even without stable internet, improving economic inclusion metrics.",
    nextSteps: [
      "Survey fintech awareness and trust barriers in 500 BARMM households.",
      "Pilot agent-banking kiosks through LBP or LANDBANK community centers.",
      "Assess BSP regulatory sandbox pathways for USSD microloan deployment."
    ]
  },
  {
    rank: 13, title: "Coral Bleaching Rates in Palawan Sanctuaries", tag: "Marine", match: 74,
    problem: "Sea surface temperatures in the Sulu Sea have exceeded the bleaching threshold (>29°C for 8+ weeks) in 2022 and 2024, causing mass coral bleaching in El Nido and Tubbataha, undermining reef-dependent tourism and fisheries.",
    opportunity: "Photogrammetry-based 3D reef health mapping using underwater drones can create annual bleaching severity indices, enabling adaptive management zoning and evidence-based closure during peak thermal stress events.",
    nextSteps: [
      "Deploy towed underwater cameras across 30 permanent Palawan transects.",
      "Correlate SST anomalies from NOAA CoralTemp with bleaching onset records.",
      "Produce reef health dashboard for DENR-BMB and LGU tourism management."
    ]
  },
  {
    rank: 14, title: "Urban Heat Island Effect in Quezon City", tag: "Climate", match: 73,
    problem: "Land surface temperatures in high-density barangays of Quezon City exceed surrounding non-urban areas by 6–9°C, increasing heat-related illness hospitalizations and electricity demand for cooling, disproportionately burdening low-income residents.",
    opportunity: "Rooftop greening policy mandates combined with cool pavement materials and strategic urban tree canopy expansion can reduce local temperatures by 2–4°C, quantifiable through Landsat thermal band time-series analysis.",
    nextSteps: [
      "Generate 5-year urban heat trend maps from Landsat 8/9 thermal data.",
      "Identify top 10 highest-temperature barangays for priority intervention.",
      "Co-design green infrastructure zoning ordinance with QC City Hall engineers."
    ]
  },
  {
    rank: 15, title: "Cold Storage Deficits for Benguet Vegetable Farmers", tag: "Agriculture", match: 72,
    problem: "Benguet produces over 80% of highland vegetables consumed in Metro Manila, yet post-harvest losses reach 35–40% due to inadequate cold chain infrastructure on mountain barangay access roads before reaching Divisoria and other wholesale markets.",
    opportunity: "Modular solar-powered cold rooms at strategic bayang collection points combined with a mobile price and logistics aggregation app can dramatically reduce spoilage while improving farmer bargaining power against traders.",
    nextSteps: [
      "Map existing cold chain assets and loss points along Benguet-NCR routes.",
      "Evaluate solar cold room vendors for highland deployment feasibility.",
      "Pilot aggregation app with Benguet Federation of Vegetable Farmers."
    ]
  },
  {
    rank: 16, title: "Digital Divide in Island Provinces", tag: "ICT", match: 71,
    problem: "Provinces like Batanes, Sulu, and Camiguin rank among the Philippines' lowest in internet speed and household connectivity, creating educational gaps where student devices and learning apps are useless without reliable bandwidth.",
    opportunity: "Low-earth orbit satellite internet (e.g., Starlink constellation) combined with community Wi-Fi mesh networks at public schools can close connectivity gaps at a cost-per-student ratio 40% lower than fiber extension models.",
    nextSteps: [
      "Benchmark connectivity speeds and device ownership in 5 GIDAs via NTC data.",
      "Cost-model satellite vs. fiber vs. mesh for 3 island province scenarios.",
      "Draft DICT community satellite internet subsidy proposal for congressional review."
    ]
  },
  {
    rank: 17, title: "Occupational Hazards in Small-Scale Gold Mining", tag: "Mining", match: 70,
    problem: "Over 300,000 Filipinos engage in artisanal and small-scale gold mining (ASGM), predominantly in Mindanao and Camarines Norte. Mercury amalgamation exposure causes irreversible neurological damage, with limited health monitoring by MGB or DOH.",
    opportunity: "Portable X-ray fluorescence (pXRF) analyzers combined with community health worker networks can screen for heavy metal exposure at the barangay level, enabling early intervention and documenting mercury use for policy reform.",
    nextSteps: [
      "Partner with DOH and MGB for ASGM community health screening access.",
      "Deploy pXRF units in 3 high-risk municipalities in Compostela Valley.",
      "Publish exposure prevalence data to support PH ratification of Minamata Convention commitments."
    ]
  },
  {
    rank: 18, title: "AI Models for Tagalog & Cebuano Dialect Preservation", tag: "AI/Linguistics", match: 69,
    problem: "Of 135+ Philippine languages, 10 are classified as endangered by UNESCO. Existing LLMs perform poorly on code-switched Filipino text, and no publicly available NLP corpus exists for Ilocano, Waray, or Kapampangan at scale.",
    opportunity: "Community-sourced audio and text corpus building through a mobile crowdsourcing app can generate training data for low-resource language NLP models, enabling voice-enabled government services in regional languages.",
    nextSteps: [
      "Audit existing Philippine NLP datasets on Hugging Face and NLTK repositories.",
      "Co-design corpus collection protocol with UP Diliman Linguistics department.",
      "Release open-license Tagalog/Cebuano sentence embeddings on GitHub."
    ]
  },
  {
    rank: 19, title: "Flood Mitigation Infrastructure in Low-lying Bulacan", tag: "Disaster", match: 68,
    problem: "Bulacan's rapid urbanization and conversion of flood-retention wetlands has increased 100-year flood risk by 300% in municipalities like Hagonoy and Paombong. Existing DPWH drainage canals are undersized for current impervious cover.",
    opportunity: "Nature-based solutions including retention pond restoration, mangrove buffer strips along Angat River tributaries, and green rooftop mandates can significantly attenuate peak discharge and reduce inundation frequency.",
    nextSteps: [
      "Model pre- and post-urbanization hydrographs using HEC-HMS and LiDAR DEM.",
      "Identify critical wetland areas for acquisition under DPWH Bulacan Expressway flood offset.",
      "Engage Bulacan provincial government for green infrastructure policy integration."
    ]
  },
  {
    rank: 20, title: "Mitigation Strategies for the Coconut Scale Insect", tag: "Agriculture", match: 67,
    problem: "Cocolisap (Aspidiotus rigidus) has devastated over 60 million coconut palms in 49 Philippine provinces since 2014, threatening the livelihoods of over 3 million coconut farming families and the country's USD 1.4B annual coconut export industry.",
    opportunity: "Integrated pest management using biological control agent Comperiella calauanica combined with drone-based pesticide application and satellite-based infestation mapping can arrest spread with 70% less chemical input than conventional fumigation.",
    nextSteps: [
      "Map current infestation boundaries using DOST-ASTI satellite indices.",
      "Scale mass rearing of Comperiella calauanica through PCA regional labs.",
      "Pilot drone spray comparison trials in affected Quezon province farms."
    ]
  },
];


const researchFrontiers: Frontier[] = [
  {
    title: "Project NOAH: AI Disaster Resilience", desc: "Award-winning high-resolution flood hazard mapping & forecasting systems.", match: 98, author: "UP RESILIENCE INST.", dark: true,
    problem: "Project NOAH (Nationwide Operational Assessment of Hazards) developed LiDAR-derived flood hazard maps covering 18 river basins and 19 cities. Despite decommissioning in 2017, its open datasets remain the most accurate hazard reference for Philippine disaster risk reduction, yet many LGUs lack capacity to use them.",
    opportunity: "Integrating NOAH's flood models with real-time IoT rain gauge networks and AI-driven early warning dissemination via SMS and mobile apps can extend forecast lead times from 6 hours to 72 hours, enabling proactive community evacuation.",
    nextSteps: [
      "Download and validate NOAH LiDAR DEM data for Region VIII Leyte basin.",
      "Contact UP RESILIENCE INST. for data access agreements and methodology review.",
      "Design AI forecast integration layer using open HEC-HMS and Python flood routing."
    ]
  },
  {
    title: "Abaca Fiber for Space Tech", desc: "Using local Abaca composites for aerospace engineering applications.", match: 94, author: "DOST-PTRI / PhilSA", dark: false,
    problem: "The Philippine Textile Research Institute (PTRI) identified that abaca fiber composites exhibit specific tensile strength-to-weight ratios competitive with fiberglass in aerospace panels. Yet no Philippine-made abaca composite has been prototype-tested for space applications, missing a USD 28B advanced composites global market window.",
    opportunity: "DOST-PTRI collaboration with PhilSA for structural testing of abaca-epoxy laminates in CubeSat panel prototypes can establish technical readiness levels (TRL 3–5), positioning Philippine abaca as a specialized aerospace input with strategic export value.",
    nextSteps: [
      "Request DOST-PTRI fiber tensile strength data for Davao and Catanduanes abaca cultivars.",
      "Design shielding and vibration test protocols under PhilSA materials lab.",
      "Benchmark against CFRP composites using ASTM D3039 standard methodology."
    ]
  },
  {
    title: "AI Models for PH Dialects", desc: "Developing specialized LLMs optimized for Cebuano, Ilocano, and Tagalog semantics.", match: 96, author: "UP Diliman DCS", dark: false,
    problem: "Commercial LLMs including GPT-4 and Gemini perform below acceptable benchmarks on Filipino and regional language tasks—hallucinating translations, misidentifying idioms, and failing on code-switched Taglish inputs. This creates systemic exclusion for the 90+ million Filipinos who communicate primarily in regional languages.",
    opportunity: "UP Diliman's Department of Computer Science is building WikiLang-PH, a curated multilingual corpus. Fine-tuning a Mistral 7B base model on this corpus could produce a PH-first open-source LLM capable of serving legal aid, healthcare Q&A, and government services in regional languages.",
    nextSteps: [
      "Access WikiLang-PH beta corpus via UP DCS research affiliation request.",
      "Establish compute budget for LoRA fine-tuning on DOST-ASTI's HPC cluster.",
      "Define downstream benchmark tasks: legal FAQ, health triage, agricultural advisory."
    ]
  },
  {
    title: "Mango Defect Detection AI", desc: "Machine vision for automated export-grade Carabao mango sorting.", match: 91, author: "MAPÚA UNIVERSITY", dark: false,
    problem: "Philippines exports over 34,000 MT of Carabao mangoes annually, but rejection rates at destination markets in Japan and South Korea reach 12–18% due to cosmetic defects undetected during manual sorting. Each rejected shipment costs exporters PHP 500,000–1.2M in losses and damages bilateral trade relationships.",
    opportunity: "Mapúa University's embedded systems lab has prototyped a conveyor-mounted multispectral vision system achieving 94.3% defect detection accuracy in lab trials. Scaling this to full sorting lines could reduce rejection rates by 80% at a fraction of manual sorting costs.",
    nextSteps: [
      "Request prototype technical specs and accuracy validation dataset from Mapúa lab.",
      "Conduct field trial on mango packing house in Guimaras province.",
      "File technology transfer agreement for cooperative commercialization with DA-BAR."
    ]
  },
  {
    title: "Blue Carbon from Mangroves", desc: "Assessing carbon sequestration capacity of Philippine mangrove forests.", match: 95, author: "Ateneo de Manila / UP MSI", dark: true,
    problem: "The Philippines lost 50% of mangrove cover between 1920–2000, but a remaining 300,000+ ha store an estimated 100 Mg C/ha in soil carbon—among the highest globally. Without verified carbon inventories, this blue carbon asset cannot be monetized through international carbon markets.",
    opportunity: "Ateneo–UP MSI collaborate on verified carbon accounting using Verified Carbon Standard (VCS) methodologies. A validated Philippine mangrove blue carbon offset registry could generate USD 8–15M annually in ecosystem service revenues for coastal LGUs and IP communities.",
    nextSteps: [
      "Access UP MSI mangrove biomass allometric database for site-specific calibration.",
      "Identify three candidate sites for VCS project design document (PDD) development.",
      "Engage carbon credit buyers at the Asia Carbon Exchange for early offtake agreements."
    ]
  },
  {
    title: "Space Tech in Agriculture", desc: "Diwata-2 microsatellite data improving crop yield estimations via remote sensing.", match: 92, author: "PhilSA / DOST-ASTI", dark: false,
    problem: "Philippines loses PHP 30–50B annually to agricultural losses from typhoons, floods, and drought, yet crop damage assessment relies on manual ground surveys that take 2–6 weeks after disasters—too slow for rapid relief and insurance payouts.",
    opportunity: "Diwata-2's enhanced multi-spectral push broom imager (MSMEI) captures 3m/pixel imagery within the Philippine AOI. Paired with machine learning models trained on NAMRIA crop maps, it can provide preliminary damage assessments within 48 hours of a typhoon landfall.",
    nextSteps: [
      "Request Diwata-2 post-typhoon image archive from PhilSA for Odette (2021) storm path.",
      "Train NDVI-change detection model using Sentinel-2 baseline reference data.",
      "Validate damage area estimates against PhilFIDA and PCIC ground truth claims data."
    ]
  },
  {
    title: "Telehealth Networks in GIDAs", desc: "RxBox implementations improving maternal care in isolated municipalities.", match: 86, author: "UP MANILA / DOST", dark: false,
    problem: "Maternal mortality in geographically isolated and disadvantaged areas (GIDAs) remains 3x higher than the national average, primarily due to lack of OB-GYN specialists and diagnostic equipment in rural health units. Routine prenatal check-up rates fall below 30% in many island and highland municipalities.",
    opportunity: "RxBox—a DOST-UPM developed telemedicine device with an embedded diagnostics suite—has been deployed in 350 RHUs. Integrating AI-assisted fetal heart rate interpretation and store-and-forward teleconsultation with PGH maternal specialists can reduce high-risk misclassification errors by 55%.",
    nextSteps: [
      "Audit current RxBox deployment status and connectivity in Region V and MIMAROPA.",
      "Design AI fetal distress alert model and validate against PGH retrospective CTG data.",
      "Draft DOH-PhilHealth integration roadmap for GIDA telehealth reimbursement pathways."
    ]
  },
  {
    title: "Agri-Blockchain Supply Chain", desc: "Traceability frameworks for fair-trade local coffee and cacao producers.", match: 88, author: "AGRITECH PH", dark: false,
    problem: "Small-scale Philippine coffee and cacao farmers receive only 8–12% of final retail value due to multi-layer intermediary chains. Buyers in Europe and US demand Farm-to-Cup transparency certifications, which Filipino cooperatives cannot afford through conventional third-party audit processes.",
    opportunity: "Distributed ledger traceability anchored on locally maintained nodes (using Hyperledger Fabric) can automate certification documentation at minimal cost, enabling direct B2B relationships with specialty roasters in Berlin, Tokyo, and New York willing to pay 30–60% premiums for verified provenance.",
    nextSteps: [
      "Map existing intermediary nodes in Benguet Arabica and Davao Cacao supply chains.",
      "Deploy Hyperledger Fabric pilot with Sagada coffee cooperative and 3 European buyers.",
      "Document cost of certification reduction to quantify ROI for cooperative members."
    ]
  },
  {
    title: "Coral Reef Restoration Tech", desc: "3D-printed biodegradable reef structures to accelerate coral polyps growth.", match: 97, author: "DE LA SALLE UNIVERSITY", dark: true,
    problem: "Philippine coral reefs cover 25,000 km² but 70% are classified as poor to fair condition (SEAFDEC 2023). Traditional coral gardening requires 3–5 years for recruits to reach reproductive size. No local university has validated a scalable, cost-efficient artificial substrate proven in Philippine reef conditions.",
    opportunity: "DLSU's engineering faculty have developed PLA-limestone composite 3D-printed structures with 86% larval settlement rates in controlled tank trials. Scaling production and deploying in Batangas and Cagayan coral triangle sites could restore 2 km² of reef at 70% lower cost than conventional transplantation.",
    nextSteps: [
      "Request DLSU lab trial data on larval settlement rates and structural degradation timelines.",
      "Identify BFAR-designated pilot restoration sites in Batangas Bay and Cagayan Norte.",
      "File DENR-BMB research clearance for in-situ substrate deployment within MPAs."
    ]
  },
];


/* ─── Helper: is item a Frontier? ────────────────────────────── */
function isFrontier(item: Topic | Frontier): item is Frontier {
  return "author" in item;
}


/* ─── Popup component ────────────────────────────────────────── */
function ResearchPopup({
  item,
  onClose,
  onUseAsTopic,
  onGenerateGaps,
}: {
  item: Topic | Frontier;
  onClose: () => void;
  onUseAsTopic?: () => void;   // for phTopics → opens GenerateResearchModal
  onGenerateGaps?: () => void; // for frontiers → generate gap topics
}) {
  const tag = isFrontier(item) ? item.author : item.tag;
  const isResearchFrontier = isFrontier(item);


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[32px] p-8 md:p-10 max-w-2xl w-full shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-[10px] font-black uppercase tracking-widest text-[#8B1538]">
            <Sparkles size={12} />
            <span>{tag}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
          >
            <X size={16} />
          </button>
        </div>


        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 pr-1">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-3 leading-tight">{item.title}</h2>


          <div className="flex items-center gap-3 mb-7 text-xs font-bold text-stone-400 uppercase tracking-widest">
            <span className="text-[#8B1538]">Curated Data</span>
          </div>


          <div className="space-y-6 text-stone-600 text-sm leading-relaxed">
            <div>
              <strong className="text-stone-900 block mb-2 text-[10px] uppercase tracking-widest">Problem Statement</strong>
              <p>{item.problem}</p>
            </div>
            <div>
              <strong className="text-stone-900 block mb-2 text-[10px] uppercase tracking-widest">
                {isResearchFrontier ? "Current Research & Opportunity" : "AI Synthesis & Opportunity"}
              </strong>
              <p>{item.opportunity}</p>
            </div>
            <div className="rounded-2xl bg-[#F9F8F6] p-5">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-900 mb-4">Recommended Next Steps</h4>
              <ul className="list-disc pl-4 space-y-2 text-sm">
                {item.nextSteps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          </div>
        </div>


        {/* Footer */}
        <div className="mt-6 flex-shrink-0 flex flex-col gap-3">
          {isResearchFrontier ? (
            <>
              <button
                onClick={() => { onGenerateGaps?.(); onClose(); }}
                className="w-full bg-[#8B1538] hover:bg-[#6D102C] text-white py-4 rounded-2xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <AlertTriangle size={16} /> Find Research Gaps & Improvements
              </button>
              <p className="text-center text-[10px] text-stone-400 font-medium">
                AI will generate 5 topics highlighting what this study lacks or can be improved
              </p>
            </>
          ) : (
            <>
              <button
                onClick={() => { onUseAsTopic?.(); onClose(); }}
                className="w-full bg-[#8B1538] hover:bg-[#6D102C] text-white py-4 rounded-2xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={16} /> Auto-Generate Topics
              </button>
              <p className="text-center text-[10px] text-stone-400 font-medium">
                AI will instantly generate 5 research topics addressing this problem
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


/* ─── Frontier card ──────────────────────────────────────────── */
function FrontierCard({ trend, height, onClick }: { trend: Frontier; height: string; onClick?: () => void }) {
  const isDark = trend.dark;
  return (
    <div
      onClick={onClick}
      className={`p-6 md:p-8 rounded-[32px] border transition-transform duration-300 hover:-translate-y-2 flex flex-col justify-between group w-full cursor-pointer min-h-[200px]
       ${isDark
          ? "bg-[#8B1538] text-white border-[#8B1538] shadow-lg"
          : "bg-white text-stone-800 border-stone-100 shadow-sm hover:border-[#8B1538]"
        }`}
      style={height !== "auto" ? { minHeight: height } : undefined}
    >
      <div>
        <div className={`w-10 h-10 rounded-xl mb-6 flex items-center justify-center shrink-0 ${isDark ? "bg-white/20" : "bg-[#8B1538]/10"}`}>
          <FlaskConical size={20} className={isDark ? "text-white" : "text-[#8B1538]"} />
        </div>
        <h4 className={`font-serif font-bold text-xl md:text-2xl mb-3 leading-tight tracking-tight transition-colors
         ${isDark ? "text-white" : "text-stone-900 group-hover:text-[#8B1538]"}`}>
          {trend.title}
        </h4>
        <p className={`text-sm leading-relaxed ${isDark ? "text-white/80" : "text-stone-500"}`}>
          {trend.desc}
        </p>
      </div>
      <div className={`flex items-center justify-between pt-6 mt-6 border-t font-semibold ${isDark ? "border-white/20" : "border-stone-100"}`}>
        <p className={`text-[9px] md:text-[10px] font-black tracking-[0.2em] uppercase ${isDark ? "text-white/80" : "text-stone-400"} max-w-[60%] truncate`}>
          {trend.author}
        </p>
        <div className={`text-[9px] md:text-[10px] font-black italic uppercase ${isDark ? "text-white/90" : "text-[#8B1538]"}`}>
          TOP TIER
        </div>
      </div>
    </div>
  );
}


/* ─── Generated Results View ───────────────────────────────────── */
function GeneratedResultsView({
  data,
  onClear
}: {
  data: GeneratedData;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(0);
  const difficultyColor: Record<string, string> = {
    Undergraduate: "bg-green-100 text-green-700",
    Graduate: "bg-amber-100 text-amber-700",
    Doctoral: "bg-purple-100 text-purple-700"
  };


  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-stone-200 gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1">Generated Research Topics</h2>
          <p className="text-stone-500 text-sm">
            AI-generated for <span className="font-bold text-[#8B1538]">{data.location.name.split(",")[0]}</span> · {data.fields.length} field{data.fields.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-700 transition-colors"
        >
          Clear Results
        </button>
      </div>


      <div className="flex flex-col gap-6">
        {data.topics.map((t, i) => (
          <div
            key={i}
            className={`rounded-3xl border transition-all duration-300 overflow-hidden bg-white ${expanded === i ? "border-[#8B1538] shadow-xl shadow-rose-900/10" : "border-stone-200 hover:border-rose-200"}`}
          >
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex flex-col md:flex-row items-start gap-4 p-6 text-left hover:bg-rose-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 w-full md:w-auto md:flex-col">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0 ${expanded === i ? "bg-[#8B1538] text-white" : "bg-stone-100 text-stone-500"}`}>
                  {i + 1}
                </span>
                <div className="md:hidden flex-1" />
                <ChevronRight size={20} className={`flex-shrink-0 text-stone-400 transition-transform hidden md:block mt-2 ${expanded === i ? "rotate-90" : ""}`} />
              </div>

              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white bg-[#8B1538] px-2.5 py-1 rounded-full">{t.field}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${difficultyColor[t.difficulty] || "bg-stone-100 text-stone-600"}`}>{t.difficulty}</span>
                </div>
                <h3 className="font-bold text-lg md:text-xl text-stone-900 leading-snug mb-2">{t.title}</h3>
                <p className={`text-sm text-stone-500 leading-relaxed transition-all duration-300 ${expanded === i ? "line-clamp-none" : "line-clamp-2"}`}>
                  {t.problem}
                </p>
              </div>
              <ChevronRight size={20} className={`flex-shrink-0 text-stone-400 transition-transform md:hidden self-center ${expanded === i ? "rotate-90" : ""}`} />
            </button>


            {expanded === i && (
              <div className="px-6 pb-8 md:pl-[88px] space-y-6 border-t border-stone-100 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8B1538] mb-2 flex items-center gap-2">
                      <Zap size={12} className="text-amber-500" /> Research Opportunity
                    </h4>
                    <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-100 h-full">{t.opportunity}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8B1538] mb-2 flex items-center gap-2">
                      <Sparkles size={12} className="text-amber-500" /> Novelty & Innovation
                    </h4>
                    <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-100 h-full">{t.novelty}</p>
                  </div>
                </div>

                <div className="bg-[#8B1538]/5 border border-rose-100 rounded-2xl p-5">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8B1538] mb-3 flex items-center gap-2">
                    <FlaskConical size={12} /> Local Resource Integrated
                  </h4>
                  <p className="text-sm text-stone-700 font-semibold">{t.resourceLink}</p>
                </div>


                <div className="rounded-2xl bg-stone-900 text-white p-6 shadow-xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Recommended Next Steps</h4>
                  <ul className="space-y-3">
                    {t.nextSteps.map((s, si) => (
                      <li key={si} className="flex items-start gap-3 text-sm text-stone-200">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center font-black flex-shrink-0 text-[10px] mt-0.5">{si + 1}</span>
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ─── Gap Results View ───────────────────────────────────────── */
function GapResultsView({
  basedOn,
  topics,
  onClear,
}: {
  basedOn: Frontier;
  topics: GeneratedData["topics"];
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState<number | null>(0);
  const difficultyColor: Record<string, string> = {
    Undergraduate: "bg-green-100 text-green-700",
    Graduate: "bg-amber-100 text-amber-700",
    Doctoral: "bg-purple-100 text-purple-700"
  };
  const gapTypeColor: Record<string, string> = {
    Methodological: "bg-blue-100 text-blue-700",
    Geographic: "bg-teal-100 text-teal-700",
    Population: "bg-orange-100 text-orange-700",
    Temporal: "bg-indigo-100 text-indigo-700",
    Scalability: "bg-violet-100 text-violet-700",
    Policy: "bg-rose-100 text-rose-700",
  };


  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-stone-200 gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] font-black uppercase tracking-widest text-amber-700 mb-3">
            <AlertTriangle size={12} /> Research Gaps Found
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-1">Gaps & Improvements</h2>
          <p className="text-stone-500 text-sm">
            Based on: <span className="font-bold text-[#8B1538]">{basedOn.title}</span>
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-stone-700 transition-colors"
        >
          Clear Results
        </button>
      </div>


      <div className="flex flex-col gap-6">
        {topics.map((t, i) => (
          <div
            key={i}
            className={`rounded-3xl border transition-all duration-300 overflow-hidden bg-white ${expanded === i ? "border-amber-400 shadow-xl shadow-amber-900/10" : "border-stone-200 hover:border-amber-200"
              }`}
          >
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex flex-col md:flex-row items-start gap-4 p-6 text-left hover:bg-amber-50/30 transition-colors"
            >
              <div className="flex items-center gap-3 w-full md:w-auto md:flex-col">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0 ${expanded === i ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-500"
                  }`}>
                  {i + 1}
                </span>
                <ChevronRight size={20} className={`flex-shrink-0 text-stone-400 transition-transform hidden md:block mt-2 ${expanded === i ? "rotate-90" : ""}`} />
              </div>
              <div className="flex-1 min-w-0 w-full">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white bg-amber-500 px-2.5 py-1 rounded-full">{t.field}</span>
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${difficultyColor[t.difficulty] || "bg-stone-100 text-stone-600"}`}>{t.difficulty}</span>
                  {(t as any).gapType && (
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${gapTypeColor[(t as any).gapType] || "bg-stone-100 text-stone-600"}`}>
                      {(t as any).gapType} Gap
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-lg md:text-xl text-stone-900 leading-snug mb-2">{t.title}</h3>
                <p className={`text-sm text-stone-500 leading-relaxed transition-all duration-300 ${expanded === i ? "line-clamp-none" : "line-clamp-2"}`}>
                  {t.problem}
                </p>
              </div>
              <ChevronRight size={20} className={`flex-shrink-0 text-stone-400 transition-transform md:hidden self-center ${expanded === i ? "rotate-90" : ""}`} />
            </button>


            {expanded === i && (
              <div className="px-6 pb-8 md:pl-[88px] space-y-6 border-t border-stone-100 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2 flex items-center gap-2">
                      <AlertTriangle size={12} /> Gap This Fills
                    </h4>
                    <p className="text-sm text-stone-700 leading-relaxed bg-amber-50 p-4 rounded-2xl border border-amber-100 h-full">{t.problem}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8B1538] mb-2 flex items-center gap-2">
                      <Sparkles size={12} /> Proposed Direction
                    </h4>
                    <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-100 h-full">{t.opportunity}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-[#8B1538] mb-2 flex items-center gap-2">
                    <Zap size={12} /> How It Differs from the Existing Study
                  </h4>
                  <p className="text-sm text-stone-700 leading-relaxed bg-stone-50 p-4 rounded-2xl border border-stone-100">{t.novelty}</p>
                </div>
                <div className="rounded-2xl bg-stone-900 text-white p-6 shadow-xl">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Recommended Next Steps</h4>
                  <ul className="space-y-3">
                    {t.nextSteps.map((s, si) => (
                      <li key={si} className="flex items-start gap-3 text-sm text-stone-200">
                        <span className="w-5 h-5 rounded-full bg-white/10 text-white flex items-center justify-center font-black flex-shrink-0 text-[10px] mt-0.5">{si + 1}</span>
                        <span className="leading-relaxed">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


/* ─── Main page ──────────────────────────────────────────────── */
export default function TopicGenerator() {
  const [selectedItem, setSelectedItem] = useState<Topic | Frontier | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatedData, setGeneratedData] = useState<GeneratedData | null>(null);
  const [gapData, setGapData] = useState<{ basedOn: Frontier; topics: GeneratedData["topics"] } | null>(null);
  const [generatingGaps, setGeneratingGaps] = useState(false);
  const [gapError, setGapError] = useState("");
  const [generatingProblem, setGeneratingProblem] = useState(false);
  const [problemError, setProblemError] = useState("");


  const handleGenerateProblemTopics = async (topic: Topic) => {
    setGeneratingProblem(true);
    setProblemError("");
    setGeneratedData(null);
    try {
      const res = await fetch("/api/generate-problem-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topic),
      });
      const data = await res.json();
      if (data.topics) {
        setGeneratedData({
          topics: data.topics,
          location: { name: "Local Priority Problem", lat: 0, lng: 0, problems: [], resources: [] },
          fields: [topic.tag]
        });
      } else {
        setProblemError(data.error || "Failed to generate topics.");
      }
    } catch {
      setProblemError("Network error. Please try again.");
    } finally {
      setGeneratingProblem(false);
    }
  };


  const handleGenerateGaps = async (frontier: Frontier) => {
    setGeneratingGaps(true);
    setGapError("");
    setGapData(null);
    try {
      const res = await fetch("/api/generate-gap-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: frontier.title,
          author: frontier.author,
          problem: frontier.problem,
          opportunity: frontier.opportunity,
        }),
      });
      const data = await res.json();
      if (data.topics) {
        setGapData({ basedOn: frontier, topics: data.topics });
      } else {
        setGapError(data.error || "Failed to generate gap topics.");
      }
    } catch {
      setGapError("Network error. Please try again.");
    } finally {
      setGeneratingGaps(false);
    }
  };


  return (
    <div className="w-full overflow-y-auto bg-[#F9F8F6] text-stone-800">
      <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-14 p-6 md:p-10 pb-20">


        {/* ── Header ─────────────────────────────────────────── */}
        <div className="w-full flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 pt-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-6">
              <Sparkles size={12} /> Research Synthesis
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4 tracking-tight">Topic Generator</h1>
            <p className="text-stone-500 max-w-lg text-sm md:text-base leading-relaxed">Synthesize Philippine-specific issues with global, award-winning innovations.</p>
          </div>


          <button
            onClick={() => setShowGenerator(true)}
            className="group relative self-start xl:self-auto bg-[#8B1538] hover:bg-[#6D102C] text-white px-6 py-3 md:py-4 rounded-2xl font-bold shadow-xl shadow-rose-900/20 transition-all flex items-center gap-3 overflow-hidden">
            <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[-20deg] group-hover:translate-x-[200%] transition-transform duration-700" />
            <Lightbulb size={20} className="text-amber-300" />
            <span className="whitespace-nowrap">Generate New Research</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>


        {/* Loading overlay for problem/gap generation */}
        {(generatingGaps || generatingProblem) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] p-10 flex flex-col items-center gap-4 shadow-2xl">
              <Loader2 size={36} className="text-[#8B1538] animate-spin" />
              <p className="font-bold text-stone-900">{generatingGaps ? "Finding research gaps…" : "Auto-generating topics…"}</p>
              <p className="text-xs text-stone-400">
                {generatingGaps ? "AI is analyzing limitations of the existing study" : "AI is creating specific topics for this local problem"}
              </p>
            </div>
          </div>
        )}


        {(gapError || problemError) && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <p className="text-red-600 text-sm font-semibold">{gapError || problemError}</p>
          </div>
        )}


        {gapData ? (
          <GapResultsView basedOn={gapData.basedOn} topics={gapData.topics} onClear={() => setGapData(null)} />
        ) : generatedData ? (
          <GeneratedResultsView data={generatedData} onClear={() => setGeneratedData(null)} />
        ) : (
          <>
            {/* ── Local Priority Watch — looping marquee row ─────── */}
            <section className="w-full min-w-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-200 pb-4 mb-6 gap-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#8B1538] flex items-center gap-2">
                  <TrendingUp size={14} /> Local Priority Watch (Top 20)
                </h3>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest bg-stone-100 px-3 py-1.5 rounded-full w-max flex-shrink-0">
                   Curated from DA, DOST & DENR Priority Lists
                </span>
              </div>


              {/* Marquee container — overflow hidden, no scroll bar */}
              <div className="relative overflow-hidden">
                {/* Fade edges */}
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-[#F9F8F6] to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-[#F9F8F6] to-transparent" />


                <div
                  className="flex gap-5 marquee-track"
                  style={{ width: "max-content" }}
                >
                  {/* Render twice for seamless loop */}
                  {[...phTopics, ...phTopics].map((topic, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedItem(topic)}
                      className="bg-white border border-stone-200 p-5 rounded-[28px] transition-transform duration-300 hover:-translate-y-2 hover:border-[#8B1538] hover:shadow-2xl group flex flex-col justify-between cursor-pointer flex-shrink-0"
                      style={{ width: "220px", minHeight: "190px" }}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center text-xs font-black text-stone-400 group-hover:bg-rose-100 group-hover:text-[#8B1538] transition-colors shrink-0">
                            {topic.rank}
                          </span>
                          <span className="text-[9px] font-black uppercase text-stone-400 tracking-widest text-right ml-2 leading-tight">{topic.tag}</span>
                        </div>
                        <h4 className="font-bold text-sm text-stone-900 mb-3 leading-snug group-hover:text-[#8B1538] line-clamp-3">
                          {topic.title}
                        </h4>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                        <span className="text-[9px] font-bold text-stone-400">PRIORITY</span>
                        <span className="text-[9px] font-black text-[#8B1538]">HIGH</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>


            {/* ── Global & Local Frontiers ────────────────────────── */}
            <section className="space-y-8 pb-20 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4 mb-6">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400">Global & Local Frontiers (Award-Winning)</h3>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest bg-stone-100 px-3 py-1.5 rounded-full w-max flex-shrink-0">
                   Published Academic Literature Seed Data
                </span>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {researchFrontiers.map((frontier, idx) => (
                  <FrontierCard
                    key={idx}
                    onClick={() => setSelectedItem(frontier)}
                    trend={frontier}
                    height="auto"
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>


      {/* ── Popup ──────────────────────────────────────────────── */}
      {selectedItem && (
        <ResearchPopup
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUseAsTopic={() => {
            if (!isFrontier(selectedItem)) {
              setSelectedItem(null);
              handleGenerateProblemTopics(selectedItem);
            }
          }}
          onGenerateGaps={() => {
            if (isFrontier(selectedItem)) {
              setSelectedItem(null);
              handleGenerateGaps(selectedItem);
            }
          }}
        />
      )}


      {/* ── Generate Research Modal ──────────────────────────────── */}
      {showGenerator && (
        <GenerateResearchModal
          onClose={() => setShowGenerator(false)}
          onComplete={(data) => {
            setGeneratedData(data);
            setShowGenerator(false);
          }}
        />
      )}


      {/* ── Marquee keyframe ────────────────────────────────────── */}
      <style>{`
       @keyframes marquee {
         0%   { transform: translateX(0); }
         100% { transform: translateX(-50%); }
       }
       .marquee-track {
         animation: marquee 40s linear infinite;
       }
       .marquee-track:hover {
         animation-play-state: paused;
       }
     `}</style>
    </div>
  );
}

