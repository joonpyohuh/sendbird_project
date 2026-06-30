"use client";

import { useState } from "react";
import type {
  GlobalDocsConvertPayload,
  GlobalDocsResult,
  GlobalDocsWorkflow,
  LanguageCode,
  LanguageQualityReviewPayload,
  TechnicalEnglishTargetStyle,
  TargetReader,
} from "@/lib/types";
import { DEFAULT_STYLE_GUIDE, SAMPLE_KOREAN_SOURCE } from "@/lib/sample";
import SectionCard from "./SectionCard";
import SelectField from "./SelectField";
import ActionButton from "./ActionButton";
import LoadingState from "./LoadingState";
import LanguageWorkflowSelector, {
  WORKFLOW_OPTIONS,
} from "./LanguageWorkflowSelector";
import TerminologyMapper from "./TerminologyMapper";
import GlobalStyleGuidePanel from "./GlobalStyleGuidePanel";
import { PriorityBadge } from "./Badges";

type Props = {
  result: GlobalDocsResult | null;
  converting: boolean;
  reviewing: boolean;
  canApply: boolean;
  onConvert: (payload: GlobalDocsConvertPayload) => void;
  onReview: (payload: LanguageQualityReviewPayload) => void;
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

function workflowLanguages(workflow: GlobalDocsWorkflow): {
  source: LanguageCode;
  target: LanguageCode;
} {
  // Every supported workflow targets English output; only the source differs.
  const source: LanguageCode =
    workflow === "english_source_to_english_docs" ? "en" : "ko";
  return { source, target: "en" };
}

function LangBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-800">{value}</span>
    </span>
  );
}

