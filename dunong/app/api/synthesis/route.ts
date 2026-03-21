import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { articles } = await req.json();

  if (!articles || articles.length < 2) {
    return NextResponse.json({ error: "At least 2 articles are required" }, { status: 400 });
  }

  const articleList = articles
    .map((a: { title: string; abstract: string; authors: string; year: string }, i: number) =>
      `Article ${i + 1}: "${a.title}" by ${a.authors} (${a.year})\n${a.abstract || "No abstract."}`
    )
    .join("\n\n");

  const prompt = `You are a research synthesis assistant for Filipino students.

Analyze the following research articles and produce a structured synthesis.

${articleList}

Return ONLY valid JSON with no markdown, no backticks:
{
  "commonFindings": "2-3 sentences on what the studies agree on",
  "contradictions": "2-3 sentences on where they disagree, citing specific authors and years",
  "gaps": "2-3 sentences on what remains unanswered, especially in Philippine context",
  "overallSynthesis": "2-3 sentences overall synthesis for a Filipino student researcher"
}`;

  try {
    const result = await askGroqJSON<{
      commonFindings: string;
      contradictions: string;
      gaps: string;
      overallSynthesis: string;
    }>(prompt, 800);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Synthesis route error:", error);
    return NextResponse.json({ error: "Failed to synthesize articles" }, { status: 500 });
  }
}