export async function askGroq(prompt: string, maxTokens = 500): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: maxTokens,
        }),
    });

    const data = await res.json();

    if (!res.ok) {
        console.error("Groq error:", JSON.stringify(data));
        throw new Error(`Groq API error: ${data.error?.message || "Unknown error"}`);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Groq returned empty response");

    return content;
}

export async function askGroqJSON<T>(prompt: string, maxTokens = 1500): Promise<T> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY not configured");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
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
        console.error("Groq JSON error:", JSON.stringify(data));
        throw new Error(`Groq API error: ${data.error?.message || "Unknown error"}`);
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Groq returned empty response");

    return JSON.parse(content) as T;
}