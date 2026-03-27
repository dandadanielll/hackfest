import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

interface Article {
  title: string;
  authors: string;
  year: string;
  abstract?: string;
}

export async function POST(req: NextRequest) {
  const { articles } = await req.json();

  if (!articles || articles.length === 0) {
    return NextResponse.json({ error: "No articles provided" }, { status: 400 });
  }

  const articleList = articles
    .map((a: Article, i: number) =>
      `--- ARTICLE ${i + 1} ---
Title: ${a.title}
Authors: ${a.authors}
Year: ${a.year}
Full text / Abstract:
${a.abstract || "No text available."}`
    )
    .join("\n\n");

  const prompt = `You are an academic literature gap analyzer. Your ONLY job is to identify gaps in the SPECIFIC articles provided below. You must base ALL findings strictly on the content of these articles. Do NOT invent gaps about unrelated topics like climate change, mental health, or indigenous populations unless those topics are explicitly mentioned in the provided texts.

ARTICLES TO ANALYZE:
${articleList}

INSTRUCTIONS:
1. Read the article content carefully
2. Identify 4-6 specific gaps that are DIRECTLY related to what these papers discuss and what they explicitly leave unanswered
3. The gaps must be grounded in the actual subject matter of the papers (e.g. if papers are about WSSV in shrimp, gaps should be about WSSV research, shrimp aquaculture, PCR methodology limitations, etc.)
4. Do NOT hallucinate topics that are not in the papers
5. The topSuggestion must be a specific research direction that directly extends the findings of these papers

Return ONLY valid JSON, no markdown, no backticks:
{
  "gaps": [
    {
      "title": "Short gap title directly related to paper content",
      "severity": "CRITICAL or SIGNIFICANT",
      "description": "2-3 sentences explaining this specific gap based on what the papers actually say"
    }
  ],
  "topSuggestion": "One specific research direction that directly extends these papers"
}`;

  try {
    const result = await askGroqJSON<{
      gaps: { title: string; severity: string; description: string }[];
      topSuggestion: string;
    }>(prompt, 1200);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Gaps route error:", error);
    return NextResponse.json({ error: "Failed to analyze gaps" }, { status: 500 });
  }
}