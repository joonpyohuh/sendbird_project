"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import type {
  ApiDocProject,
  ImprovementLoopResult,
  ImprovementLoopSettings,
  LoopEngineerQuestion,
  LoopMode,
  QualityScores,
  TargetReader,
  TokenSavingLoopIteration,
} from "@/lib/types";
import { callAi } from "@/lib/client";
import { compactApiProjectSummary } from "@/lib/compactProject";
import { applyMarkdownPatches } from "@/lib/markdownPatches";
import {
  DEFAULT_LOOP_SETTINGS,
  createIdleLoopResult,
  hasRepeatedIssue,
  normalizeLoopIteration,
  normalizeLoopPatch,
  normalizeLoopReview,
  registerIssueKeys,
} from "@/lib/normalize";
import { DEFAULT_STYLE_GUIDE } from "@/lib/sample";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import {
  getLoopModeOptions,
  getScoreRows,
} from "@/lib/i18n/helpers";
import SectionCard from "./SectionCard";
import ActionButton from "./ActionButton";
import SelectField from "./SelectField";
import InputField from "./InputField";
import LoadingState from "./LoadingState";
import { PriorityBadge } from "./Badges";

marked.setOptions({ gfm: true, breaks: false });

type Props = {
  project: ApiDocProject | null;
  currentDraft: string;
  targetReader: TargetReader;
  onApplyToMainDraft: (text: string) => void;
};

type LoopPhase =
  | "idle"
  | "running"
  | "reviewing"
  | "improving"
  | "scoring"
  | "checking_style";

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 90
      ? "bg-emerald-500"
      : value >= 75
        ? "bg-brand-500"
        : value >= 60
          ? "bg-amber-500"
          : "bg-rose-500";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-semibold tabular-nums text-slate-800">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      <span>{label}</span>
    </label>
  );
}

function collectBlockingQuestions(
  iterations: TokenSavingLoopIteration[]
): LoopEngineerQuestion[] {
  const seen = new Set<string>();
  const out: LoopEngineerQuestion[] = [];
  for (const it of iterations) {
    for (const q of it.engineerQuestions) {
      const key = q.question.trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(q);
      }
    }
    for (const issue of it.issues) {
      if (issue.requiresEngineerInput && issue.issue && !seen.has(issue.issue)) {
        seen.add(issue.issue);
        out.push({
          id: issue.id,
          question: issue.suggestion || issue.issue,
          reason: issue.issue,
          priority: issue.impact,
          relatedIssue: issue.id,
        });
      }
    }
  }
  return out;
}

