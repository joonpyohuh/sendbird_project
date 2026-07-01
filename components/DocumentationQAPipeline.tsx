"use client";

import { useCallback, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
} from "lucide-react";
import type {
  ApiDocProject,
  DocQAPipelineResult,
  DocQAValidationChecks,
  DocQAValidationResult,
} from "@/lib/types";
import { callAi } from "@/lib/client";
import {
  normalizeConsistencyIssues,
  normalizeDocQAValidation,
  normalizeStructureIssues,
  normalizeTwSuggestions,
} from "@/lib/normalize";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import SectionCard from "./SectionCard";
import ActionButton from "./ActionButton";
import LoadingState from "./LoadingState";
import { PriorityBadge } from "./Badges";

const MAX_EDIT_VALIDATION_LOOPS = 3;

type Props = {
  project: ApiDocProject | null;
  currentDraft: string;
  onApplyToMainDraft: (text: string) => void;
};

type QAPhase =
  | "idle"
  | "structure"
  | "consistency"
  | "tw_review"
  | "edit"
  | "validate"
  | "done"
  | "error";

const CHECK_LABELS: (keyof DocQAValidationChecks)[] = [
  "noDuplicateHeadings",
  "noDuplicatedTables",
  "noDuplicatedRequestBody",
  "noDuplicatedResponseBody",
  "markdownRendersCorrectly",
  "validHeadingHierarchy",
  "examplesMatchSchema",
  "unknownFormattingConsistent",
  "requestResponseSectionsOnce",
];