export default function GlobalDocsMode({
  result,
  converting,
  reviewing,
  canApply,
  onConvert,
  onReview,
  onApply,
}: Props) {
  const [workflow, setWorkflow] = useState<GlobalDocsWorkflow>(
    "korean_source_to_english_docs"
  );
  const [sourceText, setSourceText] = useState("");
  const [targetStyle, setTargetStyle] =
    useState<TechnicalEnglishTargetStyle>("api_reference");
  const [targetReader, setTargetReader] = useState<TargetReader>("backend");
  const [styleGuide, setStyleGuide] = useState(DEFAULT_STYLE_GUIDE);
  const [copied, setCopied] = useState<"" | "english" | "applied">("");

  const option = WORKFLOW_OPTIONS.find((o) => o.value === workflow)!;
  const { source, target } = workflowLanguages(workflow);

  function flash(kind: "english" | "applied") {
    setCopied(kind);
    setTimeout(() => setCopied(""), 1500);
  }

  function handleConvert() {
    onConvert({
      sourceLanguage: source,
      targetLanguage: target,
      workflow,
      sourceText: sourceText.trim(),
      targetStyle,
      targetReader,
      styleGuide: styleGuide.trim() || undefined,
    });
  }

  function handleReview() {
    const english = result?.finalPolishedVersion || result?.recommendedEnglish;
    if (!english) return;
    onReview({
      englishText: english,
      styleGuide: styleGuide.trim() || undefined,
      targetStyle,
      targetReader,
    });
  }

  async function copyEnglish() {
    const text = result?.finalPolishedVersion || result?.recommendedEnglish || "";
    try {
      await navigator.clipboard.writeText(text);
      flash("english");
    } catch {
      /* clipboard may be unavailable */
    }
  }

  const englishOutput =
    result?.finalPolishedVersion || result?.recommendedEnglish || "";

  return (
    <div className="space-y-4">
      {/* Hero / controls */}
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                글
              </span>
              Global Docs Mode
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Move from Korean engineering notes to global developer
              documentation.
            </p>
            <p className="text-xs text-slate-400">
              Convert Korean engineering notes into global developer
              documentation.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <LangBadge
              label="Source:"
              value={source === "ko" ? "Korean" : "English"}
            />
            <LangBadge
              label="Output:"
              value={target === "en" ? "English" : "Korean"}
            />
            <LangBadge label="Style:" value="Developer Docs" />
          </div>
        </div>

        <div className="mt-4">
          <LanguageWorkflowSelector value={workflow} onChange={setWorkflow} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Target style"
            value={targetStyle}
            onChange={(v) => setTargetStyle(v as TechnicalEnglishTargetStyle)}
            options={STYLE_OPTIONS}
          />
          <SelectField
            label="Target reader"
            value={targetReader}
            onChange={(v) => setTargetReader(v as TargetReader)}
            options={READER_OPTIONS}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton
            variant="secondary"
            onClick={() => setSourceText(SAMPLE_KOREAN_SOURCE)}
            disabled={converting}
          >
            Load Korean API Sample
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={handleConvert}
            loading={converting}
            loadingText="영문 문서 변환 중…"
            disabled={converting || !sourceText.trim()}
          >
            Convert to English Docs
          </ActionButton>
          <ActionButton
            onClick={handleReview}
            loading={reviewing}
            loadingText="언어 품질 리뷰 중…"
            disabled={reviewing || !englishOutput}
            title="현재 영문 결과의 언어 품질을 리뷰합니다"
          >
            Language Quality Review
          </ActionButton>
        </div>
      </div>

      {/* Bilingual Documentation Workspace */}
      <SectionCard
        title="Bilingual Documentation Workspace"
        description="Korean → English. 구조를 잃지 않고 원문과 영문 문서를 나란히 다룹니다."
        collapsible={false}
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          {/* Korean source */}
          <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {source === "ko" ? "Korean Source" : "English Source"}
              </h4>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                {source.toUpperCase()}
              </span>
            </div>
            <p className="mb-2 text-[11px] text-slate-400">
              Paste {source === "ko" ? "Korean" : "English"} API notes from
              engineers.
            </p>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={10}
              placeholder="예: 이 API는 유저를 생성할 때 사용합니다. API 토큰이 필요하고, user_id는 필수입니다."
              className="flex-1 resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {/* Arrow indicator */}
          <div className="flex items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 rotate-90 lg:rotate-0"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          {/* English documentation */}
          <div className="flex flex-col rounded-lg border border-brand-200 bg-brand-50/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                English Documentation
              </h4>
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                EN
              </span>
            </div>
            <p className="mb-2 text-[11px] text-slate-400">
              Developer-facing English documentation.
            </p>
            {converting ? (
              <LoadingState label="영문 문서 변환 중…" />
            ) : englishOutput ? (
              <div className="flex flex-1 flex-col">
                <div className="flex-1 rounded-md border border-slate-200 bg-white p-2.5 text-sm leading-relaxed text-slate-800">
                  {englishOutput}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ActionButton
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      onApply(englishOutput);
                      flash("applied");
                    }}
                    disabled={!canApply}
                    title={
                      canApply
                        ? "현재 문서 초안에 추가합니다"
                        : "먼저 API Workspace에서 Analyze API로 프로젝트를 생성하세요"
                    }
                  >
                    {copied === "applied" ? "적용됨!" : "Apply to Documentation Draft"}
                  </ActionButton>
                  <ActionButton size="sm" variant="secondary" onClick={copyEnglish}>
                    {copied === "english" ? "복사됨!" : "Copy English"}
                  </ActionButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                변환을 실행하면 개발자용 영문 문서가 여기에 표시됩니다.
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Expression Mapping + Terminology + Style guide + Quality review */}
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Expression Mapping"
          description="한국어 기술 표현이 자연스러운 API 문서 영어로 바뀌는 과정을 봅니다."
          collapsible={false}
        >
          {result && result.expressionMappings.length > 0 ? (
            <ul className="space-y-2.5">
              {result.expressionMappings.map((m, i) => (
                <li
                  key={i}
                  className="rounded-md border border-slate-200 bg-slate-50/60 p-2.5"
                >
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-600">KO:</span>{" "}
                    {m.koreanExpression}
                  </p>
                  {m.literalTranslation && (
                    <p className="text-xs text-slate-400 line-through">
                      {m.literalTranslation}
                    </p>
                  )}
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {m.recommendedEnglish}
                  </p>
                  {m.reason && (
                    <p className="mt-1 text-xs text-slate-500">{m.reason}</p>
                  )}
                  {m.alternatives.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {m.alternatives.map((alt, j) => (
                        <li key={j} className="text-xs text-slate-600">
                          <span className="font-mono text-brand-700">
                            {alt.expression}
                          </span>
                          {alt.nuance && (
                            <span className="text-slate-400"> — {alt.nuance}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  {m.caution && (
                    <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700">
                      ⚠ {m.caution}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">
              변환을 실행하면 표현 매핑이 여기에 표시됩니다.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Terminology Notes"
          description="Korean-English 기술 용어를 문서 전반에서 일관되게 유지합니다."
          collapsible={false}
        >
          <TerminologyMapper notes={result?.terminologyNotes ?? []} />
        </SectionCard>

        <SectionCard
          title="Global Style Guide"
          description="이 규칙은 변환과 리뷰에 적용됩니다."
          collapsible={false}
        >
          <GlobalStyleGuidePanel
            value={styleGuide}
            onChange={setStyleGuide}
            checks={result?.styleGuideChecks ?? []}
          />
        </SectionCard>

        <SectionCard
          title="Language Quality Review"
          description="직역 문제와 부자연스러운 기술 영어를 찾습니다."
          collapsible={false}
        >
          {reviewing ? (
            <LoadingState label="언어 품질 리뷰 중…" />
          ) : result && result.languageQualityIssues.length > 0 ? (
            <ul className="space-y-2">
              {result.languageQualityIssues.map((q, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-800">{q.issue}</p>
                    <PriorityBadge priority={q.severity} />
                  </div>
                  {q.suggestion && (
                    <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
                      <span className="font-medium text-slate-700">제안:</span>{" "}
                      {q.suggestion}
                    </p>
                  )}
                  {q.reason && (
                    <p className="mt-1 text-xs text-slate-400">{q.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">
              'Language Quality Review'를 실행하면 직역·부자연스러운 표현 이슈가
              표시됩니다.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
