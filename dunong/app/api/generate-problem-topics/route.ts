import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { title, tag, problem, opportunity } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Problem title is required" }, { status: 400 });
    }

    const prompt = `You are an expert Philippine academic research advisor.

An existing local priority problem or focus area has been identified:
Title: "${title}"
Field/Tag: ${tag || "Not specified"}
Problem statement: ${problem || "Not specified"}
AI Synthesis/Opportunity: ${opportunity || "Not specified"}

Generate exactly 5 NEW, specific, and actionable research topics that directly address this local problem. Each topic should:
- Deep-dive into a specific aspect of the stated problem or execute the suggested opportunity
- Propose a specific methodology, geographic scope within the affected area, or target population
- Be feasible within Philippine academic resources
- Provide a clear, actionable path forward to solve or mitigate the issue

Return ONLY valid JSON (no markdown, no backticks):
{
  "topics": [
    {
      "title": "Full research topic title addressing the problem",
      "field": "Primary field this belongs to",
      "problem": "2-3 sentences re-contextualizing the specific local problem this topic targets",
      "opportunity": "2-3 sentences describing the proposed solution, methodology, or intervention",
      "resourceLink": "Key local resource, stakeholder, or methodology utilized",
      "difficulty": "Undergraduate | Graduate | Doctoral",
      "novelty": "Specific explanation of why this approach is innovative or highly relevant locally",
      "nextSteps": ["Step 1", "Step 2", "Step 3"]
    }
  ]
}`;

    const result = await askGroqJSON<{
      topics: {
        title: string;
        field: string;
        problem: string;
        opportunity: string;
        resourceLink: string;
        difficulty: string;
        novelty: string;
        nextSteps: string[];
      }[];
    }>(prompt, 3000);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate problem topics error:", error);
    return NextResponse.json({ error: "Failed to generate problem topics" }, { status: 500 });
  }
}
