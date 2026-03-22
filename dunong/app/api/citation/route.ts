import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

// ── CrossRef: best for DOIs ─────────────────────────────────────────────────
async function fetchCrossRef(doi: string) {
  try {
    const clean = doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    const res = await fetch(
      "https://api.crossref.org/works/" + encodeURIComponent(clean),
      { headers: { "User-Agent": "Dunong/1.0 (mailto:dunong@hackfest.ph)" } }
    );
    if (!res.ok) return null;
    const { message: w } = await res.json();
    const authors = w.author
      ? w.author.slice(0, 30).map((a: any) => (a.family || "") + (a.given ? ", " + a.given : "")).join("; ") + (w.author.length > 30 ? "; et al." : "")
      : null;
    const year =
      (w.published?.["date-parts"]?.[0]?.[0]) ||
      (w["published-print"]?.["date-parts"]?.[0]?.[0]) ||
      null;
    return {
      title: w.title?.[0] || null,
      authors,
      year: year ? String(year) : null,
      journal: w["container-title"]?.[0] || null,
      volume: w.volume || null,
      issue: w.issue || null,
      pages: w.page || null,
      publisher: w.publisher || null,
      doi: clean,
      url: w.URL || ("https://doi.org/" + clean),
    };
  } catch { return null; }
}

// ── Semantic Scholar: works by DOI or URL ────────────────────────────────────
async function fetchSemanticScholar(query: string) {
  try {
    // Try direct lookup by DOI first
    const doiMatch = query.match(/10\.\d{4,}\/\S+/);
    if (doiMatch) {
      const doi = doiMatch[0].replace(/[.,;)\]]+$/, "");
      const r = await fetch(
        "https://api.semanticscholar.org/graph/v1/paper/DOI:" + encodeURIComponent(doi) +
        "?fields=title,authors,year,journal,externalIds,publicationDate,venue",
        { headers: { "User-Agent": "Dunong/1.0" } }
      );
      if (r.ok) {
        const d = await r.json();
        if (d.title) return {
          title: d.title,
          authors: d.authors ? d.authors.slice(0, 30).map((a: any) => a.name).join("; ") + (d.authors.length > 30 ? "; et al." : "") : null,
          year: d.year ? String(d.year) : null,
          journal: d.journal?.name || d.venue || null,
          doi,
          url: "https://doi.org/" + doi,
        };
      }
    }

    // Try search by URL or title
    const searchQuery = query.startsWith("http") ? query : query;
    const r2 = await fetch(
      "https://api.semanticscholar.org/graph/v1/paper/search?query=" + encodeURIComponent(searchQuery) +
      "&limit=1&fields=title,authors,year,journal,venue,externalIds",
      { headers: { "User-Agent": "Dunong/1.0" } }
    );
    if (!r2.ok) return null;
    const d2 = await r2.json();
    const paper = d2.data?.[0];
    if (!paper) return null;
    return {
      title: paper.title,
      authors: paper.authors ? paper.authors.slice(0, 30).map((a: any) => a.name).join("; ") + (paper.authors.length > 30 ? "; et al." : "") : null,
      year: paper.year ? String(paper.year) : null,
      journal: paper.journal?.name || paper.venue || null,
      doi: paper.externalIds?.DOI || null,
      url: paper.externalIds?.DOI ? "https://doi.org/" + paper.externalIds.DOI : searchQuery,
    };
  } catch { return null; }
}

