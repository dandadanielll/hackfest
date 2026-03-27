import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
    try {
        const { text, panelistRole, history } = await req.json();

        if (!text || !panelistRole) {
            return NextResponse.json({ error: "Missing document text or panelist role" }, { status: 400 });
        }

        const prompt = `You are playing the role of "${panelistRole}" in a thesis defense simulation. 
You are highly critical but fair. Probing the validity and rigor of the submitted paper. 

EXCERPT OF PAPER:
---
${text.substring(0, 6000)}
---

${history ? `CONVERSATION HISTORY:\n${history}\n\nINSTRUCTIONS: Adapt your turn based on the history. If previous answers were weak, probe deeper. Do not repeat topics already covered. Advance the defense into new or deeper dimensions of the paper.` : 'This is the very first question of the defense. Start with a rigorous opening probe into the core thesis or major assumption of the paper.'}

Based on the text, generate ONE unique, highly specific, and challenging question that forces the student to defend a technical detail or significant claim. 

Do not include greetings. Just ask the question directly in your role as ${panelistRole}. Limit to 3-4 sentences maximum.`;

        const question = await askGroq(prompt, 200);
        return NextResponse.json({ question });
    } catch (error) {
        console.error("Defender question error:", error);
        return NextResponse.json({ error: "Failed to generate question" }, { status: 500 });
    }
}
