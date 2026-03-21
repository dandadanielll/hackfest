import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { text, url, doi } = await req.json();

  const input = text || url || doi;
  if (!input) {
    return NextResponse.json({ error: "No article information provided" }, { status: 400 });
  }

  const prompt = `You are an academic citation generator.

Given the following article information, generate accurate citations in APA 7th edition, MLA 9th edition, and Chicago 17th edition formats.

Article information:
${input}
${doi ? `DOI: ${doi}` : ""}
${url ? `URL: ${url}` : ""}

Rules:
- Extract metadata from the provided text (title, authors, year, journal, volume, issue, pages, DOI)
- If a field is missing, omit it gracefully — do not invent data
- Return ONLY valid JSON with no markdown, no backticks, no extra text

Return exactly:
{
  "apa": "full APA 7th edition citation",
  "mla": "full MLA 9th edition citation",
  "chicago": "full Chicago 17th edition citation"
}`;

  try {
    const result = await askGroqJSON<{ apa: string; mla: string; chicago: string }>(prompt, 600);
    return NextResponse.json({
      apa: result.apa || "",
      mla: result.mla || "",
      chicago: result.chicago || "",
    });
  } catch (error) {
    console.error("Citation route error:", error);
    return NextResponse.json({ error: "Failed to generate citations" }, { status: 500 });
  }
}