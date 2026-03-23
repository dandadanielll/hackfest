import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

interface Article {
  title: string;
  abstract: string;
  authors: string;
  year: string;
}

export async function POST(req: NextRequest) {
  const { articles, thesisStatement, mode } = await req.json();

  if (!articles || articles.length < 2) {
    return NextResponse.json({ error: "At least 2 articles are required" }, { status: 400 });
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

  const isContradictionMode = mode === "contradiction" && thesisStatement;

  const prompt = isContradictionMode
    ? `You are a critical thinking assistant for Filipino student researchers.

A student has written this thesis statement or document:
"${thesisStatement}"

Review this against the following research articles. You must ONLY reference information that is actually present in these articles. Do not invent or fabricate findings.

ARTICLES:
${articleList}

Identify:
1. What these sources agree with or support in the thesis
2. What these sources directly contradict or challenge in the thesis (cite specific authors and years)
3. What evidence is missing from these sources to fully evaluate the thesis
4. What position the student should take based on the actual evidence

Return ONLY valid JSON, no markdown, no backticks:
{
  "commonFindings": "2-3 sentences on what the sources support or agree with, based strictly on their content",
  "contradictions": "2-3 sentences on specific contradictions found, naming exact authors and years from the articles",
  "gaps": "1-2 sentences on what evidence is missing to fully evaluate the thesis",
  "overallSynthesis": "2-3 sentences on what position the student should take based on the actual evidence in these papers"
}`
    : `You are a research synthesis assistant. Your ONLY job is to synthesize the SPECIFIC articles provided. Do not fabricate findings or reference topics not present in these papers.

ARTICLES TO SYNTHESIZE:
${articleList}

Produce a structured cross-paper synthesis based STRICTLY on the content above. Every claim must be traceable to one of the provided articles.

Return ONLY valid JSON, no markdown, no backticks:
{
  "commonFindings": "2-3 sentences on what all studies agree on, citing specific authors and years from the articles above",
  "contradictions": "2-3 sentences on where these specific studies disagree, naming exact authors and years (e.g. de la Peña 2007 vs de la Peña 2003)",
  "gaps": "2-3 sentences on what these specific papers leave unanswered based on their actual content",
  "overallSynthesis": "2-3 sentences synthesizing the body of evidence from these specific papers"
}`;

  try {
    const result = await askGroqJSON<{
      commonFindings: string;
      contradictions: string;
      gaps: string;
      overallSynthesis: string;
    }>(prompt, 1000);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Synthesis route error:", error);
    const message = error instanceof Error ? error.message : "Failed to synthesize articles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}