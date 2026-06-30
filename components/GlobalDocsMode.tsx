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
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import {
  getReaderOptions,
  getStyleOptions,
} from "@/lib/i18n/helpers";
import SectionCard from "./SectionCard";
import SelectField from "./SelectField";
import ActionButton from "./ActionButton";
import LoadingState from "./LoadingState";
import LanguageWorkflowSelector from "./LanguageWorkflowSelector";
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

function workflowLanguages(workflow: GlobalDocsWorkflow): {
  source: LanguageCode;
  target: LanguageCode;
} {
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
  const { t } = useAppPreferences();
  const styleOptions = getStyleOptions(t);
  const readerOptions = getReaderOptions(t);

  const [workflow, setWorkflow] = useState<GlobalDocsWorkflow>(
    "korean_source_to_english_docs"
  );
  const [sourceText, setSourceText] = useState("");
  const [targetStyle, setTargetStyle] =
    useState<TechnicalEnglishTargetStyle>("api_reference");
  const [targetReader, setTargetReader] = useState<TargetReader>("backend");
  const [styleGuide, setStyleGuide] = useState(DEFAULT_STYLE_GUIDE);
  const [copied, setCopied] = useState<"" | "english" | "applied">("");

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
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                글
              </span>
              {t("globalDocs.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{t("globalDocs.subtitle")}</p>
            <p className="text-xs text-slate-400">{t("globalDocs.subtitleShort")}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <LangBadge
              label={`${t("globalDocs.sourceLabel")}:`}
              value={source === "ko" ? t("options.langKorean") : t("options.langEnglish")}
            />
            <LangBadge
              label={`${t("globalDocs.outputLabel")}:`}
              value={target === "en" ? t("options.langEnglish") : t("options.langKorean")}
            />
            <LangBadge
              label={`${t("globalDocs.styleLabel")}:`}
              value={t("globalDocs.devDocsStyle")}
            />
          </div>
        </div>

        <div className="mt-4">
          <LanguageWorkflowSelector value={workflow} onChange={setWorkflow} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <SelectField
            label={t("globalDocs.targetStyle")}
            value={targetStyle}
            onChange={(v) => setTargetStyle(v as TechnicalEnglishTargetStyle)}
            options={styleOptions}
          />
          <SelectField
            label={t("globalDocs.targetReader")}
            value={targetReader}
            onChange={(v) => setTargetReader(v as TargetReader)}
            options={readerOptions}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton
            variant="secondary"
            onClick={() => setSourceText(SAMPLE_KOREAN_SOURCE)}
            disabled={converting}
          >
            {t("globalDocs.loadSample")}
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={handleConvert}
            loading={converting}
            loadingText={t("loading.global_docs_convert")}
            disabled={converting || !sourceText.trim()}
          >
            {t("globalDocs.convert")}
          </ActionButton>
          <ActionButton
            onClick={handleReview}
            loading={reviewing}
            loadingText={t("loading.language_quality_review")}
            disabled={reviewing || !englishOutput}
            title={t("globalDocs.reviewTooltip")}
          >
            {t("globalDocs.review")}
          </ActionButton>
        </div>
      </div>

      <SectionCard
        title={t("globalDocs.bilingualTitle")}
        description={t("globalDocs.bilingualDesc")}
        collapsible={false}
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
          <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {source === "ko"
                  ? t("globalDocs.koreanSource")
                  : t("globalDocs.englishSource")}
              </h4>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                {source.toUpperCase()}
              </span>
            </div>
            <p className="mb-2 text-[11px] text-slate-400">
              {source === "ko"
                ? t("globalDocs.pasteSourceKo")
                : t("globalDocs.pasteSourceEn")}
            </p>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              rows={10}
              placeholder={t("globalDocs.sourcePlaceholderKo")}
              className="flex-1 resize-y rounded-md border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

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

          <div className="flex flex-col rounded-lg border border-brand-200 bg-brand-50/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                {t("globalDocs.englishDocs")}
              </h4>
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                EN
              </span>
            </div>
            <p className="mb-2 text-[11px] text-slate-400">
              {t("globalDocs.devEnglishDesc")}
            </p>
            {converting ? (
              <LoadingState label={t("loading.global_docs_convert")} />
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
                        ? t("globalDocs.applyDraftTooltip")
                        : t("globalDocs.applyDraftDisabledTooltip")
                    }
                  >
                    {copied === "applied"
                      ? t("globalDocs.applied")
                      : t("globalDocs.applyDraft")}
                  </ActionButton>
                  <ActionButton size="sm" variant="secondary" onClick={copyEnglish}>
                    {copied === "english"
                      ? t("globalDocs.copied")
                      : t("globalDocs.copyEnglish")}
                  </ActionButton>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                {t("globalDocs.emptyConvert")}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={t("globalDocs.expressionMapping")}
          description={t("globalDocs.expressionMappingDesc")}
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
                    <span className="font-medium text-slate-600">
                      {t("globalDocs.koLabel")}:
                    </span>{" "}
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
            <p className="text-xs text-slate-400">{t("globalDocs.emptyMapping")}</p>
          )}
        </SectionCard>

        <SectionCard
          title={t("globalDocs.terminologyNotes")}
          description={t("globalDocs.terminologyDesc")}
          collapsible={false}
        >
          <TerminologyMapper notes={result?.terminologyNotes ?? []} />
        </SectionCard>

        <SectionCard
          title={t("globalDocs.styleGuideTitle")}
          description={t("globalDocs.styleGuideDesc")}
          collapsible={false}
        >
          <GlobalStyleGuidePanel
            value={styleGuide}
            onChange={setStyleGuide}
            checks={result?.styleGuideChecks ?? []}
          />
        </SectionCard>

        <SectionCard
          title={t("globalDocs.qualityReview")}
          description={t("globalDocs.qualityReviewDesc")}
          collapsible={false}
        >
          {reviewing ? (
            <LoadingState label={t("loading.language_quality_review")} />
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
                      <span className="font-medium text-slate-700">
                        {t("review.suggestion")}:
                      </span>{" "}
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
            <p className="text-xs text-slate-400">{t("globalDocs.emptyQuality")}</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
