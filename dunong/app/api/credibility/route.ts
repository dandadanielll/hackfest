import { NextResponse } from "next/server";

export async function POST(req: Request) {
  return NextResponse.json(
    { 
      score: 92, 
      verdict: "High Credibility Source", 
      details: {
        accredited: true,
        peerReviewed: true,
        affiliation: "UP Manila",
        recent: true
      }
    }, 
    { status: 200 }
  );
}