export default function DocumentationImprovementLoop({
  project,
  currentDraft,
  targetReader,
  onApplyToMainDraft,
}: Props) {
  const { t } = useAppPreferences();
  const modeOptions = useMemo(() => getLoopModeOptions(t), [t]);
  const scoreRows = useMemo(() => getScoreRows(t), [t]);
  const phaseLabels = useMemo<Record<LoopPhase, string>>(
    () => ({
      idle: "",
      running: t("loop.phaseRunning"),
      reviewing: t("loop.phaseReviewing"),
      improving: t("loop.phaseImproving"),
      scoring: t("loop.phaseScoring"),
      checking_style: t("loop.phaseCheckingStyle"),
    }),
    [t]
  );

  const [settings, setSettings] =
    useState<ImprovementLoopSettings>(DEFAULT_LOOP_SETTINGS);
  const [styleGuide, setStyleGuide] = useState(DEFAULT_STYLE_GUIDE);
  const [loop, setLoop] = useState<ImprovementLoopResult>(createIdleLoopResult());
  const [phase, setPhase] = useState<LoopPhase>("idle");
  const [currentIteration, setCurrentIteration] = useState(0);
  const [draftTab, setDraftTab] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);
  const abortRef = useRef(false);

  const setSetting = <K extends keyof ImprovementLoopSettings>(
    key: K,
    value: ImprovementLoopSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const latestScores =
    loop.iterations.length > 0
      ? loop.iterations[loop.iterations.length - 1].scores
      : loop.bestScores;

  const stopLoop = useCallback(() => {
    abortRef.current = true;
  }, []);

  const resetLoop = useCallback(() => {
    abortRef.current = true;
    setPhase("idle");
    setCurrentIteration(0);
    setLoop(createIdleLoopResult(settings));
  }, [settings]);

  const runLoop = useCallback(async () => {
    if (!project) return;

    const draft = currentDraft.trim();
    if (!draft) {
      setLoop((prev) => ({
        ...prev,
        status: "failed",
        stopReason: t("loop.noDraftError"),
      }));
      return;
    }

    abortRef.current = false;
    setPhase("running");
    setCurrentIteration(0);

    const effectiveMax = Math.min(
      settings.maxIterations,
      settings.hardMaxIterations
    );
    const apiSummary = compactApiProjectSummary(project);
    const style = settings.applyStyleGuide ? styleGuide : undefined;
    const useTokenSaving =
      settings.tokenSavingMode && !settings.allowFullRewrite;

    setLoop({
      status: "running",
      settings,
      iterations: [],
      bestDraft: draft,
      bestScores: undefined,
      blockingQuestions: [],
    });

    let workingDraft = draft;
    let bestDraft = draft;
    let bestScore = -1;
    let bestScores: QualityScores | undefined;
    const iterations: TokenSavingLoopIteration[] = [];
    const seenIssueKeys = new Set<string>();
    let unresolvedIssues: TokenSavingLoopIteration["issues"] = [];
    let lastScore: number | undefined;
    let finalStopReason: string | undefined;
    let status: ImprovementLoopResult["status"] = "completed";

    const finishRunning = () => {
      setPhase("idle");
      setCurrentIteration(0);
      setLoop((prev) => ({
        ...prev,
        status,
        settings,
        iterations,
        bestDraft,
        bestScores,
        finalScore:
          iterations.length > 0
            ? iterations[iterations.length - 1].scores.overall
            : prev.finalScore,
        stopReason: finalStopReason,
        blockingQuestions: collectBlockingQuestions(iterations),
      }));
    };

    for (let i = 1; i <= effectiveMax; i++) {
      if (abortRef.current) {
        status = "stopped";
        finalStopReason = t("loop.stoppedByUser");
        break;
      }

      setCurrentIteration(i);

      try {
        if (useTokenSaving) {
          // --- Review pass (no full rewrite) ---
          setPhase("reviewing");
          const reviewRes = await callAi("run_improvement_loop_review", {
            currentDraft: workingDraft,
            apiProjectSummary: apiSummary,
            styleGuide: style,
            targetReader,
            settings,
            iterationNumber: i,
            lastScore,
            unresolvedIssues:
              unresolvedIssues.length > 0 ? unresolvedIssues : undefined,
          });

          if (abortRef.current) break;

          setPhase("scoring");
          const review = normalizeLoopReview(reviewRes.data ?? {}, {
            iterationNumber: i,
          });

          if (
            lastScore !== undefined &&
            review.scores.overall - lastScore < 3
          ) {
            status = "stopped";
            finalStopReason = t("loop.scoreBelowThreshold");
            iterations.push({
              ...review,
              patches: [],
              inputDraft: workingDraft,
              outputDraft: workingDraft,
            });
            break;
          }

          if (hasRepeatedIssue(review.issues, seenIssueKeys)) {
            status = "stopped";
            finalStopReason = t("loop.repeatedIssue");
            iterations.push({
              ...review,
              patches: [],
              inputDraft: workingDraft,
              outputDraft: workingDraft,
            });
            break;
          }

          registerIssueKeys(review.issues, seenIssueKeys);
          lastScore = review.scores.overall;
          unresolvedIssues = review.issues;

          let patches: TokenSavingLoopIteration["patches"] = [];
          let outputDraft = workingDraft;

          const shouldPatch =
            !review.stopRecommended &&
            review.patchPlan.sectionsToPatch.length > 0 &&
            review.scores.overall < settings.targetScore;

          if (shouldPatch) {
            setPhase("improving");
            const patchRes = await callAi("run_improvement_loop_patch", {
              currentDraft: workingDraft,
              apiProjectSummary: apiSummary,
              styleGuide: style,
              targetReader,
              settings,
              iterationNumber: i,
              patchPlan: review.patchPlan,
              issues: review.issues,
              sectionsToPatch: review.patchPlan.sectionsToPatch,
            });

            if (abortRef.current) break;

            setPhase("checking_style");
            patches = normalizeLoopPatch(patchRes.data ?? {});
            if (patches.length > 0) {
              outputDraft = applyMarkdownPatches(workingDraft, patches);
            }
          }

          const iteration: TokenSavingLoopIteration = {
            ...review,
            patches,
            inputDraft: workingDraft,
            outputDraft,
          };

          iterations.push(iteration);
          workingDraft = outputDraft;

          if (iteration.scores.overall > bestScore) {
            bestScore = iteration.scores.overall;
            bestDraft = workingDraft;
            bestScores = iteration.scores;
          }

          setLoop({
            status: "running",
            settings,
            iterations: [...iterations],
            bestDraft,
            bestScores,
            finalScore: iteration.scores.overall,
            blockingQuestions: collectBlockingQuestions(iterations),
          });

          if (iteration.scores.overall >= settings.targetScore) {
            status = "completed";
            finalStopReason = t("loop.targetReached");
            break;
          }

          if (
            settings.stopWhenMissingFacts &&
            (iteration.engineerQuestions.some((q) => q.priority === "high") ||
              iteration.issues.some(
                (iss) => iss.requiresEngineerInput && iss.impact === "high"
              ))
          ) {
            status = "stopped";
            finalStopReason = t("loop.stoppedEngineer");
            break;
          }

          if (review.stopRecommended) {
            status = "stopped";
            finalStopReason =
              review.stopReason || t("loop.stopRecommendedByReviewer");
            break;
          }
        } else {
          // Full rewrite path (allowFullRewrite enabled, token-saving off)
          setPhase("reviewing");
          setPhase("improving");
          const res = await callAi("run_improvement_loop_iteration", {
            currentDraft: workingDraft,
            apiProject: project,
            styleGuide: style,
            targetReader,
            settings,
            iterationNumber: i,
          });

          setPhase("scoring");
          const legacy = normalizeLoopIteration(res.data ?? {}, {
            iterationNumber: i,
            inputDraft: workingDraft,
          });

          const iteration: TokenSavingLoopIteration = {
            iterationNumber: legacy.iterationNumber,
            inputDraft: legacy.inputDraft,
            outputDraft: legacy.outputDraft,
            scores: legacy.scores,
            issues: legacy.issues,
            patchPlan: {
              summary: legacy.summary,
              sectionsToPatch: [],
              estimatedImpact: "medium",
            },
            patches: [],
            engineerQuestions: legacy.engineerQuestions,
            stopRecommended: legacy.stopRecommended,
            stopReason: legacy.stopReason,
          };

          if (
            lastScore !== undefined &&
            iteration.scores.overall - lastScore < 3
          ) {
            status = "stopped";
            finalStopReason = t("loop.scoreBelowThreshold");
            iterations.push(iteration);
            break;
          }

          if (hasRepeatedIssue(iteration.issues, seenIssueKeys)) {
            status = "stopped";
            finalStopReason = t("loop.repeatedIssue");
            iterations.push(iteration);
            break;
          }

          registerIssueKeys(iteration.issues, seenIssueKeys);
          lastScore = iteration.scores.overall;

          iterations.push(iteration);
          workingDraft = iteration.outputDraft || workingDraft;

          if (iteration.scores.overall > bestScore) {
            bestScore = iteration.scores.overall;
            bestDraft = workingDraft;
            bestScores = iteration.scores;
          }

          setLoop({
            status: "running",
            settings,
            iterations: [...iterations],
            bestDraft,
            bestScores,
            finalScore: iteration.scores.overall,
            blockingQuestions: collectBlockingQuestions(iterations),
          });

          if (iteration.scores.overall >= settings.targetScore) {
            status = "completed";
            finalStopReason = t("loop.targetReached");
            break;
          }

          if (
            settings.stopWhenMissingFacts &&
            (iteration.engineerQuestions.some((q) => q.priority === "high") ||
              iteration.issues.some(
                (iss) => iss.requiresEngineerInput && iss.impact === "high"
              ))
          ) {
            status = "stopped";
            finalStopReason = t("loop.stoppedEngineer");
            break;
          }

          if (iteration.stopRecommended) {
            status = "stopped";
            finalStopReason =
              iteration.stopReason || t("loop.stopRecommendedByReviewer");
            break;
          }
        }
      } catch (e) {
        status = "failed";
        finalStopReason =
          e instanceof Error ? e.message : t("loop.failed");
        break;
      }
    }

    if (status === "completed" && !finalStopReason) {
      if (iterations.length >= effectiveMax) {
        status = "stopped";
        finalStopReason = t("loop.stoppedMax");
      } else if (abortRef.current) {
        status = "stopped";
        finalStopReason = t("loop.stoppedByUser");
      }
    }

    finishRunning();
  }, [project, currentDraft, settings, styleGuide, targetReader, t]);

  async function copyBestDraft() {
    try {
      await navigator.clipboard.writeText(loop.bestDraft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const isRunning = loop.status === "running";
  const modeMeta = modeOptions.find((m) => m.value === settings.mode);
  const previewHtml = loop.bestDraft
    ? (marked.parse(loop.bestDraft) as string)
    : "";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">{t("loop.title")}</h2>
        <p className="mt-1 text-sm text-slate-600">{t("loop.subtitle")}</p>
        <p className="mt-2 text-xs text-slate-400">{t("loop.subtitleDetail")}</p>
      </div>

      {loop.status === "completed" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {loop.stopReason || t("loop.targetReached")}
        </div>
      )}
      {loop.status === "stopped" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loop.stopReason || t("loop.stoppedMax")}
        </div>
      )}
      {loop.status === "failed" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loop.stopReason || t("loop.failed")}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t("loop.settingsTitle")} collapsible={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label={t("loop.targetScore")}
              type="number"
              value={String(settings.targetScore)}
              onChange={(v) => {
                const n = Math.min(100, Math.max(60, Number(v) || 90));
                setSetting("targetScore", n);
              }}
            />
            <InputField
              label={t("loop.maxIterations")}
              type="number"
              value={String(settings.maxIterations)}
              onChange={(v) => {
                const n = Math.min(
                  settings.hardMaxIterations,
                  Math.max(1, Number(v) || 2)
                );
                setSetting("maxIterations", n);
              }}
            />
            <InputField
              label={t("loop.hardMaxIterations")}
              type="number"
              value={String(settings.hardMaxIterations)}
              onChange={(v) => {
                const n = Math.min(5, Math.max(1, Number(v) || 3));
                setSetting("hardMaxIterations", n);
                if (settings.maxIterations > n) {
                  setSetting("maxIterations", n);
                }
              }}
            />
          </div>

          <SelectField
            label={t("loop.loopMode")}
            value={settings.mode}
            onChange={(v) => setSetting("mode", v as LoopMode)}
            options={modeOptions.map((m) => ({
              value: m.value,
              label: m.label,
            }))}
          />
          {modeMeta && (
            <p className="-mt-1 text-xs text-slate-500">{modeMeta.description}</p>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <CheckboxRow
              label={t("loop.tokenSaving")}
              checked={settings.tokenSavingMode}
              onChange={(v) => setSetting("tokenSavingMode", v)}
            />
            <CheckboxRow
              label={t("loop.allowFullRewrite")}
              checked={settings.allowFullRewrite}
              onChange={(v) => setSetting("allowFullRewrite", v)}
            />
            <CheckboxRow
              label={t("loop.stopMissingFacts")}
              checked={settings.stopWhenMissingFacts}
              onChange={(v) => setSetting("stopWhenMissingFacts", v)}
            />
            <CheckboxRow
              label={t("loop.applyStyleGuide")}
              checked={settings.applyStyleGuide}
              onChange={(v) => setSetting("applyStyleGuide", v)}
            />
            <CheckboxRow
              label={t("loop.includeTechnicalEnglish")}
              checked={settings.includeTechnicalEnglishReview}
              onChange={(v) => setSetting("includeTechnicalEnglishReview", v)}
            />
            <CheckboxRow
              label={t("loop.includeSecurity")}
              checked={settings.includeSecurityReview}
              onChange={(v) => setSetting("includeSecurityReview", v)}
            />
          </div>

          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              {t("loop.styleGuideLabel")}
            </span>
            <textarea
              value={styleGuide}
              rows={4}
              onChange={(e) => setStyleGuide(e.target.value)}
              disabled={!settings.applyStyleGuide}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50 disabled:text-slate-400"
            />
          </label>
        </SectionCard>

        <SectionCard title={t("loop.controlTitle")} collapsible={false}>
          {!project && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("loop.needAnalyze")}
            </p>
          )}
          {!currentDraft.trim() && project && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {t("loop.needDraft")}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton
              variant="primary"
              onClick={runLoop}
              loading={isRunning}
              loadingText={
                currentIteration > 0
                  ? `${t("loop.runningIteration", { count: currentIteration })} ${phaseLabels[phase]}`
                  : phaseLabels[phase] || t("loop.runningEllipsis")
              }
              disabled={isRunning || !project || !currentDraft.trim()}
            >
              {t("loop.runLoop")}
            </ActionButton>
            <ActionButton
              variant="danger"
              onClick={stopLoop}
              disabled={!isRunning}
            >
              {t("loop.stopLoop")}
            </ActionButton>
            <ActionButton
              onClick={() => onApplyToMainDraft(loop.bestDraft)}
              disabled={!loop.bestDraft.trim() || isRunning}
            >
              {t("loop.applyBestDraft")}
            </ActionButton>
            <ActionButton variant="ghost" onClick={resetLoop} disabled={isRunning}>
              {t("loop.resetLoop")}
            </ActionButton>
          </div>

          {isRunning && phase !== "idle" && (
            <div className="mt-3">
              <LoadingState
                label={
                  currentIteration > 0
                    ? `${t("loop.runningIteration", { count: currentIteration })} ${phaseLabels[phase]}`
                    : phaseLabels[phase]
                }
              />
            </div>
          )}

          {latestScores && (
            <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
              <p className="text-xs font-medium text-brand-700">
                {t("loop.latestOverall")}:{" "}
                <span className="text-lg font-bold tabular-nums">
                  {latestScores.overall}
                </span>
                <span className="text-slate-400"> / {settings.targetScore}</span>
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {latestScores && (
        <SectionCard title={t("loop.qualityScore")} collapsible={false}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scoreRows.map(({ key, label }) => (
              <ScoreBar key={key} label={label} value={latestScores[key]} />
            ))}
          </div>
        </SectionCard>
      )}

      {loop.iterations.length > 0 && (
        <SectionCard title={t("loop.iterationTimeline")} collapsible={false}>
          <ol className="relative space-y-4 border-l-2 border-brand-200 pl-4">
            {loop.iterations.map((it) => (
              <li key={it.iterationNumber} className="relative">
                <span className="absolute -left-[1.35rem] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {it.iterationNumber}
                </span>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">
                      {t("loop.iterationLabel", { count: it.iterationNumber })}
                    </h4>
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                      {t("loop.scoreShort")}: {it.scores.overall}
                    </span>
                  </div>
                  {it.patchPlan?.summary && (
                    <p className="mt-1 text-xs text-slate-500">
                      {it.patchPlan.summary}
                    </p>
                  )}
                  {it.patches.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {t("loop.sectionPatches")}
                      </p>
                      <ul className="mt-1 list-disc pl-4 text-xs text-slate-600">
                        {it.patches.map((p, idx) => (
                          <li key={idx}>
                            {p.action} · {p.sectionTitle}
                            {p.reason ? ` — ${p.reason}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {it.issues.length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {t("loop.remainingIssues")}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {it.issues.slice(0, 4).map((iss) => (
                          <li
                            key={iss.id}
                            className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600"
                          >
                            {iss.issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {it.stopRecommended && it.stopReason && (
                    <p className="mt-2 text-xs font-medium text-brand-700">
                      {t("loop.statusPrefix")}: {it.stopReason}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title={t("loop.bestDraft")} collapsible={false}>
          {!loop.bestDraft ? (
            <p className="text-xs text-slate-400">{t("loop.runLoopToGenerate")}</p>
          ) : (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setDraftTab("preview")}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      draftTab === "preview"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {t("loop.previewTab")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftTab("raw")}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      draftTab === "raw"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500"
                    }`}
                  >
                    {t("loop.rawTab")}
                  </button>
                </div>
                <div className="flex gap-2">
                  <ActionButton size="sm" variant="secondary" onClick={copyBestDraft}>
                    {copied ? t("loop.copied") : t("loop.copyBestDraft")}
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    variant="primary"
                    onClick={() => onApplyToMainDraft(loop.bestDraft)}
                  >
                    {t("loop.applyToMainDraft")}
                  </ActionButton>
                </div>
              </div>
              {draftTab === "preview" ? (
                <div
                  className="markdown-preview max-h-[50vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-3 text-sm"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <textarea
                  readOnly
                  value={loop.bestDraft}
                  rows={16}
                  className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-800"
                />
              )}
            </>
          )}
        </SectionCard>

        <SectionCard title={t("loop.blockingQuestions")} collapsible={false}>
          {loop.blockingQuestions.length === 0 ? (
            <p className="text-xs text-slate-400">{t("loop.noBlockingQuestions")}</p>
          ) : (
            <ul className="space-y-2">
              {loop.blockingQuestions.map((q) => (
                <li
                  key={q.id}
                  className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-800">{q.question}</p>
                    <PriorityBadge priority={q.priority} />
                  </div>
                  {q.reason && (
                    <p className="mt-1 text-xs text-slate-500">{q.reason}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
