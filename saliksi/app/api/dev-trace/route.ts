import { NextRequest } from "next/server";

const MODELS = [
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
    "llama-3.1-8b-instant",
    "gemma2-9b-it"
];

export async function POST(req: NextRequest) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: "GROQ_API_KEY not configured" }), { status: 500 });
    }

    const { operation, context, detailed } = await req.json();

    const systemPrompt = `You are an internal AI engine trace logger for an academic research platform called "saLiksi" (built for Filipino researchers).

You are generating a REAL-TIME internal reasoning trace — the kind of "chain of thought" an AI system produces as it works through a task. This is shown in a developer console to demonstrate how the AI backend processes requests.

RULES:
- Write in first person as the AI engine ("I", "my")
- Be technical but clear — reference real concepts like tokenization, embedding similarity, metadata extraction, API calls
- Show your actual reasoning steps: what you're analyzing, what signals you're detecting, what decisions you're making
- Reference real databases/APIs: OpenAlex, Semantic Scholar, CrossRef, CHED, PHILJOL, HERDIN, Scopus
- ${detailed ? 'Generate 8-14 detailed reasoning steps. Include sub-observations, data shapes, internal state, intermediate results, and decision rationale. Be verbose and thorough.' : 'Keep it concise — 4-7 short reasoning steps, each 1-2 sentences max'}
- Use the ">" prefix for each step (like a log trace)
- Do NOT use markdown formatting. Plain text only.
- Sound like a real AI system thinking, not a human narrating
${detailed ? '- Include intermediate variable values, array lengths, specific model parameters, confidence scores, latency estimates\n- Show branching logic ("if X then Y, else Z")\n- Reference specific function names, model configs, and data transformations' : ''}

Example style:
> Tokenizing input query... 3 key entities extracted: "K-12", "Filipino students", "Math performance"
> Constructing semantic search vector. Cosine similarity threshold set to 0.72 for academic relevance filtering.
> Dispatching parallel requests to OpenAlex (PH-filtered) and PHILJOL OAI-PMH endpoint...
> 23 raw results received. Running deduplication via DOI cross-reference and Levenshtein title matching...
> Credibility scoring: weighting citation_count (0.3), publisher_reputation (0.25), peer_review_status (0.25), recency (0.2)
> 4 duplicates removed. 19 unique results ranked. Top result: 94/100 credibility score.
> Payload serialized. Dispatching to client rendering layer.`;

    const userPrompt = `Generate a realistic AI engine reasoning trace for this operation:

Operation: ${operation}
Context: ${context}

Generate the trace NOW. ${detailed ? 'Be VERY detailed and thorough. 8-14 steps. Show internal state, intermediate values, branching logic, and decision rationale.' : 'Short, technical, realistic. 4-7 steps.'} Use ">" prefix.`;

    let lastError: any = null;

    for (const model of MODELS) {
        try {
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt },
                    ],
                    temperature: 0.7,
                    max_tokens: detailed ? 800 : 350,
                    stream: true,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                lastError = data.error;
                if (data.error?.code === "rate_limit_exceeded" || data.error?.type === "invalid_request_error") {
                    continue;
                }
                return new Response(JSON.stringify({ error: data.error?.message || "Groq API error" }), { status: 500 });
            }

            // Stream the response through
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();

            const stream = new ReadableStream({
                async start(controller) {
                    const reader = res.body?.getReader();
                    if (!reader) {
                        controller.close();
                        return;
                    }

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            const lines = chunk.split("\n").filter(line => line.trim().startsWith("data: "));

                            for (const line of lines) {
                                const data = line.replace("data: ", "").trim();
                                if (data === "[DONE]") continue;

                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.choices?.[0]?.delta?.content;
                                    if (content) {
                                        controller.enqueue(encoder.encode(content));
                                    }
                                } catch {
                                    // Skip malformed chunks
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Stream error:", e);
                    } finally {
                        controller.close();
                    }
                },
            });

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-cache",
                    "Transfer-Encoding": "chunked",
                },
            });

        } catch (err: any) {
            if (err.message?.includes("rate_limit_exceeded") || err.message?.includes("decommissioned")) {
                continue;
            }
            return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ error: `AI trace unavailable. Last error: ${lastError?.message || "Unknown"}` }), { status: 500 });
}
