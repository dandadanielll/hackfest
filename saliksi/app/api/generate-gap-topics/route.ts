import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { title, problem, opportunity, author } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Study title is required" }, { status: 400 });
    }

    const prompt = `You are an expert Philippine academic research advisor specializing in identifying research gaps and improvement opportunities.

An existing study or frontier research exists:
Title: "${title}"
Author/Institution: ${author || "Unknown"}
Problem it addresses: ${problem || "Not specified"}
Current approach/opportunity: ${opportunity || "Not specified"}

Generate exactly 5 NEW research topics that specifically highlight GAPS, LIMITATIONS, or IMPROVEMENTS of this existing study. Each topic should:
- Directly reference what this existing study lacks, did not address, or can be improved upon
- Propose a specific new angle, methodology, geographic scope, population, or time horizon not covered
- Be feasible within Philippine academic resources
- Clearly articulate WHY the existing study is insufficient and what the new direction adds

Return ONLY valid JSON (no markdown, no backticks):
{
  "topics": [
    {
      "title": "Full research topic title that addresses a gap in the existing study",
      "field": "Primary field this belongs to",
      "problem": "2-3 sentences on what gap in the existing study this addresses and why it matters",
      "opportunity": "2-3 sentences on the proposed new research direction and methodology to fill this gap",
      "resourceLink": "Key resource, dataset, or material that makes this gap topic feasible",
      "difficulty": "Undergraduate | Graduate | Doctoral",
      "novelty": "Specific explanation of how this differs from and improves upon the existing study",
      "nextSteps": ["Step 1", "Step 2", "Step 3"],
      "gapType": "Methodological | Geographic | Population | Temporal | Scalability | Policy"
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
        gapType: string;
      }[];
    }>(prompt, 3000);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate gap topics error:", error);
    return NextResponse.json({ error: "Failed to generate gap topics" }, { status: 500 });
  }
}
