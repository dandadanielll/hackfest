import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
    }

    const systemPrompt = `You are a smart ghost-text autocomplete engine for DUNONG, an academic writing app. 
The user is currently typing a research paper. You will be provided with the text immediately preceding their cursor. 
Your goal is to predictably and logically COMPLETE the current sentence or generate exactly the NEXT sentence.

CRITICAL RULES:
- Only output the exact text that should follow the user's cursor.
- Do NOT output formatting, quotes, explanations, or acknowledging text.
- Formally end the completion with proper punctuation (like a period).
- Limit your response to 1 logical sentence maximum.
- Be highly context-aware and academic in tone.
- Do NOT repeat the text the user has already typed. Start exactly where they left off.`;

    const fullPrompt = `${systemPrompt}\n\nTEXT BEFORE CURSOR:\n${prompt}\n\n[YOUR COMPLETION HERE]:`;

    // Limit tokens to roughly one sentence
    const response = await askGroq(fullPrompt, 100);

    return NextResponse.json({ suggestion: response.trim() });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json({ error: "Failed to fetch autocomplete" }, { status: 500 });
  }
}
