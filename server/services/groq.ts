/**
 * Thin client for the Groq chat-completions API (the project's existing
 * LLM provider). When GROQ_API_KEY is missing the app stays fully usable:
 * callers fall back to deterministic mock content.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export function llmAvailable(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Send a system+user prompt pair and return the raw assistant text.
 * Requests JSON output mode; callers still run the tolerant parser since
 * models occasionally wrap JSON in prose or fences anyway.
 */
export async function chatJson(
  system: string,
  user: string,
  { temperature = 0.3, maxTokens = 3000 }: ChatOptions = {},
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? DEFAULT_MODEL,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Groq API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Groq API returned an empty completion');
  return content;
}

/**
 * Strip markdown fences / surrounding prose and safe-parse JSON.
 * Returns null instead of throwing so callers can fall back gracefully.
 */
export function parseLlmJson(text: string): unknown {
  const attempts: string[] = [];

  let cleaned = text.trim();
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1].trim();
  attempts.push(cleaned);

  // Fall back to the outermost {...} or [...] block in the text.
  for (const [open, close] of [
    ['{', '}'],
    ['[', ']'],
  ] as const) {
    const start = cleaned.indexOf(open);
    const end = cleaned.lastIndexOf(close);
    if (start !== -1 && end > start) attempts.push(cleaned.slice(start, end + 1));
  }

  for (const candidate of attempts) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next candidate
    }
  }
  return null;
}
