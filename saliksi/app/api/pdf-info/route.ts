import { NextRequest, NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import { askGroqJSON } from "@/lib/groq";
import { CREDIBILITY_QUALITATIVE_GUIDELINES } from "@/lib/credibility";
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

CREDIBILITY SCORING INSTRUCTIONS:
${CREDIBILITY_QUALITATIVE_GUIDELINES}

Return ONLY a valid JSON object with these exact fields:
{
  "title": "Exact Title of the Paper",
  "authors": ["Author 1", "Author 2"],
  "abstract": "The paper's goals, methods, and key findings in 2-4 sentences",
  "credibilityScore": 75,
  "keywords": ["keyword1", "keyword2"],
  "journal": "Name of the Journal or Conference or Publisher",
  "year": "YYYY",
  "credibilityReasoning": "One sentence explaining the overall score based on your holistic assessment."
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
