import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { message, history, context, action } = await req.json();

  if (!message) {
    return NextResponse.json({ error: "No message provided" }, { status: 400 });
  }

  const { vaultSources = [], folderName = "Unnamed Folder", citationFormat = "APA", documentContent = "" } = context || {};

  const sourcesList =
    vaultSources.length === 0
      ? ""
      : vaultSources
        .map((s: { 
          title?: string; authors?: any | any[]; year?: string | number; 
          journal?: string; publisher?: string; abstract?: string; doi?: string; 
          url?: string; content?: string 
        }, i: number) => {
          const authors = Array.isArray(s.authors) 
            ? s.authors.map((a: any) => {
                if (typeof a === 'string') return a;
                return `${a.firstName} ${a.lastName}`;
              }).join("; ") 
            : s.authors ?? "Unknown";
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

  const docContext = documentContent 
    ? `\nCURRENT DOCUMENT STATE (For Context):\n"""\n${documentContent}\n"""\n`
    : "";

  const citationRulesMap: Record<string, string> = {
    APA: "Format: (Author, Year). Example: (Smith, 2023).",
    MLA: "Format: (Author Page). Example: (Smith 42).",
    Chicago: "Format: (Author, Year, Page). Example: (Smith, 2023, 42).",
  };
  const citationRules = citationRulesMap[citationFormat] || "Format: (Author, Year).";

  const systemPrompt = vaultSources.length === 0
    ? `You are DUNONG, a world-class AI research assistant. You are currently in GENERAL RESEARCH MODE.
    
Even without specific Vault context, your responses must remain academic and objective. You should reference established theories, major studies, and credible academic concepts.
${docContext}
OUTPUT RULES:
- When asked to EDIT, ADD to, or REPHRASE the document, do NOT rewrite the whole project.
- CITATION STYLE: Strictly use ${citationFormat} for all inline references. ${citationRules}
- INLINE CITATIONS: Use ONLY the last names of authors (e.g., (Smith, 2023)). If there are multiple authors, use "et al." for 3 or more (in APA/MLA).
- Output your edit in this exact format:
  <DOCUMENT_EDIT>
  <INSERT_AFTER>the exact existing sentence from the document to insert after (use "START" if empty)</INSERT_AFTER>
  <REPLACE_TEXT>the exact existing sentence/paragraph to replace (omit if purely adding new content)</REPLACE_TEXT>
  <NEW_TEXT>the new text or paragraph you generated containing the correct inline citations</NEW_TEXT>
  </DOCUMENT_EDIT>
- Be direct, helpful, and highly academic.`
    : `You are the Vault Co-pilot for DUNONG, an AI research workspace for Filipino students.

STRICT VAULT LOCK: You are ONLY permitted to reference the sources listed below confirmed in the "${folderName}" vault. 

CITATION FORMAT: ${citationFormat}
INLINE CITATION RULE: ${citationRules}
- Use ONLY the last names of authors (e.g., "Smith"). 
- For multiple authors, follow ${citationFormat} standards (e.g., "Smith & Jones" for APA, "Smith and Jones" for MLA).
- Use "et al." where appropriate for 3+ authors.

VAULT CONTENTS (${vaultSources.length} source${vaultSources.length !== 1 ? "s" : ""}):
${sourcesList}
${docContext}
ACTION MODE: ${action || "chat"}

OUTPUT RULES:
- Every factual claim MUST include an inline citation in strictly ${citationFormat} format.
- Only cite sources from the vault — never fabricate citations.
- When asked to EDIT, ADD to, or REPHRASE the document, do NOT rewrite the whole document.
- Instead, output your edit in this exact format:
  <DOCUMENT_EDIT>
  <INSERT_AFTER>the exact existing sentence from the document to insert after (use "START" if document is empty)</INSERT_AFTER>
  <REPLACE_TEXT>the exact existing sentence/paragraph to replace (omit if purely adding new content)</REPLACE_TEXT>
  <NEW_TEXT>the new text or paragraph you generated with correct inline citations</NEW_TEXT>
  </DOCUMENT_EDIT>
- When inserting a citation only, wrap it in <INLINE_CITATION> and </INLINE_CITATION> tags.
- Be direct and concise.`;

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