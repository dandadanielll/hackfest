import { NextResponse } from "next/server";
import { extractText } from "unpdf";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { text } = await extractText(buffer, { mergePages: true });

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "No readable text found in PDF. Please ensure the PDF is text-searchable." }, { status: 422 });
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("PDF extraction error:", error);
    return NextResponse.json({ error: "Failed to extract PDF text" }, { status: 500 });
  }
}
