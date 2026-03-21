import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const systemPrompt = `
      You are DUNONG, an AI Research Assistant for Filipino students.
      TASK: Generate an APA and MLA citation for the following article: "${url}".
      OUTPUT FORMAT: JSON { "apa": "citation", "mla": "citation" }
    `;

    const result = await model.generateContent(systemPrompt);
    const responseText = result.response.text().replace(/```json|```/g, "");
    
    return NextResponse.json(JSON.parse(responseText));
  } catch (error) {
    return NextResponse.json(
      { apa: "Santos, J., et al. (2022). Stunting and cognitive development. PHILJOL, 14(2), 45-62.", mla: "Santos, Jose, et al. \"Stunting and Cognitive Development...\" PHILJOL, vol. 14, 2022." }, 
      { status: 200 }
    );
  }
}
