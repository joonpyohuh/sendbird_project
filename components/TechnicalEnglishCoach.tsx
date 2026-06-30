"use client";

import { useState } from "react";
import type {
  TechnicalEnglishPayload,
  TechnicalEnglishResult,
  TechnicalEnglishStyleCheck,
} from "@/lib/types";
import ActionButton from "./ActionButton";
import SelectField from "./SelectField";
import TextAreaField from "./TextAreaField";
import LoadingState from "./LoadingState";

type Props = {
  result: TechnicalEnglishResult | null;
  loading: boolean;
  canApply: boolean;
  onConvert: (payload: TechnicalEnglishPayload) => void;
  onApply: (text: string) => void;
};

const STYLE_OPTIONS = [
  { value: "api_reference", label: "API reference" },
  { value: "tutorial", label: "Tutorial" },
  { value: "release_note", label: "Release note" },
  { value: "engineer_question", label: "Engineer question" },
  { value: "error_explanation", label: "Error explanation" },
  { value: "ui_copy", label: "UI copy" },
  { value: "faq", label: "FAQ" },
];

const READER_OPTIONS = [
  { value: "beginner", label: "Beginner developer" },
  { value: "frontend", label: "Frontend developer" },
  { value: "backend", label: "Backend developer" },
  { value: "technical_writer", label: "Technical writer" },
];

const STATUS_STYLES: Record<
  TechnicalEnglishStyleCheck["status"],
  { label: string; cls: string }
> = {
  passed: { label: "Passed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  needs_revision: {
    label: "Needs revision",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  not_applicable: {
    label: "N/A",
    cls: "bg-slate-100 text-slate-600 ring-slate-200",
  },
};

function ResultBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      {children}
    </div>
  );
}

