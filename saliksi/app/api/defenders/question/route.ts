import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
    try {
        const { text, panelistRole, history } = await req.json();

        if (!text || !panelistRole) {
            return NextResponse.json({ error: "Missing document text or panelist role" }, { status: 400 });
        }

        const prompt = `You are playing the role of "${panelistRole}" in a thesis defense simulation. 
You are highly critical but fair. The student has submitted their paper. 
Here is an excerpt of their paper:
---
${text.substring(0, 6000)}
---

${history ? `Based on the conversation history so far:\n${history}\n\nDo not repeat questions that have already been asked by other panelists.` : 'This is the very first question of the defense.'}

Based on the text and context, generate ONE single challenging question for the student to defend. 
Make the question highly specific to the content provided (e.g. questioning their methodology, asking for clarification on a bold claim, or probing the theoretical framework).
Do not break character. Do not include greetings. Just ask the question directly. Limit to 3-4 sentences maximum.`;

        const question = await askGroq(prompt, 200);
        return NextResponse.json({ question });
    } catch (error) {
        console.error("Defender question error:", error);
        return NextResponse.json({ error: "Failed to generate question" }, { status: 500 });
    }
}
