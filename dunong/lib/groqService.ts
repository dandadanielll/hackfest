// lib/groqService.ts
import type { VaultSource, CitationFormat } from './writer.types';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama3-70b-8192';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface CopilotResponse {
  content: string;
  documentEdit: string | null;
  inlineCitation: string | null;
}

// ─── System Prompt Builder ────────────────────────────────────────────────────

function buildSystemPrompt(
  vaultSources: VaultSource[],
  folderName: string,
  format: CitationFormat
): string {
  const sourcesList =
    vaultSources.length === 0
      ? 'NO SOURCES IN VAULT. Tell the user to save articles to this folder first before you can help.'
      : vaultSources
          .map((s, i) => {
            const authors = Array.isArray(s.authors)
              ? s.authors.join('; ')
              : s.authors ?? 'Unknown';
            return [
              `[SOURCE ${i + 1}]`,
              `ID: ${s.id}`,
              `Title: ${s.title ?? 'Untitled'}`,
              `Authors: ${authors}`,
              `Year: ${s.year ?? 'n.d.'}`,
              `Journal/Publisher: ${s.journal ?? s.publisher ?? 'Unknown'}`,
              `Abstract: ${s.abstract ?? 'Not available.'}`,
              `DOI/URL: ${s.doi ? `https://doi.org/${s.doi}` : s.url ?? 'N/A'}`,
            ].join('\n');
          })
          .join('\n\n');

  return `You are the Vault Co-pilot for DUNONG, an AI research workspace for Filipino students.

STRICT VAULT LOCK: You are ONLY permitted to reference the sources listed below from the "${folderName}" vault. You CANNOT use any outside knowledge, internet data, or information not present in these vault sources. If you cannot support a claim from these sources, you MUST say: "I cannot find support for this in the current vault sources."

CITATION FORMAT IN USE: ${format}

VAULT CONTENTS (${vaultSources.length} source${vaultSources.length !== 1 ? 's' : ''}):
${sourcesList}

YOUR TASK CAPABILITIES:
1. Find a supporting source — identify which vault source best supports a given claim
2. Add an inline citation — generate a formatted citation for a point in the text
3. Rephrase a paragraph — rewrite selected text, preserving meaning, with citation pins
4. Expand a section — elaborate on a topic strictly using vault evidence
5. Check a claim — determine if a claim is supported or contradicted by vault sources
6. Summarize a section — condense text with source attribution

OUTPUT RULES:
- Every factual claim in your response MUST include an inline citation [Author, Year]
- Only cite sources from the vault list above — never fabricate citations
- When asked to EDIT the document, wrap the edited text in <DOCUMENT_EDIT> and </DOCUMENT_EDIT> tags
- When inserting a citation only, wrap it in <INLINE_CITATION> and </INLINE_CITATION> tags
- Be direct and concise — Filipino students value clarity
- If no vault sources exist, do not attempt to answer research questions`;
}

// ─── Tag Parser ───────────────────────────────────────────────────────────────

function extractTag(text: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
  return text.match(re)?.[1]?.trim() ?? null;
}

// ─── API Call ─────────────────────────────────────────────────────────────────

async function callGroq(
  messages: GroqMessage[],
  apiKey: string,
  maxTokens = 1024,
  temperature = 0.3
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Groq API error ${res.status}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return data.choices?.[0]?.message?.content ?? '';
}

// ─── Public Functions ─────────────────────────────────────────────────────────

export async function sendCopilotMessage({
  userMessage,
  vaultSources = [],
  folderName = 'Unnamed Folder',
  citationFormat = 'APA',
  conversationHistory = [],
  apiKey,
  selectedText = '',
}: {
  userMessage: string;
  vaultSources?: VaultSource[];
  folderName?: string;
  citationFormat?: CitationFormat;
  conversationHistory?: GroqMessage[];
  apiKey: string;
  selectedText?: string;
}): Promise<CopilotResponse> {
  const system = buildSystemPrompt(vaultSources, folderName, citationFormat);
  const contextualMsg = selectedText
    ? `[Selected text in document]:\n"${selectedText}"\n\n${userMessage}`
    : userMessage;

  const messages: GroqMessage[] = [
    ...conversationHistory.slice(-6),
    { role: 'user', content: contextualMsg },
  ];

  const raw = await callGroq(
    [{ role: 'system', content: system }, ...messages],
    apiKey
  );

  const documentEdit = extractTag(raw, 'DOCUMENT_EDIT');
  const inlineCitation = extractTag(raw, 'INLINE_CITATION');
  const content = raw
    .replace(/<DOCUMENT_EDIT>[\s\S]*?<\/DOCUMENT_EDIT>/g, '')
    .replace(/<INLINE_CITATION>[\s\S]*?<\/INLINE_CITATION>/g, '')
    .trim();

  return { content, documentEdit, inlineCitation };
}

export function generateInlineCitation(
  source: VaultSource,
  format: CitationFormat
): string {
  const firstAuthor =
    (Array.isArray(source.authors) ? source.authors[0] : source.authors)
      ?.split(',')[0]
      ?.trim() ?? 'Unknown';
  const year = source.year ?? 'n.d.';

  if (format === 'MLA') return `(${firstAuthor} ${year})`;
  return `(${firstAuthor}, ${year})`; // APA and Chicago
}

export async function generateBibliographyEntry(
  source: VaultSource,
  format: CitationFormat,
  apiKey: string
): Promise<string> {
  const authors = Array.isArray(source.authors)
    ? source.authors.join('; ')
    : source.authors ?? 'Unknown Author';

  const prompt = `Generate a single ${format} bibliography entry for this source. Return ONLY the formatted citation text with no preamble, explanation, or quotes.
Title: ${source.title ?? 'Untitled'}
Authors: ${authors}
Year: ${source.year ?? 'n.d.'}
Journal/Publisher: ${source.journal ?? source.publisher ?? ''}
DOI/URL: ${source.doi ? `https://doi.org/${source.doi}` : source.url ?? ''}`;

  const result = await callGroq(
    [{ role: 'user', content: prompt }],
    apiKey,
    256,
    0.1
  );
  return result.trim();
}
