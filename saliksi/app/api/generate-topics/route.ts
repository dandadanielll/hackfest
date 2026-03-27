import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { fields, location, problems, resources } = await req.json();

    if (!fields?.length || !location) {
      return NextResponse.json({ error: "Fields and location are required" }, { status: 400 });
    }

    const fieldsList = fields.join(", ");
    const problemsList = problems?.length ? problems.join("; ") : "general development challenges";
    const resourcesList = resources?.length ? resources.join(", ") : "locally available materials";

    const prompt = `You are an expert Philippine academic research advisor. Generate 5 original, researchable thesis/dissertation topics for a student in ${location}.

Student's fields of interest: ${fieldsList}
Known local/regional problems in ${location}: ${problemsList}
Available raw materials and natural inputs in ${location}: ${resourcesList}

Generate exactly 5 research topics. Each should:
- Be specific and locally contextualized to ${location}
- Directly incorporate one or more of the listed raw materials as a core research input, specimen, or subject (e.g., a study that physically uses coconut husk, abaca fiber, volcanic ash, etc.)
- Address a real local problem using those raw materials or natural resources
- Be feasible within Philippine academic laboratory or field research settings
- Have a clear research gap and novelty

Return ONLY valid JSON (no markdown, no backticks):
{
  "topics": [
    {
      "title": "Full research topic title",
      "field": "Primary field this belongs to",
      "problem": "2-3 sentence description of the specific local problem it addresses",
      "opportunity": "2-3 sentence description of the research opportunity, how the raw material is used, and what methodology can be applied",
      "resourceLink": "Specific raw material from ${location} this study uses as its primary input",
      "difficulty": "Undergraduate | Graduate | Doctoral",
      "novelty": "Explanation of what makes this topic new and unexplored in the Philippine context",
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
    console.error("Generate topics error:", error);
    return NextResponse.json({ error: "Failed to generate topics" }, { status: 500 });
  }
}
