import type { AiAction } from "./types";

// Client-side helper to call the server AI route.
// SECURITY: the client never sees the OpenAI key; it only talks to /api/ai.

export type AiJsonResult = {
  action: AiAction;
  data?: Record<string, unknown>;
  markdown?: string;
};

export async function callAi(
  action: AiAction,
  payload: unknown
): Promise<AiJsonResult> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });

  let json: Record<string, unknown> = {};
  try {
    json = await res.json();
  } catch {
    throw new Error("서버 응답을 해석할 수 없습니다.");
  }

  if (!res.ok) {
    const message =
      typeof json.error === "string"
        ? json.error
        : `요청에 실패했습니다 (HTTP ${res.status}).`;
    throw new Error(message);
  }

  return json as AiJsonResult;
}
