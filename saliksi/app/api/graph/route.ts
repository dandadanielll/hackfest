import { NextRequest, NextResponse } from "next/server";
import { askGroqJSON } from "@/lib/groq";

interface Article {
    id: string;
    title: string;
    authors: string;
    year: string;
    abstract?: string;
}

export async function POST(req: NextRequest) {
    const { articles } = await req.json();

    if (!articles || articles.length < 2) {
        return NextResponse.json({ error: "At least 2 articles required" }, { status: 400 });
    }

    const articleList = articles
        .map((a: Article, i: number) =>
            `[${i + 1}] "${a.title}" by ${a.authors} (${a.year})\nAbstract: ${a.abstract || "Not available."}`
        )
        .join("\n\n");

    const prompt = `You are a knowledge graph builder for academic literature. Given these research articles, extract the key entities and relationships to build a visual knowledge graph.

Articles:
${articleList}

Instructions:
- Create nodes for: each paper (type: "paper"), key concepts (type: "concept"), main authors (type: "author"), geographic regions mentioned (type: "region")
- Create edges showing how nodes relate: "cites", "supports", "contradicts", "studies", "authored by", "focuses on", "conducted in"
- Keep it focused: 8-15 nodes total, 8-15 edges
- For paper nodes, use a short version of the title (max 6 words)
- For positions, use normalized coordinates between 0.1 and 0.9 (x and y) — spread nodes out, papers in center, concepts/authors around edges
- Each node must have a connections array listing the IDs of directly connected nodes

Return ONLY valid JSON, no markdown, no backticks:
{
  "nodes": [
    {
      "id": "unique_id",
      "label": "Short label",
      "type": "paper|concept|author|region",
      "x": 0.5,
      "y": 0.5,
      "connections": ["id1", "id2"]
    }
  ],
  "edges": [
    {
      "from": "node_id",
      "to": "node_id",
      "label": "relationship type"
    }
  ]
}`;

    try {
        const result = await askGroqJSON<{
            nodes: { id: string; label: string; type: string; x: number; y: number; connections: string[] }[];
            edges: { from: string; to: string; label: string }[];
        }>(prompt, 1200);

        return NextResponse.json(result);
    } catch (error) {
        console.error("Graph route error:", error);
        return NextResponse.json({ error: "Failed to build knowledge graph" }, { status: 500 });
    }
}