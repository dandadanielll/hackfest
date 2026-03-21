import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

export async function POST(req: NextRequest) {
  const { text, url, doi } = await req.json();

  const input = text || url || doi;
  if (!input) {
    return NextResponse.json({ error: "No article information provided" }, { status: 400 });
  }

  const prompt = `You are an academic credibility evaluator specializing in Philippine academic sources.

Evaluate the credibility of the following article based on the information provided. Cross-reference against known Philippine academic standards (CHED accreditation, PHILJOL indexing, Scopus listing).

Article information:
${input}

Evaluate across three dimensions:
1. Peer review status — is it published in a peer-reviewed journal?
2. Accreditation — is the journal CHED-accredited, PHILJOL-indexed, or Scopus-listed?
3. Publisher credibility — is the publisher a recognized academic institution, government body, or established press?

Grade scale:
- A: Peer-reviewed, accredited, credible publisher. Safe to cite.
- B: Peer-reviewed but not formally accredited. Cite with standard caution.
- C: Not peer-reviewed but from a credible institution. Cite with caution.
- D: Unknown peer review status, unclear publisher. Do not cite without verification.
- F: No verifiable peer review, no identifiable publisher. Do not cite.

IMPORTANT: Only evaluate based on information actually present in the input. Do not fabricate accreditation status. If information cannot be verified from the input, say so in the notes.

Return ONLY valid JSON with no markdown, no backticks:
{
  "grade": "A, B, C, D, or F",
  "verdict": "one sentence plain-language verdict",
  "dimensions": [
    { "label": "Peer review status", "score": 0-100, "note": "brief explanation" },
    { "label": "Journal accreditation", "score": 0-100, "note": "brief explanation" },
    { "label": "Publisher credibility", "score": 0-100, "note": "brief explanation" }
  ],
  "recommendation": "Safe to cite / Cite with caution / Do not cite without verification / Do not cite"
}`;

  try {
    const result = await askGroqJSON<{
      grade: string;
      verdict: string;
      dimensions: { label: string; score: number; note: string }[];
      recommendation: string;
    }>(prompt, 600);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Credibility route error:", error);
    return NextResponse.json({ error: "Failed to evaluate credibility" }, { status: 500 });
  }
}