import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
    const { title, abstract } = await req.json();

    if (!title && !abstract) {
        return NextResponse.json({ error: "No content provided" }, { status: 400 });
    }

    const prompt = `You are a research assistant helping Filipino students understand academic papers.

Write a plain language summary in 2-3 sentences that a college student with no background in the topic can understand. Use simple, clear English. No jargon. Focus on what the study found and why it matters.

Title: ${title}
Abstract: ${abstract || "No abstract available."}

Return only the plain language summary, nothing else.`;

    try {
        const description = await askGroq(prompt, 200);
        return NextResponse.json({ description });
    } catch (error) {
        console.error("Layman route error:", error);
        return NextResponse.json({ error: "Failed to generate description" }, { status: 500 });
    }
}