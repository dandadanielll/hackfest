import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { location, fields } = await req.json();

    if (!location || !fields?.length) {
      return NextResponse.json({ error: "Location and fields are required" }, { status: 400 });
    }

    const fieldsList = (fields as string[]).join(", ");

    const prompt = `You are an expert Philippine research context advisor.

A student has chosen to research in the following field(s): ${fieldsList}
Their chosen location in the Philippines is: ${location}

Your task is to generate:
1. Exactly 5 LOCAL PROBLEMS that are:
   - Specific and observable in ${location} or its immediate region
   - Directly relevant to the chosen field(s): ${fieldsList}
   - Real, documented issues (not generic)
   - Phrased as concrete problems a researcher would study (e.g. "high incidence of post-harvest cacao losses due to Black Pod Disease in Bicol smallholder farms")

2. Exactly 5 RAW MATERIALS / RESEARCH INPUTS that are:
   - Physically available in ${location} or produced there
   - Relevant to the chosen research field(s): ${fieldsList}
   - Specific enough to be a laboratory or field research input (e.g. "coconut husk coir fiber", "sugarcane bagasse", "volcanic ash pozzolana")
   - Things a researcher could actually collect, process, or analyze in a Philippine university lab
   - NOT generic terms like "local labor force", "tropical biodiversity", or "agricultural land"

Return ONLY valid JSON (no markdown, no backticks):
{
  "problems": [
    "problem 1",
    "problem 2",
    "problem 3",
    "problem 4",
    "problem 5"
  ],
  "resources": [
    "raw material 1",
    "raw material 2",
    "raw material 3",
    "raw material 4",
    "raw material 5"
  ]
}`;

    const result = await askGroqJSON<{
      problems: string[];
      resources: string[];
    }>(prompt, 1000);

    // Validate shape
    if (!Array.isArray(result.problems) || !Array.isArray(result.resources)) {
      throw new Error("Invalid shape from AI");
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate context error:", error);
    return NextResponse.json({ error: "Failed to generate context" }, { status: 500 });
  }
}
