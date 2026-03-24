import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
    const { query } = await req.json();

    const prompt = query?.trim()
        ? `You are a research assistant for Filipino students. The user is typing a research query: "${query}"
    
Generate 5 relevant academic research query completions or related topics that a Filipino student might be researching. Focus on Philippine context where applicable.

Return ONLY a JSON array of 5 strings, no markdown, no extra text:
["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]`
        : `You are a research assistant for Filipino students. Generate 6 popular academic research topics that Filipino college students commonly research. Mix health, education, environment, social sciences, and technology topics in Philippine context.

Return ONLY a JSON array of 6 strings, no markdown, no extra text:
["topic 1", "topic 2", "topic 3", "topic 4", "topic 5", "topic 6"]`;

    try {
        const raw = await askGroq(prompt, 300);
        const cleaned = raw.replace(/```json|```/g, "").trim();
        const suggestions = JSON.parse(cleaned);
        return NextResponse.json({ suggestions });
    } catch (error) {
        console.error("Suggestions route error:", error);
        return NextResponse.json({ suggestions: [] }, { status: 500 });
    }
}