// ── HTML meta-tag scraper (best-effort, works for static pages) ──────────────
async function fetchHtmlMeta(url: string) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)", Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();

    function meta(name: string): string | null {
      const pats = [
        '<meta[^>]+(?:property|name)=["\']*' + name + '["\']*[^>]+content=["\']*([^"\']+)["\']*',
        '<meta[^>]+content=["\']*([^"\']+)["\']*[^>]+(?:property|name)=["\']*' + name + '["\']*',
      ];
      for (const p of pats) {
        const m = html.match(new RegExp(p, "i"));
        if (m?.[1]) return m[1].trim();
      }
      return null;
    }

    // Collect all citation_author tags (there can be multiple)
    function allMeta(name: string): string[] {
      const results: string[] = [];
      const re = new RegExp('<meta[^>]+name=["\']*' + name + '["\']*[^>]+content=["\']*([^"\']+)["\']*', "gi");
      let m;
      while ((m = re.exec(html)) !== null) results.push(m[1].trim());
      return results;
    }

    const title =
      meta("citation_title") ||
      meta("og:title") ||
      meta("DC.title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ||
      null;

    const authorTags = allMeta("citation_author");
    const dcCreators = allMeta("DC.creator");
    const authorMeta = meta("author") || meta("og:article:author");
    const authors =
      authorTags.join("; ") ||
      dcCreators.join("; ") ||
      (authorMeta ? authorMeta : null);

    const rawYear =
      meta("citation_publication_date") ||
      meta("citation_date") ||
      meta("DC.date") ||
      meta("article:published_time") ||
      meta("og:article:published_time") ||
      "";
    const year = rawYear.slice(0, 4) || null;

    const journal =
      meta("citation_journal_title") ||
      meta("og:site_name") ||
      meta("DC.publisher") ||
      null;

    const doi = meta("citation_doi") || null;

    if (!title && !authors) return null;  // nothing useful
    return { title, authors, year, journal, doi, url };
  } catch { return null; }
}

// ── PDF base64 text extraction ───────────────────────────────────────────────
function extractPdfText(b64: string): string {
  try {
    const buf = Buffer.from(b64, "base64");
    // Method 1: try extracting raw text objects from PDF stream
    const str = buf.toString("binary");
    const textChunks: string[] = [];

    // Look for text in parentheses (PDF text operators: (text) Tj  or [(text)] TJ)
    const parens = str.match(/\(([^\)]{3,})\)/g) || [];
    for (const p of parens) {
      const clean = p.slice(1, -1).replace(/[^\x20-\x7E]/g, " ").trim();
      if (clean.length > 3 && !/^[\d. ]+$/.test(clean)) textChunks.push(clean);
    }

    // Method 2: scan for longer readable ASCII strings (fallback)
    const readable = str.match(/[ \w.,:\-\/]{5,}/g) || [];
    for (const r of readable) {
      const t = r.trim();
      if (t.length > 5 && !/^[\d. ]+$/.test(t)) textChunks.push(t);
    }

    const combined = [...new Set(textChunks)].join(" ").slice(0, 6000);
    return combined || "";
  } catch { return ""; }
}

// ── Extract DOI from string ──────────────────────────────────────────────────
function extractDoi(s: string): string | null {
  const m = s.match(/10\.\d{4,}\/\S+/);
  return m ? m[0].replace(/[.,;)\]]+$/, "") : null;
}

// ── Format metadata object into a string for the AI ─────────────────────────
function formatMeta(m: any, sourceUrl?: string): string {
  const lines = [
    m.title   ? "Title: " + m.title : null,
    m.authors ? "Authors: " + m.authors : null,
    m.year    ? "Year: " + m.year : null,
    m.journal ? "Journal: " + m.journal : null,
    m.volume  ? "Volume: " + m.volume + (m.issue ? ", Issue: " + m.issue : "") + (m.pages ? ", Pages: " + m.pages : "") : null,
    m.publisher ? "Publisher: " + m.publisher : null,
    m.doi     ? "DOI: " + m.doi : null,
    "URL: " + (m.url || sourceUrl || "N/A"),
  ];
  return lines.filter(Boolean).join("\n");
}

