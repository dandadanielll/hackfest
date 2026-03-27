import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
    try {
        const { text, panelistRole, question, answer } = await req.json();

        if (!question || !answer) {
            return NextResponse.json({ error: "Missing question or answer" }, { status: 400 });
        }

        const prompt = `You are playing the role of "${panelistRole}" in a thesis defense simulation. 
You previously asked the student this question:
"Question: ${question}"

The student answered:
"Answer: ${answer}"

Context from their paper for reference:
---
${text ? text.substring(0, 4000) : "No context provided."}
---

Evaluate the student's answer. Is it strong, weak, evasive, or technically incorrect?
You must respond in exactly this JSON format:
{
  "heatIncrease": <number from 0 to 30. 0 for a perfect answer, 15 for average/vague, 30 for a terrible or evasive answer>,
  "reaction": "<Your in-character verbal response to their answer (2 to 4 sentences). Continue to act as the panelist.>"
}

Do not include any other text except the JSON object. Your response must be valid JSON to be parsed correctly.`;

        const responseStr = await askGroq(prompt, 300);
        
        let cleanStr = responseStr.trim();
        if (cleanStr.startsWith('```json')) cleanStr = cleanStr.substring(7);
        if (cleanStr.startsWith('```')) cleanStr = cleanStr.substring(3);
        if (cleanStr.endsWith('```')) cleanStr = cleanStr.substring(0, cleanStr.length - 3);
        
        const result = JSON.parse(cleanStr.trim());
        
        // Ensure valid number
        if (typeof result.heatIncrease !== 'number') {
            result.heatIncrease = parseInt(result.heatIncrease, 10) || 15;
        }
        
        return NextResponse.json({
            heatIncrease: Math.min(30, Math.max(0, result.heatIncrease)),
            reaction: result.reaction || "I see. Let's move on."
        });
    } catch (error) {
        console.error("Defender evaluate error:", error);
        return NextResponse.json({ heatIncrease: 10, reaction: "I couldn't quite follow that argument, but we'll accept it for now." });
    }
}
