import OpenAI from "openai";

// SECURITY: This module must only ever be imported from server-side code
// (API routes / server components). The OpenAI API key is read from the
// environment and must never be sent to or referenced by the client bundle.

// Safe default model. Override via OPENAI_MODEL in .env.local without code changes.
const DEFAULT_MODEL = "gpt-4o-mini";

export function getModel(): string {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

let cachedClient: OpenAI | null = null;

/**
 * Lazily create a singleton OpenAI client.
 * Throws a clear error (without leaking the key) if the key is missing.
 */
export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 키를 추가하세요 (예: .env.example 참고)."
    );
  }
  if (
    apiKey === "sk-your-key-here" ||
    apiKey.includes("your-key") ||
    apiKey.endsWith("-here")
  ) {
    throw new Error(
      "OPENAI_API_KEY가 예시 값(sk-your-key-here)입니다. .env.local에 실제 OpenAI API 키를 넣고 개발 서버를 재시작하세요."
    );
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

/**
 * Attempt to extract a JSON value from a model response that may be wrapped in
 * markdown code fences or contain surrounding prose. Returns null on failure so
 * callers can apply a safe fallback instead of crashing.
 */
export function safeParseJson<T = unknown>(raw: string): T | null {
  if (!raw) return null;

  const tryParse = (text: string): T | null => {
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  };

  // 1) Direct parse.
  const direct = tryParse(raw.trim());
  if (direct !== null) return direct;

  // 2) Strip ```json ... ``` or ``` ... ``` fences.
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch && fenceMatch[1]) {
    const fenced = tryParse(fenceMatch[1].trim());
    if (fenced !== null) return fenced;
  }

  // 3) Grab the first {...} or [...] block.
  const firstBrace = raw.search(/[{[]/);
  const lastBrace = Math.max(raw.lastIndexOf("}"), raw.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const sliced = tryParse(raw.slice(firstBrace, lastBrace + 1).trim());
    if (sliced !== null) return sliced;
  }

  return null;
}
