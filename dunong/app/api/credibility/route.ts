import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
});

const SYSTEM_PROMPT = `You are an academic credibility evaluator for Dunong, a Filipino research platform. 
Your role is to analyze articles and assign credibility grades based on verifiable metadata.

You evaluate articles on THREE dimensions:
1. Peer Review Status — is it peer-reviewed based on journal name, publisher, or DOI structure?
2. Accreditation — is the journal CHED-accredited, PHILJOL-indexed, or Scopus-listed?
3. Publisher Credibility — is it from a recognized academic institution, government body, or established press?

GRADE SCALE:
- A: Peer-reviewed, accredited, credible publisher. Safe to cite.
- B: Peer-reviewed but not formally accredited. Cite with standard caution.
- C: Not peer-reviewed but from a credible institution. Cite with caution.
- D: Unknown peer review status, unclear publisher. Do not cite without verification.
- F: No verifiable peer review, no identifiable publisher. Do not cite.

CRITICAL RULES:
- Base evaluation ONLY on verifiable metadata: author, journal name, ISSN, publisher, DOI, URL domain.
- NEVER fabricate accreditation status. If you cannot verify, say so explicitly.
- If information is missing or unverifiable, reflect that in the grade (lower grade, note uncertainty).
- For Philippine journals: CHED-accredited journals include those in the CHED Journal Whitelist. PHILJOL (Philippine Journals Online) hosts Philippine academic journals. HERDIN (Health Research and Development Information Network) covers health sciences.
- Well-known Scopus-indexed publishers: Elsevier, Springer, Wiley, Taylor & Francis, Sage, IEEE, ACM, Nature, Science, MDPI (some journals), Frontiers (some journals).
- Government domains (.gov, .edu.ph, .gov.ph), established universities, and official bodies are credible publishers.
- Predatory journals, unknown blogs, social media, news sites without academic affiliation = Grade F.
- ResearchGate, Academia.edu, preprint servers (arXiv, bioRxiv) = Grade D unless the underlying journal is identified.

Respond ONLY with a valid JSON object. No markdown, no explanation outside the JSON.

JSON structure:
{
  "grade": "A" | "B" | "C" | "D" | "F",
  "verdict": "One sentence summary of the overall credibility",
  "metadata": {
    "title": "extracted or inferred title, or null",
    "authors": "extracted authors or null",
    "journal": "journal name or null",
    "issn": "ISSN if found or null",
    "publisher": "publisher name or null",
    "doi": "DOI if found or null",
    "year": "publication year or null"
  },
  "dimensions": [
    {
      "label": "Peer Review Status",
      "score": 0-100,
      "note": "explanation based on evidence found"
    },
    {
      "label": "Accreditation",
      "score": 0-100,
      "note": "explanation of CHED, PHILJOL, or Scopus status"
    },
    {
      "label": "Publisher Credibility",
      "score": 0-100,
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

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1, // Low temperature for consistency
      max_tokens: 1500,
    });

    const rawResponse = completion.choices[0]?.message?.content || "";

    // Parse JSON safely
    let result;
    try {
      // Strip any potential markdown fences
      const cleaned = rawResponse
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        {
          error: "Failed to parse AI response. Please try again.",
          raw: rawResponse,
        },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!result.grade || !["A", "B", "C", "D", "F"].includes(result.grade)) {
      return NextResponse.json(
        { error: "Invalid grade returned from analysis." },
        { status: 500 }
      );
    }

    // Return the result directly as the frontend expects
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Credibility API error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}