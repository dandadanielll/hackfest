import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message, history, context, action } = await req.json();

    const systemPrompt = `You are "Vault Co-pilot", an AI writing assistant for the Dunong research platform.
You are strictly locked to the provided Vault references.
Do not use outside knowledge. If the answer is not in the references, say you don't know.

Context (Vault References):
${JSON.stringify(context, null, 2)}

Action Mode: ${action || 'chat'}
- chat: Respond to the user's message.
- edit: The user wants you to edit the document. Provide the FULL EDITED HTML or a snippet to be inserted.
- cite: The user wants a citation. Suggest a source from the Vault.

Always provide citations in [Author, Year] format when referencing sources.
Maintain a professional, academic tone.
`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ],
      model: "llama-3.3-70b-versatile",
    });

    return NextResponse.json({
      response: completion.choices[0]?.message?.content || "",
    });
  } catch (error) {
    console.error("Groq API Error:", error);
    return NextResponse.json({ error: "Failed to communicate with AI" }, { status: 500 });
  }
}
