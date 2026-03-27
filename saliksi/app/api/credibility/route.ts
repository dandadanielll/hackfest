import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";
import { CREDIBILITY_QUALITATIVE_GUIDELINES, scoreCredibility } from "@/lib/credibility";

const SYSTEM_PROMPT = `You are an academic credibility evaluator for Dunong, a Filipino research platform. 
Your role is to analyze articles and assign credibility grades based on verifiable metadata.

${CREDIBILITY_QUALITATIVE_GUIDELINES}

GRADE SCALE CONTEXT:
- A: 80–100. Peer-reviewed, accredited, credible publisher. Safe to cite.
- B: 60–79. Peer-reviewed but not formally accredited.
- C: 40–59. Not peer-reviewed but from a credible institution.
- D: 20–39. Unknown peer review status, unclear publisher.
- F: 0–19. No verifiable peer review, no identifiable publisher.

CRITICAL RULES:
- Base evaluation ONLY on verifiable metadata: author, journal name, ISSN, publisher, DOI, URL domain.
- NEVER fabricate accreditation status. If you cannot verify, say so explicitly.
- For Philippine journals: CHED-accredited journals, PHILJOL (Philippine Journals Online), HERDIN (Health Research and Development Information Network).
- Government domains (.gov, .edu.ph, .gov.ph), established universities are credible publishers.
- Predatory journals, unknown blogs, social media, news sites = Grade F.
- ResearchGate, Academia.edu, preprint servers (arXiv, bioRxiv) = Grade D unless the underlying journal is identified.

Respond ONLY with a valid JSON object. No markdown, no explanation outside the JSON.

JSON structure:
{
  "verdict": "One sentence summary of the overall credibility",
  "metadata": {
    "title": "extracted or inferred title, or null",
    "authors": "extracted authors or null",
    "journal": "journal name or null",
    "issn": "ISSN if found or null",
    "publisher": "publisher name or null",
    "doi": "DOI if found or null",
    "year": "publication year or null",
    "citationCount": <number or null>
  },
  "dimensions": [
    {
      "label": "Peer Review",
      "score": <0-100>,
      "note": "explanation based on evidence found"
    },
    {
      "label": "Accreditation",
      "score": <0-100>,
      "note": "explanation of CHED, PHILJOL, or Scopus status"
    },
    {
      "label": "Publisher Credibility",
      "score": <0-100>,
      "note": "explanation based on publisher/institution identified"
    }
  ],
  "recommendation": "Detailed citation recommendation"
}`;

function extractTextFromContent(content: string): string {
  // Clean up extracted text
  return content.slice(0, 8000); // Limit to avoid token overflow
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let analysisInput = "";
    let inputType: "url" | "doi" | "file" | "text" = "url";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const urlOrDoi = formData.get("urlOrDoi") as string | null;
      const file = formData.get("file") as File | null;
      const fileText = formData.get("fileText") as string | null;

      if (file && fileText) {
        inputType = "file";
        analysisInput = `FILE UPLOAD ANALYSIS
Filename: ${file.name}
File type: ${file.type}
Extracted text content:
${extractTextFromContent(fileText)}`;
      } else if (urlOrDoi) {
        inputType = urlOrDoi.startsWith("10.") || urlOrDoi.includes("doi.org")
          ? "doi"
          : "url";
        analysisInput = `${inputType.toUpperCase()} INPUT: ${urlOrDoi}`;
      } else {
        return NextResponse.json(
          { error: "No valid input provided." },
          { status: 400 }
        );
      }
    } else {
      const body = await req.json();
      const { url, doi, text } = body;

      if (text) {
        inputType = "text";
        analysisInput = `TEXT CONTENT ANALYSIS: ${extractTextFromContent(text)}`;
      } else if (doi) {
        inputType = "doi";
        analysisInput = `DOI INPUT: ${doi}`;
      } else if (url) {
        inputType = "url";
        analysisInput = `URL INPUT: ${url}`;
      } else if (body.urlOrDoi) {
        inputType = body.urlOrDoi.startsWith("10.") || body.urlOrDoi.includes("doi.org")
          ? "doi"
          : "url";
        analysisInput = `${inputType.toUpperCase()} INPUT: ${body.urlOrDoi}`;
      } else {
        return NextResponse.json(
          { error: "Please provide a URL, DOI, or content to analyze." },
          { status: 400 }
        );
      }
    }

    const userMessage = `Analyze the credibility of this academic article and return a JSON evaluation.

${analysisInput}

Evaluate based strictly on verifiable signals from the input. If this is a URL, analyze the domain, URL structure, and any identifiable journal/publisher information. If it is a DOI, analyze the DOI prefix (publisher registry), suffix patterns, and known publisher associations. If it is a file/text, extract all metadata signals from the content.

Cross-reference against:
- CHED accreditation lists (Philippine Commission on Higher Education)
- PHILJOL (Philippine Journals Online)
- Scopus indexed journals and publishers
- Known predatory journal indicators

Return ONLY the JSON object.`;

    console.log("[Credibility API] Received analysisInput:", analysisInput.slice(0, 500) + (analysisInput.length > 500 ? "..." : ""));

    // Parse JSON safely using our helper
    let result;
    try {
      const fullPrompt = `${SYSTEM_PROMPT}\n\n${userMessage}`;
      result = await askGroqJSON<any>(fullPrompt, 1500);
    } catch (err: unknown) {
      return NextResponse.json(
        {
          error: "Failed to parse AI response. Please try again.",
          raw: err instanceof Error ? err.message : "Unknown syntax error",
        },
        { status: 500 }
      );
    }

    // 2. Fetch the OFFICIAL EXACT score using the identical shared AI scorer
    const officialScorer = await scoreCredibility(result.metadata || {});
    result.score = officialScorer.score;
    
    // 3. Assign the Grade using math so it's impossible to mismatch
    if (result.score >= 80) result.grade = "A";
    else if (result.score >= 60) result.grade = "B";
    else if (result.score >= 40) result.grade = "C";
    else if (result.score >= 20) result.grade = "D";
    else result.grade = "F";

    // Return the result directly as the frontend expects
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Credibility API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}