function ValidationChecklist({
  checks,
  t,
}: {
  checks: DocQAValidationChecks;
  t: (key: string) => string;
}) {
  return (
    <ul className="space-y-1.5">
      {CHECK_LABELS.map((key) => {
        const pass = checks[key];
        return (
          <li key={key} className="flex items-start gap-2 text-xs">
            {pass ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
            )}
            <span className={pass ? "text-slate-700" : "text-rose-700"}>
              {t(`docQa.check.${key}`)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function DocumentationQAPipeline({
  project,
  currentDraft,
  onApplyToMainDraft,
}: Props) {
  const { t } = useAppPreferences();
  const abortRef = useRef(false);
  const [phase, setPhase] = useState<QAPhase>("idle");
  const [result, setResult] = useState<DocQAPipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dedupeRunning, setDedupeRunning] = useState(false);
  const [dedupeDraft, setDedupeDraft] = useState<string | null>(null);
  const [latestValidation, setLatestValidation] =
    useState<DocQAValidationResult | null>(null);

  const running = phase !== "idle" && phase !== "done" && phase !== "error";
  const canRun = !!currentDraft.trim() && !running && !dedupeRunning;

  const runDeduplicate = useCallback(async () => {
    if (!currentDraft.trim()) return;

    setDedupeRunning(true);
    setError(null);
    setDedupeDraft(null);

    try {
      const res = await callAi("doc_qa_deduplicate", {
        markdown: currentDraft,
      });
      const cleaned = (res.markdown ?? "").trim();
      if (!cleaned) {
        throw new Error(t("docQa.dedupeEmpty"));
      }
      setDedupeDraft(cleaned);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("docQa.dedupeFailed"));
    } finally {
      setDedupeRunning(false);
    }
  }, [currentDraft, t]);

  const runPipeline = useCallback(async () => {
    if (!currentDraft.trim()) return;

    abortRef.current = false;
    setError(null);
    setResult(null);
    setLatestValidation(null);

    try {
      setPhase("structure");
      const structureRes = await callAi("doc_qa_structure", {
        markdown: currentDraft,
      });
      if (abortRef.current) return;
      const structureIssues = normalizeStructureIssues(
        structureRes.data?.issues ?? structureRes.data
      );

      setPhase("consistency");
      const consistencyRes = await callAi("doc_qa_consistency", {
        markdown: currentDraft,
        project: project ?? undefined,
      });
      if (abortRef.current) return;
      const consistencyIssues = normalizeConsistencyIssues(
        consistencyRes.data?.inconsistencies ?? consistencyRes.data
      );

      setPhase("tw_review");
      const twRes = await callAi("doc_qa_tw_review", {
        markdown: currentDraft,
      });
      if (abortRef.current) return;
      const twSuggestions = normalizeTwSuggestions(
        twRes.data?.suggestions ?? twRes.data
      );

      let draft = currentDraft;
      let editIterations = 0;
      const validationHistory: DocQAValidationResult[] = [];
      let validationFailures: string[] = [];
      let passedValidation = false;

      while (editIterations < MAX_EDIT_VALIDATION_LOOPS) {
        setPhase("edit");
        const editRes = await callAi("doc_qa_edit", {
          markdown: draft,
          structureIssues,
          consistencyIssues,
          twSuggestions,
          validationFailures:
            validationFailures.length > 0 ? validationFailures : undefined,
        });
        if (abortRef.current) return;

        const revised = (editRes.markdown ?? "").trim();
        if (!revised) {
          throw new Error(t("docQa.editEmpty"));
        }
        draft = revised;
        editIterations += 1;

        setPhase("validate");
        const validateRes = await callAi("doc_qa_validate", {
          markdown: draft,
        });
        if (abortRef.current) return;

        const validation = normalizeDocQAValidation(validateRes.data ?? {});
        validationHistory.push(validation);
        setLatestValidation(validation);

        if (validation.passesAll) {
          passedValidation = true;
          break;
        }

        validationFailures = validation.failedChecks.length
          ? validation.failedChecks
          : CHECK_LABELS.filter((k) => !validation.checks[k]).map((k) =>
              t(`docQa.check.${k}`)
            );
      }

      const pipelineResult: DocQAPipelineResult = {
        structureIssues,
        consistencyIssues,
        twSuggestions,
        editIterations,
        validationHistory,
        finalDraft: draft,
        passedValidation,
      };

      setResult(pipelineResult);
      setPhase("done");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : t("docQa.failed"));
    }
  }, [currentDraft, project, t]);

  function stopPipeline() {
    abortRef.current = true;
    setPhase("idle");
  }

  function phaseLabel(): string {
    switch (phase) {
      case "structure":
        return t("docQa.phaseStructure");
      case "consistency":
        return t("docQa.phaseConsistency");
      case "tw_review":
        return t("docQa.phaseTwReview");
      case "edit":
        return t("docQa.phaseEdit");
      case "validate":
        return t("docQa.phaseValidate");
      default:
        return t("docQa.running");
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title={t("docQa.title")}
        description={t("docQa.subtitle")}
        collapsible={false}
        right={
          running ? (
            <ActionButton variant="ghost" size="sm" onClick={stopPipeline}>
              {t("docQa.stop")}
            </ActionButton>
          ) : undefined
        }
      >
        <p className="text-xs leading-5 text-slate-600">{t("docQa.desc")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton
            variant="primary"
            loading={dedupeRunning}
            loadingText={t("docQa.dedupeRunning")}
            disabled={!canRun}
            onClick={runDeduplicate}
          >
            {t("docQa.dedupeRun")}
          </ActionButton>
          <ActionButton
            variant="secondary"
            loading={running}
            loadingText={phaseLabel()}
            disabled={!canRun}
            onClick={runPipeline}
          >
            {t("docQa.run")}
          </ActionButton>
          {dedupeDraft && (
            <ActionButton
              variant="secondary"
              onClick={() => onApplyToMainDraft(dedupeDraft)}
            >
              {t("docQa.applyDedupe")}
            </ActionButton>
          )}
          {result && (
            <ActionButton
              variant="secondary"
              onClick={() => onApplyToMainDraft(result.finalDraft)}
            >
              {t("docQa.applyFinal")}
            </ActionButton>
          )}
        </div>
        {!currentDraft.trim() && (
          <p className="mt-2 text-xs text-amber-700">{t("docQa.needDraft")}</p>
        )}
      </SectionCard>

      {dedupeRunning && (
        <LoadingState label={t("docQa.dedupeRunning")} />
      )}

      {dedupeDraft && (
        <SectionCard title={t("docQa.dedupeTitle")} collapsible={false}>
          <p className="mb-3 text-xs text-slate-600">{t("docQa.dedupeDesc")}</p>
          <pre className="max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-5 text-slate-800">
            {dedupeDraft}
          </pre>
        </SectionCard>
      )}

      {running && (
        <LoadingState label={phaseLabel()} />
      )}

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      {result && (
        <>
          <SectionCard title={t("docQa.step1Title")}>
            {result.structureIssues.length === 0 ? (
              <p className="text-xs text-slate-500">{t("docQa.noIssues")}</p>
            ) : (
              <ul className="space-y-2">
                {result.structureIssues.map((item, i) => (
                  <li
                    key={`s-${i}`}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={item.severity} />
                      {item.location && (
                        <span className="font-mono text-[10px] text-slate-400">
                          {item.location}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-slate-700">{item.issue}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title={t("docQa.step2Title")}>
            {result.consistencyIssues.length === 0 ? (
              <p className="text-xs text-slate-500">{t("docQa.noIssues")}</p>
            ) : (
              <ul className="space-y-2">
                {result.consistencyIssues.map((item, i) => (
                  <li
                    key={`c-${i}`}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    <PriorityBadge priority={item.severity} />
                    <p className="mt-1 font-medium text-slate-800">
                      {item.inconsistency}
                    </p>
                    {item.details && (
                      <p className="mt-0.5 text-slate-500">{item.details}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title={t("docQa.step3Title")}>
            {result.twSuggestions.length === 0 ? (
              <p className="text-xs text-slate-500">{t("docQa.noIssues")}</p>
            ) : (
              <ul className="space-y-2">
                {result.twSuggestions.map((item, i) => (
                  <li
                    key={`t-${i}`}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <PriorityBadge priority={item.severity} />
                      <span className="text-[10px] uppercase tracking-wide text-slate-400">
                        {item.area}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-700">{item.suggestion}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title={t("docQa.step45Title")}>
            <p className="text-xs text-slate-600">
              {t("docQa.editIterations", { count: result.editIterations })}
            </p>
            {latestValidation && (
              <div className="mt-3">
                <p
                  className={`mb-2 text-xs font-semibold ${
                    result.passedValidation
                      ? "text-emerald-700"
                      : "text-amber-700"
                  }`}
                >
                  {result.passedValidation
                    ? t("docQa.validationPassed")
                    : t("docQa.validationPartial")}
                </p>
                <ValidationChecklist checks={latestValidation.checks} t={t} />
              </div>
            )}
            <pre className="mt-4 max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-5 text-slate-800">
              {result.finalDraft}
            </pre>
          </SectionCard>
        </>
      )}
    </div>
  );
}
