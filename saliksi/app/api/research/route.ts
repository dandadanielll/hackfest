import { NextResponse } from "next/server";
import { scoreCredibility } from "@/lib/credibility";

// Reconstruct abstract from OpenAlex inverted index format
function reconstructAbstract(invertedIndex: Record<string, number[]> | null): string {
  if (!invertedIndex) return "";
  try {
    const wordPositions: [string, number][] = [];
    for (const [word, positions] of Object.entries(invertedIndex)) {
      for (const pos of positions) {
        wordPositions.push([word, pos]);
      }
    }
    wordPositions.sort((a, b) => a[1] - b[1]);
    return wordPositions.map(([word]) => word).join(" ");
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  try {
    const { query, localSourcesOnly, page = 1 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Collect raw results without scores first
    const rawResults: any[] = [];

    // --- OpenAlex (Primary) ---
    try {
      let openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=15&page=${page}&mailto=dunong@up.edu.ph`;
      if (localSourcesOnly) openAlexUrl += `&filter=institutions.country_code:PH`;

      const oaRes = await fetch(openAlexUrl);
      if (oaRes.ok) {
        const oaData = await oaRes.json();
        for (const work of (oaData.results || [])) {
          const isLocal = work.authorships?.some((a: any) =>
            a.institutions?.some((i: any) => i.country_code === "PH")
          ) || false;

          if (localSourcesOnly && !isLocal) continue;

          const citations = work.cited_by_count || 0;
          const authors = (work.authorships || [])
            .slice(0, 3)
            .map((a: any) => a.author?.display_name)
            .filter(Boolean)
            .join(", ") || "Unknown Author";

          const abstract = reconstructAbstract(work.abstract_inverted_index);
          const doi = work.doi ? work.doi.replace("https://doi.org/", "") : null;
          const journal = work.primary_location?.source?.display_name || "Unknown Journal";

          rawResults.push({
            id: work.id,
            title: work.display_name || "Untitled",
            authors,
            year: work.publication_year?.toString() || "",
            journal,
            abstract,
            localSource: isLocal,
            openAccess: work.open_access?.is_oa || false,
            url: work.doi || work.id,
            doi,
            source: isLocal ? "OpenAlex (PH)" : "OpenAlex",
            citationCount: citations,
            _scoreMeta: {
              title: work.display_name,
              journal,
              doi,
              citationCount: citations,
              isOpenAccess: work.open_access?.is_oa || false,
              isPhilippine: isLocal,
            },
          });
        }
      }
    } catch (err) {
      console.error("OpenAlex error:", err);
    }

    // --- PHILJOL OAI-PMH (always for local) ---
    if ((localSourcesOnly || rawResults.length < 5) && page === 1) {
      try {
        const philjolUrl = `https://philjol.info/index.php/oai?verb=ListRecords&metadataPrefix=oai_dc`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const philjolRes = await fetch(philjolUrl, {
          headers: { "User-Agent": "Dunong/1.0 (dunong@up.edu.ph)" },
          signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (philjolRes.ok) {
          const xml = await philjolRes.text();
          const titleMatches = [...xml.matchAll(/<dc:title>([\s\S]*?)<\/dc:title>/g)];
          const creatorMatches = [...xml.matchAll(/<dc:creator>([\s\S]*?)<\/dc:creator>/g)];
          const dateMatches = [...xml.matchAll(/<dc:date>([\s\S]*?)<\/dc:date>/g)];
          const descMatches = [...xml.matchAll(/<dc:description>([\s\S]*?)<\/dc:description>/g)];
          const identifierMatches = [...xml.matchAll(/<dc:identifier>([\s\S]*?)<\/dc:identifier>/g)];

          const queryLower = query.toLowerCase();
          let added = 0;

          for (let i = 0; i < titleMatches.length && added < 4; i++) {
            const title = titleMatches[i][1].replace(/<[^>]+>/g, "").trim();
            const abstract = (descMatches[i]?.[1] || "").replace(/<[^>]+>/g, "").trim();

            if (
              title.toLowerCase().includes(queryLower) ||
              abstract.toLowerCase().includes(queryLower.split(" ")[0])
            ) {
              const urlMatch = (identifierMatches[i]?.[1] || "").match(/https?:\/\/[^\s<]+/);
              const year = (dateMatches[i]?.[1] || "").substring(0, 4);
              const resolvedUrl = urlMatch ? urlMatch[0] : "https://philjol.info";

              rawResults.push({
                id: `philjol-${i}-${Date.now()}`,
                title,
                authors: (creatorMatches[i]?.[1] || "Unknown Author").replace(/<[^>]+>/g, ""),
                year,
                journal: "PHILJOL",
                abstract,
                localSource: true,
                openAccess: true,
                url: resolvedUrl,
                doi: null,
                source: "PHILJOL",
                citationCount: 0,
                _scoreMeta: {
                  title,
                  journal: "PHILJOL",
                  doi: null,
                  url: resolvedUrl,
                  citationCount: 0,
                  isOpenAccess: true,
                  isPhilippine: true,
                },
              });
              added++;
            }
          }
        }
      } catch {
        // PHILJOL unavailable — silently skip
      }
    }

    // --- Semantic Scholar (international only) ---
    if (!localSourcesOnly) {
      try {
        const ssUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=10&offset=${(page - 1) * 10}&fields=title,authors,year,abstract,venue,externalIds,citationCount,isOpenAccess`;
        const ssRes = await fetch(ssUrl, {
          headers: { "User-Agent": "Dunong/1.0 (dunong@up.edu.ph)" },
        });

        if (ssRes.ok) {
          const ssData = await ssRes.json();
          for (const paper of (ssData.data || [])) {
            const authors = (paper.authors || [])
              .slice(0, 3)
              .map((a: any) => a.name)
              .join(", ") || "Unknown Author";

            const doi = paper.externalIds?.DOI || null;
            const citations = paper.citationCount || 0;
            const journal = paper.venue || "Unknown Venue";

            rawResults.push({
              id: `ss-${paper.paperId}`,
              title: paper.title || "Untitled",
              authors,
              year: paper.year?.toString() || "",
              journal,
              abstract: paper.abstract || "",
              localSource: false,
              openAccess: paper.isOpenAccess || false,
              url: doi ? `https://doi.org/${doi}` : `https://semanticscholar.org/paper/${paper.paperId}`,
              doi,
              source: "Semantic Scholar",
              citationCount: citations,
              _scoreMeta: {
                title: paper.title,
                journal,
                doi,
                citationCount: citations,
                isOpenAccess: paper.isOpenAccess || false,
                isPhilippine: false,
              },
            });
          }
        }
      } catch (err) {
        console.error("Semantic Scholar error:", err);
      }
    }

    // Deduplicate by DOI or title
    const seen = new Set<string>();
    const deduplicated = rawResults.filter((a) => {
      const key = a.doi || a.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Cap to 10 before AI scoring to keep latency acceptable
    const capped = deduplicated.slice(0, 10);

    // Score all results in parallel using the shared AI scorer (same rubric as credibility tab)
    const scored = await Promise.all(
      capped.map(async (r) => {
        const { _scoreMeta, ...rest } = r;
        try {
          const { score } = await scoreCredibility(_scoreMeta);
          return { ...rest, credibility: score };
        } catch {
          return { ...rest, credibility: 0 };
        }
      })
    );

    // Sort: local first, then by credibility
    scored.sort((a, b) => {
      if (a.localSource && !b.localSource) return -1;
      if (!a.localSource && b.localSource) return 1;
      return b.credibility - a.credibility;
    });

    if (scored.length === 0) {
      return NextResponse.json({
        articles: [],
        message: "No results found. Try a different search term.",
      });
    }

    return NextResponse.json({ articles: scored });
  } catch (error) {
    console.error("Research route error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}