import { NextRequest, NextResponse } from "next/server";
import { askGroq } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sources = body.sources as any[];
    const format = body.format as string;

    const entries = await Promise.all(sources.map(async (source) => {
      const authors = Array.isArray(source.authors)
        ? source.authors.map((a: any) => {
            if (typeof a === 'string') return a;
            return `${a.lastName}, ${a.firstName}${a.middleName ? ` ${a.middleName}` : ''}`;
          }).join('; ')
        : source.authors ?? 'Unknown Author';

      const prompt = `Generate a single ${format} bibliography entry for this source. Return ONLY the formatted citation text with no preamble, explanation, or quotes.
Title: ${source.title ?? 'Untitled'}
Authors: ${authors}
Year: ${source.year ?? 'n.d.'}
Journal/Publisher: ${source.journal ?? source.publisher ?? ''}
DOI/URL: ${source.doi ? `https://doi.org/${source.doi}` : source.url ?? ''}`;

      const res = await askGroq(prompt, 256); // 256 tokens max
      return res.trim();
    }));

    return NextResponse.json({ entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
