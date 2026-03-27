import { askGroqJSON } from "./groq";

/**
 * SHARED AI credibility scorer — used by search, library, and credibility tab.
 * All three paths call this so the score is always produced by the same AI with the same rubric.
 *
 * Returns a score 0–100 and short reasoning.
 * Falls back to null on failure (caller should handle gracefully).
 */

export const CREDIBILITY_QUALITATIVE_GUIDELINES = `
Evaluate the academic credibility of the source on a scale of 0 to 100 based on the provided metadata or text. Do not use a rigid mathematical formula; instead, think holistically as an expert academic librarian. 

Consider these three key dimensions in your evaluation:
1. Peer Review: Does the venue, DOI presence, or editorial process suggest rigorous peer review?
2. Accreditation & Indexing: Is it recognized by reputable databases (Scopus, PubMed, PHILJOL, CHED, etc.) or published by a highly regarded institution?
3. Publisher Reputation: Is the publisher known for high academic standards, or is it an unknown/predatory source?

Weigh these three dimensions organically based on the context. 
- A paper in a top-tier journal should score 90-100. 
- A solid peer-reviewed university paper should score 70-89. 
- Unknown or questionable sources should score below 50. 
Provide a thoughtful score that reflects its true academic trustworthiness.
`;

const CREDIBILITY_SYSTEM_PROMPT = `You are a strict academic credibility evaluator for a Filipino research platform.

${CREDIBILITY_QUALITATIVE_GUIDELINES}

IMPORTANT:
- Never award maximum scores unless you have clear evidence of top-tier quality.
- If dimensions cannot be verified from the provided text or metadata, score them very low.
- Rely on your intrinsic knowledge of publishers, journals, and academic standards.

Respond ONLY with a valid JSON object:
{
  "score": <integer 0-100>,
  "reasoning": "<one sentence explaining the overall score, mentioning the key dimensions briefly>"
}`;

export interface CredibilityResult {
  score: number;
  reasoning: string;
}

export async function scoreCredibility(paperMeta: {
  title?: string;
  journal?: string;
  doi?: string | null;
  year?: string;
  url?: string;
  citationCount?: number;
  referenceCount?: number;
  isOpenAccess?: boolean;
  isPhilippine?: boolean;
  publisher?: string;
}): Promise<CredibilityResult> {
  const lines: string[] = [];

  if (paperMeta.title) lines.push(`Title: ${paperMeta.title}`);
  if (paperMeta.journal) lines.push(`Journal/Venue: ${paperMeta.journal}`);
  if (paperMeta.doi) lines.push(`DOI: ${paperMeta.doi}`);
  if (paperMeta.url) lines.push(`URL: ${paperMeta.url}`);
  if (paperMeta.publisher) lines.push(`Publisher: ${paperMeta.publisher}`);
  if (paperMeta.year) lines.push(`Year: ${paperMeta.year}`);
  if (paperMeta.isOpenAccess !== undefined) lines.push(`Open Access: ${paperMeta.isOpenAccess}`);
  if (paperMeta.isPhilippine !== undefined) lines.push(`Philippine institution: ${paperMeta.isPhilippine}`);
  if (paperMeta.citationCount !== undefined) lines.push(`Citation count: ${paperMeta.citationCount}`);
  if (paperMeta.referenceCount !== undefined) lines.push(`Reference count: ${paperMeta.referenceCount}`);

  const prompt = `${CREDIBILITY_SYSTEM_PROMPT}

Paper metadata to evaluate:
${lines.join("\n")}`;

  const result = await askGroqJSON<CredibilityResult>(prompt, 200);
  return {
    score: Math.min(100, Math.max(0, Math.round(result.score))),
    reasoning: result.reasoning || "",
  };
}
