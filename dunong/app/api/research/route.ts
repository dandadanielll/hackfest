import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { topic, sources } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `
      You are DUNONG, an AI Research Assistant for Filipino students. 
      You are GROUNDED only in the following Philippine sources: ${JSON.stringify(sources)}.
      
      TASK:
      1. Provide a 3-paragraph synthesis of the research topic: "${topic}".
      2. Use inline citations like [1] or [2] matching the source IDs.
      3. Identify ONE specific contradiction between these papers.
      4. Identify TWO research gaps specific to the Philippine context.
      5. Strictly NO hallucinations. If the info isn't in the sources, say "Information not found in local archives."
      
      OUTPUT FORMAT: JSON { "synthesis": "", "contradiction": "", "gaps": [] }
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text().replace(/```json|```/g, "");
    return NextResponse.json(JSON.parse(responseText));
  } catch (error) {
    return NextResponse.json({ error: "Gemini connection failed" }, { status: 500 });
  }
}