import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query, localSourcesOnly } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Connect to OpenAlex API
    let url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=12`;
    
    // Apply Philippine Institution Filter if localSourcesOnly is toggled
    if (localSourcesOnly) {
       url += `&filter=institutions.country_code:PH`;
    }

    const response = await fetch(url);
    if (!response.ok) {
       throw new Error(`OpenAlex API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Transform OpenAlex schema to Dunong standard Article schema
    const articles = data.results.map((work: any) => {
      // Calculate Dunong Credibility Score (PRD logic)
      let score = 55; // Lowered baseline so 100 is rare
      const isLocal = work.authorships?.some((a: any) => a.institutions?.some((i: any) => i.country_code === 'PH'));
      if (isLocal) score += 10;
      if (work.open_access?.is_oa) score += 5;
      if (work.doi) score += 5;
      if (work.cited_by_count > 500) score += 25;
      else if (work.cited_by_count > 100) score += 15;
      else if (work.cited_by_count > 20) score += 10;
      else if (work.cited_by_count > 5) score += 5;
      
      score = Math.min(score, 100);

      // Safe Extraction of data
      const authors = work.authorships?.slice(0, 3).map((a: any) => a.author?.display_name).join(", ") || "Unknown Author";
      const abstractText = work.abstract_inverted_index 
          ? Object.keys(work.abstract_inverted_index).slice(0, 40).join(" ") + "..." // Simple reconstruction for demo
          : "Abstract not available for this article.";

      return {
        id: work.id,
        title: work.display_name || "Untitled Research",
        authors: authors,
        year: work.publication_year?.toString() || new Date().getFullYear().toString(),
        journal: work.primary_location?.source?.display_name || "Independent Publisher",
        credibility: score,
        abstract: abstractText,
        localSource: isLocal || localSourcesOnly,
        openAccess: work.open_access?.is_oa || false,
        url: work.doi || work.id,
        citations: work.cited_by_count || 0
      };
    });

    // If API returns empty, fallback to seed
    if (articles.length === 0) {
      throw new Error("No results found, falling back to seed");
    }

    // Sort by credibility (Dunong ranking)
    articles.sort((a: any, b: any) => b.credibility - a.credibility);

    return NextResponse.json({ articles: articles.slice(0, 10) });

  } catch (error) {
    console.error("Search Engine Live Fetch failed, returning seed data:", error);
    
    // PRD Fallback Strategy: Return 3 high quality hardcoded local papers
    const seedArticles = [
      {
         id: "seed-1",
         title: "Stunting and cognitive development in Filipino children: A longitudinal study in rural Mindanao.",
         authors: "Santos, J., Dimaculangan, R., & Reyes, M.",
         year: "2022",
         journal: "Philippine Journal of Health Research",
         credibility: 94,
         abstract: "This study investigates the long-term cognitive impacts of early childhood stunting in rural Mindanao communities...",
         localSource: true,
         openAccess: true,
         url: "https://herdin.ph",
         citations: 124
      },
      {
         id: "seed-2",
         title: "Urban-rural disparities in child nutritional status and academic performance in Region VII.",
         authors: "Garcia, L. & Fernandez, P.",
         year: "2021",
         journal: "Journal of Philippine Education Studies",
         credibility: 88,
         abstract: "Analyzing DepEd achievement tests alongside regional health data, this paper identifies significant correlations between malnutrition...",
         localSource: true,
         openAccess: false,
         url: "https://philjol.info",
         citations: 45
      },
      {
         id: "seed-3",
         title: "Evaluating the effectiveness of DepEd school-based feeding programs in Northern Luzon.",
         authors: "Villanueva, C.",
         year: "2023",
         journal: "PHILJOL - Education Quarterly",
         credibility: 95,
         abstract: "A comprehensive assessment of state-funded feeding interventions over a 3-year period across 50 public elementary schools.",
         localSource: true,
         openAccess: true,
         url: "https://philjol.info",
         citations: 12
      }
    ];

    return NextResponse.json({ articles: seedArticles });
  }
}