// ── Main POST handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      url?: string; doi?: string; text?: string;
      fileBase64?: string; fileName?: string;
    };
    const { url, doi, text, fileBase64, fileName } = body;
    const rawInput = (url || doi || text || "").trim();

    if (!rawInput && !fileBase64) {
      return NextResponse.json({ error: "No source provided." }, { status: 400 });
    }

    let contextForAI = "";
    let sourceType = "unknown";

    // ── Priority 1: File upload ──────────────────────────────────────────────
    if (fileBase64 && fileName) {
      sourceType = "file";
      let extractedText = "";

      if (fileName.toLowerCase().endsWith(".pdf")) {
        extractedText = extractPdfText(fileBase64);
        console.log("[Citation] PDF extracted text length:", extractedText.length);
      } else {
        // Plain text / docx fragment
        extractedText = Buffer.from(fileBase64, "base64").toString("utf-8").slice(0, 6000);
      }

      if (extractedText.length > 30) {
        contextForAI =
          "FILE: " + fileName + "\n" +
          "EXTRACTED TEXT (use to infer title, authors, year, journal from this):\n" +
          extractedText;
      } else {
        contextForAI =
          "FILE: " + fileName + "\n" +
          "(Could not extract readable text from this file. " +
          "Infer as much as possible from the filename. If it looks like an academic paper code, note that.)";
      }
    }

    // ── Priority 2: DOI ─────────────────────────────────────────────────────
    else if (doi || (!text && extractDoi(rawInput))) {
      const detectedDoi = doi || extractDoi(rawInput)!;
      sourceType = "doi";
      console.log("[Citation] Fetching DOI:", detectedDoi);

      let meta = await fetchCrossRef(detectedDoi);
      if (!meta || !meta.title) {
        console.log("[Citation] CrossRef miss, trying Semantic Scholar");
        const ss = await fetchSemanticScholar(detectedDoi);
        if (ss) meta = { ...meta, ...ss } as any;
      }

      if (meta && meta.title) {
        contextForAI = "METADATA FROM DATABASE:\n" + formatMeta(meta);
      } else {
        contextForAI = "DOI: " + detectedDoi + " (lookup failed — infer from DOI pattern)";
      }
      console.log("[Citation] Context:", contextForAI.slice(0, 200));
    }

    // ── Priority 3: URL ─────────────────────────────────────────────────────
    else if (url || (!text && rawInput.startsWith("http"))) {
      const detectedUrl = url || rawInput;
      sourceType = "url";
      console.log("[Citation] Fetching URL:", detectedUrl);

      // Try HTML meta tags first
      let found = await fetchHtmlMeta(detectedUrl);

      // If not found, try Semantic Scholar search with the URL
      if (!found || !found.title) {
        console.log("[Citation] HTML meta miss, trying Semantic Scholar search");
        const ss = await fetchSemanticScholar(detectedUrl);
        if (ss?.title) found = ss as any;
      }

      if (found && found.title) {
        contextForAI = "METADATA FROM SOURCE:\n" + formatMeta(found, detectedUrl);
      } else {
        contextForAI = "URL: " + detectedUrl + "\n(Could not retrieve metadata — cite as a general webpage using the URL)";
      }
      console.log("[Citation] Context:", contextForAI.slice(0, 200));
    }

    // ── Priority 4: Plain text ───────────────────────────────────────────────
    else {
      sourceType = "text";
      contextForAI = "Source: " + rawInput;
    }

    const prompt =
      "You are a precise academic citation engine.\n\n" +
      "Generate APA 7th, MLA 9th, and Chicago 17th citations for:\n\n" +
      "TYPE: " + sourceType + "\n" +
      "DATA:\n" + contextForAI + "\n\n" +
      "RULES:\n" +
      "- Return ONLY a JSON object. No markdown, no preamble.\n" +
      "- Use the data exactly as given.\n" +
      '- Missing dates → "n.d.", missing authors → "Unknown Author".\n' +
      "- File sources: infer author/title/year from the extracted text.\n" +
      "- URL sources without metadata: cite as a webpage with access date 2025.\n" +
      '- Output: {"apa": "...", "mla": "...", "chicago": "..."}\n\n' +
      "JSON ONLY:";

    const result = await askGroqJSON<{ apa: string; mla: string; chicago: string }>(prompt, 4000);
    console.log("--- CITATION RESPONSE ---\n", JSON.stringify(result), "\n-------------------------");
    return NextResponse.json({
      apa: result.apa || "Citation unavailable.",
      mla: result.mla || "Citation unavailable.",
      chicago: result.chicago || "Citation unavailable.",
    });
  } catch (error: any) {
    console.error("Citation API Error:", error);
    return NextResponse.json({ error: "Citation engine error: " + error.message }, { status: 500 });
  }
}
