import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
    const { text } = await req.json();

    if (!text || text.trim().length === 0) {
        return NextResponse.json({ completion: "" });
    }

    // This prompt forces the AI to act like a smart writing assistant, not a mobile keyboard.
    const prompt = `You are an advanced academic writing co-pilot for a Filipino student. 
    Your job is to seamlessly complete the user's text based on their current context.
    
    RULES:
    1. If the user is in the middle of a sentence: Finish the sentence logically, add a period, and STOP.
    2. If the user's text already ends with a period: Generate exactly ONE short, logical next sentence, and STOP.
    3. Keep it concise (maximum 10 to 20 words).
    4. Maintain a formal, academic tone suitable for a research paper.
    5. DO NOT wrap the output in quotes. DO NOT include conversational filler (like "Here is the continuation"). 
    6. OUTPUT ONLY THE DIRECT CONTINUATION TEXT.

    Current text context: "${text.slice(-800)}"`;

    try {
        const raw = await askGroq(prompt, 50);
        // Clean up rogue quotes or newlines
        const completion = raw.replace(/^["'\n]+|["'\n]+$/g, "").trim();
        return NextResponse.json({ completion });
    } catch (error) {
        console.error("Autocomplete route error:", error);
        return NextResponse.json({ completion: "" }, { status: 500 });
    }
}