export default function TechnicalEnglishCoach({
  result,
  loading,
  canApply,
  onConvert,
  onApply,
}: Props) {
  const [koreanText, setKoreanText] = useState("");
  const [targetStyle, setTargetStyle] =
    useState<TechnicalEnglishPayload["targetStyle"]>("api_reference");
  const [targetReader, setTargetReader] =
    useState<TechnicalEnglishPayload["targetReader"]>("backend");
  const [styleGuide, setStyleGuide] = useState("");
  const [copied, setCopied] = useState<"" | "english" | "breakdown" | "applied">(
    ""
  );

  function flash(kind: "english" | "breakdown" | "applied") {
    setCopied(kind);
    setTimeout(() => setCopied(""), 1500);
  }

  async function copyText(text: string, kind: "english" | "breakdown") {
    try {
      await navigator.clipboard.writeText(text);
      flash(kind);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  function handleConvert() {
    onConvert({
      koreanText: koreanText.trim(),
      targetStyle,
      targetReader,
      styleGuide: styleGuide.trim() || undefined,
    });
  }

  function breakdownToText(r: TechnicalEnglishResult): string {
    return r.expressionBreakdown
      .map((item, i) => {
        const lines = [
          `${i + 1}. "${item.koreanExpression}"`,
          `   -> ${item.recommendedEnglish}`,
        ];
        if (item.reason) lines.push(`   Why: ${item.reason}`);
        if (item.caution) lines.push(`   Caution: ${item.caution}`);
        return lines.join("\n");
      })
      .join("\n\n");
  }

  return (
    <div className="space-y-3">
      <TextAreaField
        label="Korean source text"
        value={koreanText}
        onChange={setKoreanText}
        rows={4}
        placeholder="예: 이 API는 유저를 생성할 때 사용합니다. API 토큰이 필요하고, user_id는 필수입니다."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Target style"
          value={targetStyle}
          onChange={(v) =>
            setTargetStyle(v as TechnicalEnglishPayload["targetStyle"])
          }
          options={STYLE_OPTIONS}
        />
        <SelectField
          label="Target reader"
          value={targetReader}
          onChange={(v) =>
            setTargetReader(v as TechnicalEnglishPayload["targetReader"])
          }
          options={READER_OPTIONS}
        />
      </div>

      <TextAreaField
        label="Style guide (optional)"
        value={styleGuide}
        onChange={setStyleGuide}
        rows={2}
        placeholder="예: Use 'API token', not 'API key'. Use 'request body', not 'payload'. Avoid 'just' and 'simply'."
      />

      <ActionButton
        variant="primary"
        fullWidth
        onClick={handleConvert}
        loading={loading}
        loadingText="Technical English 변환 중…"
        disabled={loading || !koreanText.trim()}
      >
        Convert to Technical English
      </ActionButton>

      {loading && <LoadingState label="Technical English 변환 중…" />}

      {!loading && result && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <ResultBlock title="Recommended English">
            <p className="text-sm leading-relaxed text-slate-800">
              {result.recommendedEnglish || "—"}
            </p>
          </ResultBlock>

          <ResultBlock title="Expression Breakdown">
            {result.expressionBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400">—</p>
            ) : (
              <ul className="space-y-3">
                {result.expressionBreakdown.map((item, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5"
                  >
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-600">KO:</span>{" "}
                      {item.koreanExpression}
                    </p>
                    {item.literalEnglish && (
                      <p className="text-xs text-slate-400 line-through">
                        {item.literalEnglish}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {item.recommendedEnglish}
                    </p>
                    {item.reason && (
                      <p className="mt-1 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">
                          Why this works:
                        </span>{" "}
                        {item.reason}
                      </p>
                    )}
                    {item.alternatives.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Alternatives
                        </p>
                        <ul className="mt-1 space-y-1">
                          {item.alternatives.map((alt, j) => (
                            <li key={j} className="text-xs text-slate-600">
                              <span className="font-mono text-brand-700">
                                {alt.expression}
                              </span>
                              {alt.nuance && (
                                <span className="text-slate-400">
                                  {" "}
                                  — {alt.nuance}
                                </span>
                              )}
                              {alt.whenToUse && (
                                <span className="block text-[11px] text-slate-400">
                                  when: {alt.whenToUse}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.caution && (
                      <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                        ⚠ {item.caution}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </ResultBlock>

          {result.terminologyNotes.length > 0 && (
            <ResultBlock title="Terms to be careful with">
              <ul className="space-y-1.5">
                {result.terminologyNotes.map((t, i) => (
                  <li key={i} className="text-xs text-slate-600">
                    <span className="font-medium text-slate-800">
                      {t.term}
                    </span>{" "}
                    →{" "}
                    <span className="font-mono text-emerald-700">
                      {t.recommendedExpression}
                    </span>
                    {t.avoid && (
                      <span className="ml-1 font-mono text-rose-500 line-through">
                        {t.avoid}
                      </span>
                    )}
                    {t.reason && (
                      <span className="block text-slate-400">{t.reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </ResultBlock>
          )}

          {result.styleGuideChecks.length > 0 && (
            <ResultBlock title="Style guide checks">
              <ul className="space-y-1.5">
                {result.styleGuideChecks.map((c, i) => {
                  const s = STATUS_STYLES[c.status];
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span
                        className={`mt-0.5 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-medium ring-1 ring-inset ${s.cls}`}
                      >
                        {s.label}
                      </span>
                      <span className="text-slate-600">
                        <span className="font-medium text-slate-700">
                          {c.rule}
                        </span>
                        {c.comment && (
                          <span className="block text-slate-400">
                            {c.comment}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </ResultBlock>
          )}

          <ResultBlock title="Final polished version">
            <p className="text-sm leading-relaxed text-slate-800">
              {result.finalPolishedVersion || "—"}
            </p>
          </ResultBlock>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              variant="primary"
              size="sm"
              onClick={() => {
                onApply(result.finalPolishedVersion || result.recommendedEnglish);
                flash("applied");
              }}
              disabled={!canApply}
              title={
                canApply
                  ? "현재 문서 초안에 추가합니다"
                  : "먼저 Analyze API로 프로젝트를 생성하세요"
              }
            >
              {copied === "applied" ? "적용됨!" : "Apply to Documentation Draft"}
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() =>
                copyText(
                  result.finalPolishedVersion || result.recommendedEnglish,
                  "english"
                )
              }
            >
              {copied === "english" ? "복사됨!" : "Copy English"}
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => copyText(breakdownToText(result), "breakdown")}
            >
              {copied === "breakdown" ? "복사됨!" : "Copy Breakdown"}
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
