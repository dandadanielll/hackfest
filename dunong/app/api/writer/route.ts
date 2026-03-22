import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { message, history, context, action } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "No message provided" }, { status: 400 });
  }

  const { vaultSources = [], folderName = "Unnamed Folder", citationFormat = "APA" } = context || {};

  const sourcesList =
    vaultSources.length === 0
      ? ""
      : vaultSources
        .map((s: { 
          title?: string; authors?: string | string[]; year?: string | number; 
          journal?: string; publisher?: string; abstract?: string; doi?: string; 
          url?: string; content?: string 
        }, i: number) => {
          const authors = Array.isArray(s.authors) ? s.authors.join("; ") : s.authors ?? "Unknown";
          return [
            `[SOURCE ${i + 1}]`,
            `Title: ${s.title ?? "Untitled"}`,
            `Authors: ${authors}`,
            `Year: ${s.year ?? "n.d."}`,
            `Journal/Publisher: ${s.journal ?? s.publisher ?? "Unknown"}`,
            s.abstract ? `Abstract: ${s.abstract}` : "",
            s.content ? `Content: ${s.content.slice(0, 3000)}...` : "", // Truncate very long content
            `URL/DOI: ${s.doi ? `https://doi.org/${s.doi}` : s.url ?? "N/A"}`,
          ].filter(Boolean).join("\n");
        })
        .join("\n\n");

  const systemPrompt = vaultSources.length === 0
    ? `You are DUNONG, an AI research assistant. You are currently in GENERAL ASSISTANT MODE because the user has disabled the Vault Context or the vault is empty.

You may use your general knowledge to answer questions, brainstorm, write, or summarize.

OUTPUT RULES:
- When asked to EDIT the document, wrap edited text in <DOCUMENT_EDIT> and </DOCUMENT_EDIT> tags
- Be direct, helpful, and concise.`
    : `You are the Vault Co-pilot for DUNONG, an AI research workspace for Filipino students.

STRICT VAULT LOCK: You are ONLY permitted to reference the sources listed below from the "${folderName}" vault. You CANNOT use any outside knowledge. If you cannot support a claim from these sources, say: "I cannot find support for this in the current vault sources."

CITATION FORMAT: ${citationFormat}

VAULT CONTENTS (${vaultSources.length} source${vaultSources.length !== 1 ? "s" : ""}):
${sourcesList}

ACTION MODE: ${action || "chat"}

OUTPUT RULES:
- Every factual claim MUST include an inline citation [Author, Year]
- Only cite sources from the vault — never fabricate citations
- When asked to EDIT the document, wrap edited text in <DOCUMENT_EDIT> and </DOCUMENT_EDIT> tags
- When inserting a citation only, wrap it in <INLINE_CITATION> and </INLINE_CITATION> tags
- Be direct and concise`;

  const conversationHistory = (history || [])
    .slice(-6)
    .map((m: { role: string; content: string }) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");

  const fullPrompt = conversationHistory
    ? `${systemPrompt}\n\nConversation so far:\n${conversationHistory}\n\nUser: ${message}`
    : `${systemPrompt}\n\nUser: ${message}`;

  try {
    const response = await askGroq(fullPrompt, 1024);
    return NextResponse.json({ response });
  } catch (error) {
    console.error("Writer route error:", error);
    return NextResponse.json({ error: "Failed to communicate with AI" }, { status: 500 });
  }
}