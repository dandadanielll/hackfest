import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json(
    { 
      gaps: [
        { title: "Mindanao Regional Bias", desc: "90% of current stunting research focuses on NCR/Luzon." },
        { title: "SBFP Sustainability", desc: "No longitudinal data exists for cognitive retention 2 years post exit." }
      ]
    }, 
    { status: 200 }
  );
}
