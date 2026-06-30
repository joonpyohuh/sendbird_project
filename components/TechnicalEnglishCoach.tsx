"use client";

import { useState } from "react";
import type {
  TechnicalEnglishPayload,
  TechnicalEnglishResult,
} from "@/lib/types";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import {
  getReaderOptions,
  getStyleCheckStatus,
  getStyleOptions,
} from "@/lib/i18n/helpers";
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
  const { t } = useAppPreferences();
  const styleOptions = getStyleOptions(t);
  const readerOptions = getReaderOptions(t);

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
        if (item.reason) lines.push(`   ${t("technicalEnglish.whyWorks")}: ${item.reason}`);
        if (item.caution) lines.push(`   ${t("technicalEnglish.caution")}: ${item.caution}`);
        return lines.join("\n");
      })
      .join("\n\n");
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg border border-brand-100 bg-brand-50/50 px-3 py-2 text-xs text-brand-800">
        {t("technicalEnglish.banner")}
      </p>

      <TextAreaField
        label={t("technicalEnglish.koreanSource")}
        value={koreanText}
        onChange={setKoreanText}
        rows={4}
        placeholder={t("technicalEnglish.koreanPlaceholder")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={t("technicalEnglish.targetStyle")}
          value={targetStyle}
          onChange={(v) =>
            setTargetStyle(v as TechnicalEnglishPayload["targetStyle"])
          }
          options={styleOptions}
        />
        <SelectField
          label={t("technicalEnglish.targetReader")}
          value={targetReader}
          onChange={(v) =>
            setTargetReader(v as TechnicalEnglishPayload["targetReader"])
          }
          options={readerOptions}
        />
      </div>

      <TextAreaField
        label={t("technicalEnglish.styleGuideOptional")}
        value={styleGuide}
        onChange={setStyleGuide}
        rows={2}
        placeholder={t("technicalEnglish.styleGuidePlaceholder")}
      />

      <ActionButton
        variant="primary"
        fullWidth
        onClick={handleConvert}
        loading={loading}
        loadingText={t("loading.technical_english_coach")}
        disabled={loading || !koreanText.trim()}
      >
        {t("technicalEnglish.convert")}
      </ActionButton>

      {loading && <LoadingState label={t("loading.technical_english_coach")} />}

      {!loading && result && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <ResultBlock title={t("technicalEnglish.recommendedEnglish")}>
            <p className="text-sm leading-relaxed text-slate-800">
              {result.recommendedEnglish || "—"}
            </p>
          </ResultBlock>

          <ResultBlock title={t("technicalEnglish.expressionBreakdown")}>
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
                      <span className="font-medium text-slate-600">
                        {t("globalDocs.koLabel")}:
                      </span>{" "}
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
                          {t("technicalEnglish.whyWorks")}:
                        </span>{" "}
                        {item.reason}
                      </p>
                    )}
                    {item.alternatives.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {t("technicalEnglish.alternatives")}
                        </p>
                        <ul className="mt-1 space-y-1">
                          {item.alternatives.map((alt, j) => (
                            <li key={j} className="text-xs text-slate-600">
                              <span className="font-mono text-brand-700">
                                {alt.expression}
                              </span>
                              {alt.nuance && (
                                <span className="text-slate-400"> — {alt.nuance}</span>
                              )}
                              {alt.whenToUse && (
                                <span className="block text-[11px] text-slate-400">
                                  {t("technicalEnglish.whenToUse")}: {alt.whenToUse}
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
            <ResultBlock title={t("technicalEnglish.termsToBeCareful")}>
              <ul className="space-y-1.5">
                {result.terminologyNotes.map((note, i) => (
                  <li key={i} className="text-xs text-slate-600">
                    <span className="font-medium text-slate-800">{note.term}</span>{" "}
                    →{" "}
                    <span className="font-mono text-emerald-700">
                      {note.recommendedExpression}
                    </span>
                    {note.avoid && (
                      <span className="ml-1 font-mono text-rose-500 line-through">
                        {note.avoid}
                      </span>
                    )}
                    {note.reason && (
                      <span className="block text-slate-400">{note.reason}</span>
                    )}
                  </li>
                ))}
              </ul>
            </ResultBlock>
          )}

          {result.styleGuideChecks.length > 0 && (
            <ResultBlock title={t("technicalEnglish.styleChecks")}>
              <ul className="space-y-1.5">
                {result.styleGuideChecks.map((c, i) => {
                  const s = getStyleCheckStatus(t, c.status);
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span
                        className={`mt-0.5 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-medium ring-1 ring-inset ${s.cls}`}
                      >
                        {s.label}
                      </span>
                      <span className="text-slate-600">
                        <span className="font-medium text-slate-700">{c.rule}</span>
                        {c.comment && (
                          <span className="block text-slate-400">{c.comment}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </ResultBlock>
          )}

          <ResultBlock title={t("technicalEnglish.finalPolishedVersion")}>
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
                  ? t("technicalEnglish.applyDraftTooltip")
                  : t("technicalEnglish.applyDraftDisabledTooltip")
              }
            >
              {copied === "applied"
                ? t("technicalEnglish.applied")
                : t("technicalEnglish.applyDraft")}
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
              {copied === "english"
                ? t("technicalEnglish.copied")
                : t("technicalEnglish.copyEnglish")}
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              onClick={() => copyText(breakdownToText(result), "breakdown")}
            >
              {copied === "breakdown"
                ? t("technicalEnglish.copied")
                : t("technicalEnglish.copyBreakdown")}
            </ActionButton>
          </div>
        </div>
      )}

      {!loading && !result && (
        <p className="text-xs text-slate-400">{t("technicalEnglish.emptyResult")}</p>
      )}
    </div>
  );
}
