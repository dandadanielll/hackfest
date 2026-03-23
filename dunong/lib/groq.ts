const MODELS = [
    "llama-3.3-70b-versatile",
    "mixtral-8x7b-32768",
    "llama-3.1-8b-instant",
    "gemma2-9b-it"
];

export async function askGroq(prompt: string, maxTokens = 500): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

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
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                    max_tokens: maxTokens,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                lastError = data.error;
                // If rate limited or model error (like decommissioned), try next
                if (data.error?.code === "rate_limit_exceeded" || data.error?.type === "invalid_request_error") {
                    console.warn(`Model ${model} unavailable (rate limit or decommissioning), trying next...`);
                    continue;
                }
                throw new Error(`Groq API error: ${data.error?.message || "Unknown error"}`);
            }

            const content = data.choices?.[0]?.message?.content?.trim();
            if (!content) throw new Error("Groq returned empty response");

            return content;
        } catch (err: any) {
            if (err.message.includes("rate_limit_exceeded") || err.message.includes("decommissioned") || (lastError && (lastError.code === "rate_limit_exceeded" || lastError.type === "invalid_request_error"))) {
                continue;
            }
            throw err;
        }
    }

    throw new Error(`AI analysis unavailable. Last error: ${lastError?.message || "Unknown error"}`);
}

export async function askGroqJSON<T>(prompt: string, maxTokens = 4000): Promise<T> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

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
                        {
                            role: "system",
                            content: "You are a structured data extraction assistant. You always respond with valid JSON only, no explanation, no markdown, no preamble.",
                        },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.1,
                    max_tokens: maxTokens,
                    response_format: { type: "json_object" },
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                lastError = data.error;
                // If rate limited or model error (like decommissioned), try next
                if (data.error?.code === "rate_limit_exceeded" || data.error?.type === "invalid_request_error") {
                    console.warn(`Model ${model} unavailable (rate limit or decommissioning), trying next...`);
                    continue;
                }
                throw new Error(`Groq API error: ${data.error?.message || "Unknown error"}`);
            }

            const content = data.choices?.[0]?.message?.content?.trim();
            if (!content) throw new Error("Groq returned empty response");

            return JSON.parse(content) as T;
        } catch (err: any) {
            if (err.message.includes("rate_limit_exceeded") || err.message.includes("decommissioned") || (lastError && (lastError.code === "rate_limit_exceeded" || lastError.type === "invalid_request_error"))) {
                continue;
            }
            throw err;
        }
    }

    throw new Error(`AI analysis unavailable. Last error: ${lastError?.message || "Unknown error"}`);
}