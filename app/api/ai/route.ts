import { NextResponse } from "next/server";
import {
  getModel,
  getOpenAIClient,
  safeParseJson,
} from "@/lib/openai";
import {
  getSystemIdentity,
  getTaskPrompt,
  expectsJson,
} from "@/lib/prompts";
import type { AiAction, AiRequestBody } from "@/lib/types";

// SECURITY: This route runs only on the server. The OpenAI API key is read
// here from the environment and is never returned to the client.

export const runtime = "nodejs";

const VALID_ACTIONS: AiAction[] = [
  "analyze",
  "missing_info",
  "engineer_questions",
  "generate_doc",
  "review_doc",
  "technical_english_coach",
  "global_docs_convert",
  "language_quality_review",
  "run_improvement_loop_iteration",
  "run_improvement_loop_review",
  "run_improvement_loop_patch",
];

function isValidAction(action: unknown): action is AiAction {
  return typeof action === "string" && VALID_ACTIONS.includes(action as AiAction);
}

export async function POST(req: Request) {
  let body: AiRequestBody;

  try {
    body = (await req.json()) as AiRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON." },
      { status: 400 }
    );
  }

  const { action, payload } = body ?? {};

  if (!isValidAction(action)) {
    return NextResponse.json(
      { error: `Unknown action. Expected one of: ${VALID_ACTIONS.join(", ")}.` },
      { status: 400 }
    );
  }

  // Sanitize obvious empty inputs.
  if (payload === undefined || payload === null) {
    return NextResponse.json(
      { error: "Missing payload for the requested action." },
      { status: 400 }
    );
  }

  const taskPrompt = getTaskPrompt(action);
  const wantsJson = expectsJson(action);

  // Provide the payload as a stable JSON string so the model sees consistent input.
  const userContent = `${taskPrompt}\n\nINPUT DATA (JSON):\n${JSON.stringify(
    payload,
    null,
    2
  )}`;

  try {
    const client = getOpenAIClient();
    const model = getModel();

    const completion = await client.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: getSystemIdentity(action) },
        { role: "user", content: userContent },
      ],
      // Use JSON response format only for JSON tasks; doc generation returns Markdown.
      ...(wantsJson ? { response_format: { type: "json_object" as const } } : {}),
    });

    const raw = completion.choices[0]?.message?.content ?? "";

    if (!wantsJson) {
      // generate_doc returns Markdown text directly.
      return NextResponse.json({ action, markdown: raw });
    }

    const parsed = safeParseJson<Record<string, unknown>>(raw);

    if (parsed === null) {
      // Robust fallback: never crash the UI on malformed model output.
      return NextResponse.json(
        {
          action,
          error:
            "The AI response could not be parsed as JSON. Please try again.",
          raw,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ action, data: parsed });
  } catch (err) {
    // SECURITY: never echo secrets. Surface a safe, generic message.
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
