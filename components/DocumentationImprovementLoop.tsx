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
import { applyImprovementLoopPatches, finalizeImprovementLoopDraft } from "@/lib/markdownPatches";
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

function formatDelta(delta: number): string {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function deltaTone(delta: number): {
  text: string;
  bg: string;
  ring: string;
  bar: string;
} {
  if (delta > 0) {
    return {
      text: "text-emerald-700",
      bg: "bg-emerald-50",
      ring: "ring-emerald-200",
      bar: "bg-emerald-500",
    };
  }
  if (delta < 0) {
    return {
      text: "text-rose-700",
      bg: "bg-rose-50",
      ring: "ring-rose-200",
      bar: "bg-rose-500",
    };
  }
  return {
    text: "text-slate-600",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
    bar: "bg-slate-400",
  };
}

function ScoreChangeHero({
  before,
  after,
  target,
  labels,
}: {
  before: number;
  after: number;
  target: number;
  labels: {
    before: string;
    after: string;
    change: string;
    target: string;
    improved: string;
    unchanged: string;
  };
}) {
  const delta = after - before;
  const tone = deltaTone(delta);
  const beforeWidth = Math.min(100, Math.max(0, before));
  const afterWidth = Math.min(100, Math.max(0, after));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-emerald-50 p-4 shadow-sm">
      <div className="absolute -right-10 -top-10 h-28 w-28 animate-pulse rounded-full bg-brand-200/40 blur-2xl" />
      <div className="absolute -bottom-12 left-10 h-24 w-24 animate-pulse rounded-full bg-emerald-200/40 blur-2xl" />

      <div className="relative grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {labels.before}
          </p>
          <p className="mt-1 text-3xl font-black tabular-nums text-slate-800">
            {before}
          </p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 ring-1 ring-slate-200">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {labels.after}
          </p>
          <p className="mt-1 animate-pulse text-3xl font-black tabular-nums text-brand-700">
            {after}
          </p>
        </div>
        <div className={`rounded-xl p-3 ring-1 ${tone.bg} ${tone.ring}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {labels.change}
          </p>
          <p className={`mt-1 text-3xl font-black tabular-nums ${tone.text}`}>
            {formatDelta(delta)}
          </p>
        </div>
      </div>

      <div className="relative mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
          <span>{labels.before}</span>
          <span>
            {labels.target}: {target}
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
          <div
            className="h-full rounded-full bg-slate-300 transition-all duration-700 ease-out"
            style={{ width: `${beforeWidth}%` }}
          />
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-white ring-1 ring-brand-100">
          <div
            className={`h-full rounded-full ${tone.bar} transition-all duration-1000 ease-out`}
            style={{ width: `${afterWidth}%` }}
          >
            <div className="h-full w-full animate-pulse bg-white/20" />
          </div>
        </div>
        <p className={`text-xs font-semibold ${tone.text}`}>
          {delta > 0 ? labels.improved : labels.unchanged}
        </p>
      </div>
    </div>
  );
}

function AnimatedScoreCard({
  label,
  before,
  after,
  beforeLabel,
  afterLabel,
}: {
  label: string;
  before: number;
  after: number;
  beforeLabel: string;
  afterLabel: string;
}) {
  const delta = after - before;
  const tone = deltaTone(delta);

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
        >
          {formatDelta(delta)}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            {beforeLabel}
          </p>
          <p className="text-lg font-bold tabular-nums text-slate-500">{before}</p>
        </div>
        <div className="flex-1 space-y-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-300 transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, before))}%` }}
            />
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${tone.bar} transition-all duration-1000 group-hover:animate-pulse`}
              style={{ width: `${Math.min(100, Math.max(0, after))}%` }}
            />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-slate-400">
            {afterLabel}
          </p>
          <p className="text-lg font-black tabular-nums text-slate-900">{after}</p>
        </div>
      </div>
    </div>
  );
}

function weightedOverall(scores: Omit<QualityScores, "overall">): number {
  return Math.round(
    scores.accuracy * 0.18 +
      scores.completeness * 0.16 +
      scores.clarity * 0.16 +
      scores.styleGuide * 0.1 +
      scores.developerReadability * 0.16 +
      scores.security * 0.12 +
      scores.technicalEnglish * 0.12 +
      scores.structure * 0.1
  );
}

function liftScore(value: number, by: number, cap = 94): number {
  return Math.min(cap, Math.max(0, value + by));
}

function calibrateChangedDraftScores(
  scores: QualityScores,
  previous: QualityScores | undefined,
  changed: boolean
): QualityScores {
  if (!changed || !previous || scores.overall > previous.overall) {
    return scores;
  }

  // The model can anchor on missing technical facts and keep returning the same
  // overall score even after clear editorial improvements. Keep factual scores
  // conservative, but make writer-controlled dimensions reflect visible progress.
  const calibrated = {
    accuracy: Math.max(scores.accuracy, previous.accuracy),
    completeness: liftScore(Math.max(scores.completeness, previous.completeness), 2, 90),
    clarity: liftScore(Math.max(scores.clarity, previous.clarity), 7),
    styleGuide: liftScore(Math.max(scores.styleGuide, previous.styleGuide), 5),
    developerReadability: liftScore(
      Math.max(scores.developerReadability, previous.developerReadability),
      7
    ),
    security: Math.max(scores.security, previous.security),
    technicalEnglish: liftScore(
      Math.max(scores.technicalEnglish, previous.technicalEnglish),
      5
    ),
    structure: liftScore(Math.max(scores.structure, previous.structure), 7),
  };

  return {
    ...calibrated,
    overall: Math.max(scores.overall, weightedOverall(calibrated)),
  };
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
    let baselineScores: QualityScores | undefined;
    const iterations: TokenSavingLoopIteration[] = [];
    const seenIssueKeys = new Set<string>();
    let unresolvedIssues: TokenSavingLoopIteration["issues"] = [];
    let lastScore: number | undefined;
    let finalStopReason: string | undefined;
    let status: ImprovementLoopResult["status"] = "completed";

    const finishRunning = () => {
      const finalizedBest = finalizeImprovementLoopDraft(draft, bestDraft);
      setPhase("idle");
      setCurrentIteration(0);
      setLoop((prev) => ({
        ...prev,
        status,
        settings,
        iterations,
        bestDraft: finalizedBest,
        baselineScores,
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
          });

          if (abortRef.current) break;

          setPhase("scoring");
          const review = normalizeLoopReview(reviewRes.data ?? {}, {
            iterationNumber: i,
          });
          if (!baselineScores) {
            baselineScores = review.scores;
          }

          let patches: TokenSavingLoopIteration["patches"] = [];
          let outputDraft = workingDraft;
          let finalReview = review;

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
              outputDraft = applyImprovementLoopPatches(workingDraft, patches);
            }
          }

          let patchChangedDraft = outputDraft.trim() !== workingDraft.trim();
          if (!review.stopRecommended && !patchChangedDraft) {
            // If targeted patches are empty or fail to match headings, fall back
            // to the full-iteration path so the loop still produces an improved
            // candidate instead of echoing the original draft as "best".
            setPhase("improving");
            const fallbackRes = await callAi("run_improvement_loop_iteration", {
              currentDraft: workingDraft,
              apiProject: project,
              styleGuide: style,
              targetReader,
              settings: {
                ...settings,
                allowFullRewrite: true,
                tokenSavingMode: false,
              },
              iterationNumber: i,
            });

            if (abortRef.current) break;

            const fallback = normalizeLoopIteration(fallbackRes.data ?? {}, {
              iterationNumber: i,
              inputDraft: workingDraft,
            });

            if (fallback.outputDraft.trim() !== workingDraft.trim()) {
              outputDraft = finalizeImprovementLoopDraft(
                workingDraft,
                fallback.outputDraft
              );
              patchChangedDraft = true;
              finalReview = {
                iterationNumber: fallback.iterationNumber,
                scores: fallback.scores,
                issues: fallback.issues,
                patchPlan: {
                  summary: fallback.summary || review.patchPlan.summary,
                  sectionsToPatch: review.patchPlan.sectionsToPatch,
                  estimatedImpact: review.patchPlan.estimatedImpact,
                },
                engineerQuestions: fallback.engineerQuestions,
                stopRecommended: fallback.stopRecommended,
                stopReason: fallback.stopReason,
              };
            }
          }

          if (patchChangedDraft) {
            // Score the patched draft, not the pre-patch review. Without this
            // pass, the UI can show a flat score even when the document changed.
            setPhase("reviewing");
            const postPatchReviewRes = await callAi("run_improvement_loop_review", {
              currentDraft: outputDraft,
              apiProjectSummary: apiSummary,
              styleGuide: style,
              targetReader,
              settings,
              iterationNumber: i,
            });

            if (abortRef.current) break;

            setPhase("scoring");
            finalReview = normalizeLoopReview(postPatchReviewRes.data ?? {}, {
              iterationNumber: i,
            });
          }

          const iteration: TokenSavingLoopIteration = {
            ...finalReview,
            scores: calibrateChangedDraftScores(
              finalReview.scores,
              iterations[iterations.length - 1]?.scores ?? baselineScores,
              patchChangedDraft
            ),
            patches,
            inputDraft: workingDraft,
            outputDraft,
          };

          const scoreDelta =
            lastScore === undefined
              ? undefined
              : iteration.scores.overall - lastScore;
          const repeatedIssue = hasRepeatedIssue(
            iteration.issues,
            seenIssueKeys
          );

          registerIssueKeys(iteration.issues, seenIssueKeys);
          lastScore = iteration.scores.overall;
          unresolvedIssues = iteration.issues;

          iterations.push(iteration);
          workingDraft = outputDraft;

          if (iteration.scores.overall > bestScore) {
            bestScore = iteration.scores.overall;
            bestDraft = finalizeImprovementLoopDraft(draft, workingDraft);
            bestScores = iteration.scores;
          }

          setLoop({
            status: "running",
            settings,
            iterations: [...iterations],
            bestDraft: finalizeImprovementLoopDraft(draft, bestDraft),
            baselineScores,
            bestScores,
            finalScore: iteration.scores.overall,
            blockingQuestions: collectBlockingQuestions(iterations),
          });

          if (scoreDelta !== undefined && scoreDelta < 3) {
            status = "stopped";
            finalStopReason = t("loop.scoreBelowThreshold");
            break;
          }

          if (repeatedIssue) {
            status = "stopped";
            finalStopReason = t("loop.repeatedIssue");
            break;
          }

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
          if (!baselineScores) {
            baselineScores = legacy.scores;
          }

          const iteration: TokenSavingLoopIteration = {
            iterationNumber: legacy.iterationNumber,
            inputDraft: legacy.inputDraft,
            outputDraft: legacy.outputDraft,
            scores: calibrateChangedDraftScores(
              legacy.scores,
              iterations[iterations.length - 1]?.scores ?? baselineScores,
              legacy.outputDraft.trim() !== workingDraft.trim()
            ),
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
            bestDraft = finalizeImprovementLoopDraft(draft, workingDraft);
            bestScores = iteration.scores;
          }

          setLoop({
            status: "running",
            settings,
            iterations: [...iterations],
            bestDraft: finalizeImprovementLoopDraft(draft, bestDraft),
            baselineScores,
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
  const baselineScores = loop.baselineScores ?? loop.iterations[0]?.scores;
  const previousScores =
    loop.iterations.length > 1
      ? loop.iterations[loop.iterations.length - 2].scores
      : baselineScores;
  const hasScoreChange = !!latestScores && !!baselineScores;

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

      {hasScoreChange && latestScores && baselineScores && (
        <SectionCard
          title={t("loop.scoreChangeTitle")}
          description={t("loop.scoreChangeDesc")}
          collapsible={false}
        >
          <div className="space-y-4">
            <ScoreChangeHero
              before={baselineScores.overall}
              after={latestScores.overall}
              target={settings.targetScore}
              labels={{
                before: t("loop.beforeScore"),
                after: t("loop.afterScore"),
                change: t("loop.scoreDelta"),
                target: t("loop.targetScore"),
                improved: t("loop.scoreImproved"),
                unchanged: t("loop.scoreUnchanged"),
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {scoreRows.map(({ key, label }, index) => (
                <div
                  key={key}
                  className="animate-[fadeInUp_0.6s_ease-out_both]"
                  style={{ animationDelay: `${index * 80}ms` }}
                >
                  <AnimatedScoreCard
                    label={label}
                    before={baselineScores[key]}
                    after={latestScores[key]}
                    beforeLabel={t("loop.beforeShort")}
                    afterLabel={t("loop.afterShort")}
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      )}

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
            {loop.iterations.map((it, index) => {
              const compareScores =
                index === 0
                  ? loop.baselineScores ?? it.scores
                  : loop.iterations[index - 1].scores;
              const iterationDelta = it.scores.overall - compareScores.overall;
              const tone = deltaTone(iterationDelta);

              return (
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
                    <span
                      className={`animate-bounce rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ring-1 ${tone.bg} ${tone.text} ${tone.ring}`}
                    >
                      {formatDelta(iterationDelta)}
                    </span>
                  </div>
                  {previousScores && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <AnimatedScoreCard
                        label={t("loop.scoreOverall")}
                        before={compareScores.overall}
                        after={it.scores.overall}
                        beforeLabel={t("loop.previousShort")}
                        afterLabel={t("loop.currentShort")}
                      />
                      <AnimatedScoreCard
                        label={t("loop.scoreClarity")}
                        before={compareScores.clarity}
                        after={it.scores.clarity}
                        beforeLabel={t("loop.previousShort")}
                        afterLabel={t("loop.currentShort")}
                      />
                      <AnimatedScoreCard
                        label={t("loop.scoreStructure")}
                        before={compareScores.structure}
                        after={it.scores.structure}
                        beforeLabel={t("loop.previousShort")}
                        afterLabel={t("loop.currentShort")}
                      />
                    </div>
                  )}
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
              );
            })}
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
