import { NextResponse } from "next/server";

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
    const { query, localSourcesOnly } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const results: any[] = [];

    // --- OpenAlex (Primary) ---
    try {
      let openAlexUrl = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=12&mailto=dunong@up.edu.ph`;

      if (localSourcesOnly) {
        openAlexUrl += `&filter=institutions.country_code:PH`;
      }

      const oaRes = await fetch(openAlexUrl);
      if (oaRes.ok) {
        const oaData = await oaRes.json();

        for (const work of (oaData.results || [])) {
          const isLocal = work.authorships?.some((a: any) =>
            a.institutions?.some((i: any) => i.country_code === "PH")
          ) || false;

          // Skip international if localSourcesOnly
          if (localSourcesOnly && !isLocal) continue;

          let score = 50;
          if (isLocal) score += 10;
          if (work.open_access?.is_oa) score += 5;
          if (work.doi) score += 5;
          const citations = work.cited_by_count || 0;
          if (citations > 500) score += 25;
          else if (citations > 100) score += 15;
          else if (citations > 20) score += 10;
          else if (citations > 5) score += 5;
          score = Math.min(score, 99);

          const authors = (work.authorships || [])
            .slice(0, 3)
            .map((a: any) => a.author?.display_name)
            .filter(Boolean)
            .join(", ") || "Unknown Author";

          const abstract = reconstructAbstract(work.abstract_inverted_index);

          const doi = work.doi
            ? work.doi.replace("https://doi.org/", "")
            : null;

          results.push({
            id: work.id,
            title: work.display_name || "Untitled",
            authors,
            year: work.publication_year?.toString() || "",
            journal: work.primary_location?.source?.display_name || "Unknown Journal",
            credibility: score,
            abstract,
            localSource: isLocal,
            openAccess: work.open_access?.is_oa || false,
            url: work.doi || work.id,
            doi,
            source: isLocal ? "OpenAlex (PH)" : "OpenAlex",
            citationCount: citations,
          });
        }
      }
    } catch (err) {
      console.error("OpenAlex error:", err);
    }

    // --- PHILJOL OAI-PMH (always for local) ---
    if (localSourcesOnly || results.length < 5) {
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

              results.push({
                id: `philjol-${i}-${Date.now()}`,
                title,
                authors: (creatorMatches[i]?.[1] || "Unknown Author").replace(/<[^>]+>/g, ""),
                year,
                journal: "PHILJOL",
                credibility: 75,
                abstract,
                localSource: true,
                openAccess: true,
                url: urlMatch ? urlMatch[0] : "https://philjol.info",
                doi: null,
                source: "PHILJOL",
                citationCount: 0,
              });
              added++;
            }
          }
        }
      } catch (err) {
        // PHILJOL unavailable — silently skip, OpenAlex results still shown
      }
    }

    // --- Semantic Scholar (international only) ---
    if (!localSourcesOnly) {
      try {
        const ssUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=5&fields=title,authors,year,abstract,venue,externalIds,citationCount,isOpenAccess`;
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

            let score = 50;
            if (doi) score += 5;
            if (paper.isOpenAccess) score += 5;
            if (citations > 500) score += 25;
            else if (citations > 100) score += 15;
            else if (citations > 20) score += 10;
            else if (citations > 5) score += 5;
            score = Math.min(score, 99);

            results.push({
              id: `ss-${paper.paperId}`,
              title: paper.title || "Untitled",
              authors,
              year: paper.year?.toString() || "",
              journal: paper.venue || "Unknown Venue",
              credibility: score,
              abstract: paper.abstract || "",
              localSource: false,
              openAccess: paper.isOpenAccess || false,
              url: doi ? `https://doi.org/${doi}` : `https://semanticscholar.org/paper/${paper.paperId}`,
              doi,
              source: "Semantic Scholar",
              citationCount: citations,
            });
          }
        }
      } catch (err) {
        console.error("Semantic Scholar error:", err);
      }
    }

    // Deduplicate by DOI or title
    const seen = new Set<string>();
    const deduplicated = results.filter((a) => {
      const key = a.doi || a.title.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort: local first, then by credibility
    deduplicated.sort((a, b) => {
      if (a.localSource && !b.localSource) return -1;
      if (!a.localSource && b.localSource) return 1;
      return b.credibility - a.credibility;
    });

    if (deduplicated.length === 0) {
      return NextResponse.json({
        articles: [],
        message: "No results found. Try a different search term.",
      });
    }

    return NextResponse.json({ articles: deduplicated.slice(0, 12) });

  } catch (error) {
    console.error("Research route error:", error);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}