import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { askGroqJSON } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Read file as buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF using the named PDFParse class (pdf-parse v2)
    let fullText = "";
    try {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      fullText = result.text ?? "";
    } catch (parseError) {
      console.error("PDF parsing error:", parseError);
      return NextResponse.json({ error: "Failed to parse PDF content" }, { status: 500 });
    }

    // Use first 5000 chars for analysis — enough to find title, authors, abstract, publisher
    const sampleText = fullText.slice(0, 5000);

    const prompt = `
You are an academic metadata extraction expert. Analyze the following text extracted from a PDF and extract structured metadata.

CREDIBILITY SCORING RULES (total out of 100, be strict and accurate):
1. Peer Review (+40 pts): Evidence of peer-reviewed publication (e.g., "submitted", "accepted", "reviewed", journal mention). If no evidence, award 0.
2. Institutional Accreditation (+20 pts): Evidence of reputable institution or accredited body (university, research center, government agency). If unknown, award 0-10.
3. Publisher Reputation (+20 pts): Reputable publisher (e.g., Elsevier, Springer, IEEE, Nature, Wiley, SAGE, HERDIN, PHILJOL, university press). If self-published or unknown, award 0.
4. References Quality (+20 pts): Robust reference list present (more than 10 references = full 20 pts, 5-10 = 10 pts, <5 or none = 0 pts).

IMPORTANT: Base the score ONLY on evidence found in the text. Do NOT make up scores. If something cannot be confirmed from the text, do not award points for it.

Return ONLY a valid JSON object with these exact fields:
{
  "title": "Exact Title of the Paper",
  "authors": ["Author 1", "Author 2"],
  "abstract": "The paper's goals, methods, and key findings in 2-4 sentences",
  "credibilityScore": 75,
  "keywords": ["keyword1", "keyword2"],
  "journal": "Name of the Journal or Conference or Publisher",
  "year": "YYYY",
  "credibilityReasoning": "Explain the score: what evidence was found or not found for each criterion"
}

TEXT TO ANALYZE:
${sampleText}
    `;

    const metadata = await askGroqJSON<{
      title: string;
      authors: string[];
      abstract: string;
      credibilityScore: number;
      keywords: string[];
      journal: string;
      year: string;
      credibilityReasoning: string;
    }>(prompt);

    return NextResponse.json({ metadata });
  } catch (error: any) {
    console.error("PDF info extraction error:", error);
    return NextResponse.json({ 
      error: "Failed to extract PDF info", 
      details: error.message 
    }, { status: 500 });
  }
}
