import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { articles } = await req.json();

  if (!articles || articles.length === 0) {
    return NextResponse.json({ error: "No articles provided" }, { status: 400 });
  }

  const articleList = articles
    .map((a: { title: string; authors: string; year: string }) =>
      `- "${a.title}" by ${a.authors} (${a.year})`
    )
    .join("\n");

  const prompt = `You are a Philippine academic research gap analyzer.

Based on the following research articles, identify what is MISSING from the literature. Focus specifically on gaps relevant to the Philippine context — underrepresented regions, populations, time periods, or research angles.

Articles reviewed:
${articleList}

Return ONLY valid JSON with no markdown, no backticks:
{
  "gaps": [
    {
      "title": "short gap title",
      "severity": "CRITICAL or SIGNIFICANT",
      "description": "2-3 sentences explaining what is missing and why it matters for Philippine research"
    }
  ],
  "topSuggestion": "one specific recommended research direction for a Filipino student thesis"
}

Identify 4-6 gaps. Base everything on the actual articles provided — do not invent gaps unrelated to the content.`;

  try {
    const result = await askGroqJSON<{
      gaps: { title: string; severity: string; description: string }[];
      topSuggestion: string;
    }>(prompt, 800);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Gaps route error:", error);
    return NextResponse.json({ error: "Failed to analyze gaps" }, { status: 500 });
  }
}