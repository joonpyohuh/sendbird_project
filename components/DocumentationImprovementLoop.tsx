"use client";

import { useCallback, useRef, useState } from "react";
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

const PHASE_LABELS: Record<LoopPhase, string> = {
  idle: "",
  running: "Running iteration…",
  reviewing: "Reviewing documentation…",
  improving: "Improving draft…",
  scoring: "Scoring quality…",
  checking_style: "Checking style guide…",
};

const MODE_OPTIONS: { value: LoopMode; label: string; description: string }[] = [
  {
    value: "conservative",
    label: "Conservative",
    description:
      "Only make safe wording, structure, and clarity improvements. Do not infer missing technical details.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description:
      "Improve clarity, structure, examples, and terminology while preserving all known technical facts.",
  },
  {
    value: "aggressive",
    label: "Aggressive",
    description:
      "Make stronger structural improvements, but still do not invent technical facts.",
  },
];

const SCORE_ROWS: { key: keyof QualityScores; label: string }[] = [
  { key: "overall", label: "Overall" },
  { key: "accuracy", label: "Accuracy" },
  { key: "completeness", label: "Completeness" },
  { key: "clarity", label: "Clarity" },
  { key: "styleGuide", label: "Style guide" },
  { key: "developerReadability", label: "Developer readability" },
  { key: "security", label: "Security" },
  { key: "technicalEnglish", label: "Technical English" },
  { key: "structure", label: "Structure" },
];

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
        stopReason:
          "No documentation draft to improve. Generate documentation first.",
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
        finalStopReason = "Loop stopped by user.";
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
            finalStopReason =
              "Score improvement below threshold (< 3 points).";
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
            finalStopReason =
              "The same issue appeared again; stopping to avoid redundant iterations.";
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
            finalStopReason = "Target quality score reached.";
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
            finalStopReason =
              "Remaining high-impact improvements require engineer input.";
            break;
          }

          if (review.stopRecommended) {
            status = "stopped";
            finalStopReason =
              review.stopReason || "Loop stop recommended by reviewer.";
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
            finalStopReason =
              "Score improvement below threshold (< 3 points).";
            iterations.push(iteration);
            break;
          }

          if (hasRepeatedIssue(iteration.issues, seenIssueKeys)) {
            status = "stopped";
            finalStopReason =
              "The same issue appeared again; stopping to avoid redundant iterations.";
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
            finalStopReason = "Target quality score reached.";
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
            finalStopReason =
              "Remaining high-impact improvements require engineer input.";
            break;
          }

          if (iteration.stopRecommended) {
            status = "stopped";
            finalStopReason =
              iteration.stopReason || "Loop stop recommended by reviewer.";
            break;
          }
        }
      } catch (e) {
        status = "failed";
        finalStopReason =
          e instanceof Error ? e.message : "Improvement loop failed.";
        break;
      }
    }

    if (status === "completed" && !finalStopReason) {
      if (iterations.length >= effectiveMax) {
        status = "stopped";
        finalStopReason =
          "Maximum iterations reached. Review the best draft and remaining issues.";
      } else if (abortRef.current) {
        status = "stopped";
        finalStopReason = "Loop stopped by user.";
      }
    }

    finishRunning();
  }, [project, currentDraft, settings, styleGuide, targetReader]);

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
  const modeMeta = MODE_OPTIONS.find((m) => m.value === settings.mode);
  const previewHtml = loop.bestDraft
    ? (marked.parse(loop.bestDraft) as string)
    : "";

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Documentation Improvement Loop
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Run an AI review loop to improve documentation quality until it meets
          your target score.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Generate → Review → Score → Patch → Re-review → Stop when ready.
          Token-saving mode applies targeted section patches instead of full
          rewrites. Loop stops when AI cannot safely proceed without engineer
          confirmation.
        </p>
      </div>

      {/* Status banner */}
      {loop.status === "completed" && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {loop.stopReason?.includes("Target") ||
          (loop.finalScore ?? 0) >= settings.targetScore
            ? "Target quality score reached."
            : loop.stopReason}
        </div>
      )}
      {loop.status === "stopped" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {loop.stopReason?.includes("engineer")
            ? "The loop stopped because remaining improvements require engineer input."
            : loop.stopReason ||
              "Maximum iterations reached. Review the best draft and remaining issues."}
        </div>
      )}
      {loop.status === "failed" && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loop.stopReason || "Improvement loop failed."}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Loop Settings */}
        <SectionCard title="Loop Settings" collapsible={false}>
          <div className="grid gap-3 sm:grid-cols-2">
            <InputField
              label="Target quality score"
              type="number"
              value={String(settings.targetScore)}
              onChange={(v) => {
                const n = Math.min(100, Math.max(60, Number(v) || 90));
                setSetting("targetScore", n);
              }}
            />
            <InputField
              label="Max iterations"
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
              label="Hard max iterations"
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
            label="Loop mode"
            value={settings.mode}
            onChange={(v) => setSetting("mode", v as LoopMode)}
            options={MODE_OPTIONS.map((m) => ({
              value: m.value,
              label: m.label,
            }))}
          />
          {modeMeta && (
            <p className="-mt-1 text-xs text-slate-500">{modeMeta.description}</p>
          )}

          <div className="space-y-2 border-t border-slate-100 pt-3">
            <CheckboxRow
              label="Token-saving mode (section patches, compact prompts)"
              checked={settings.tokenSavingMode}
              onChange={(v) => setSetting("tokenSavingMode", v)}
            />
            <CheckboxRow
              label="Allow full document rewrite (uses more tokens)"
              checked={settings.allowFullRewrite}
              onChange={(v) => setSetting("allowFullRewrite", v)}
            />
            <CheckboxRow
              label="Stop when missing technical facts are found"
              checked={settings.stopWhenMissingFacts}
              onChange={(v) => setSetting("stopWhenMissingFacts", v)}
            />
            <CheckboxRow
              label="Apply style guide"
              checked={settings.applyStyleGuide}
              onChange={(v) => setSetting("applyStyleGuide", v)}
            />
            <CheckboxRow
              label="Include Technical English review"
              checked={settings.includeTechnicalEnglishReview}
              onChange={(v) => setSetting("includeTechnicalEnglishReview", v)}
            />
            <CheckboxRow
              label="Include security review"
              checked={settings.includeSecurityReview}
              onChange={(v) => setSetting("includeSecurityReview", v)}
            />
          </div>

          <label className="mt-2 block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Style guide
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

        {/* Loop Control */}
        <SectionCard title="Loop Control" collapsible={false}>
          {!project && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Analyze API in the API Workspace first so the loop has structured
              API context.
            </p>
          )}
          {!currentDraft.trim() && project && (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Generate documentation or add a draft before running the loop.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <ActionButton
              variant="primary"
              onClick={runLoop}
              loading={isRunning}
              loadingText={
                currentIteration > 0
                  ? `Running iteration ${currentIteration}…`
                  : PHASE_LABELS[phase] || "Running…"
              }
              disabled={isRunning || !project || !currentDraft.trim()}
            >
              Run Improvement Loop
            </ActionButton>
            <ActionButton
              variant="danger"
              onClick={stopLoop}
              disabled={!isRunning}
            >
              Stop Loop
            </ActionButton>
            <ActionButton
              onClick={() => onApplyToMainDraft(loop.bestDraft)}
              disabled={!loop.bestDraft.trim() || isRunning}
            >
              Apply Best Draft
            </ActionButton>
            <ActionButton variant="ghost" onClick={resetLoop} disabled={isRunning}>
              Reset Loop
            </ActionButton>
          </div>

          {isRunning && phase !== "idle" && (
            <div className="mt-3">
              <LoadingState
                label={
                  currentIteration > 0
                    ? `Running iteration ${currentIteration}… ${PHASE_LABELS[phase]}`
                    : PHASE_LABELS[phase]
                }
              />
            </div>
          )}

          {latestScores && (
            <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/40 p-3">
              <p className="text-xs font-medium text-brand-700">
                Latest overall:{" "}
                <span className="text-lg font-bold tabular-nums">
                  {latestScores.overall}
                </span>
                <span className="text-slate-400"> / {settings.targetScore}</span>
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quality Scores */}
      {latestScores && (
        <SectionCard title="Quality Score" collapsible={false}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SCORE_ROWS.map(({ key, label }) => (
              <ScoreBar key={key} label={label} value={latestScores[key]} />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Iteration Timeline */}
      {loop.iterations.length > 0 && (
        <SectionCard title="Iteration Timeline" collapsible={false}>
          <ol className="relative space-y-4 border-l-2 border-brand-200 pl-4">
            {loop.iterations.map((it) => (
              <li key={it.iterationNumber} className="relative">
                <span className="absolute -left-[1.35rem] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {it.iterationNumber}
                </span>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">
                      Iteration {it.iterationNumber}
                    </h4>
                    <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200">
                      Score: {it.scores.overall}
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
                        Section patches
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
                        Remaining issues
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
                      Status: {it.stopReason}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Best Draft */}
        <SectionCard title="Best Draft" collapsible={false}>
          {!loop.bestDraft ? (
            <p className="text-xs text-slate-400">
              Run the loop to generate an improved draft.
            </p>
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
                    Preview
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
                    Raw
                  </button>
                </div>
                <div className="flex gap-2">
                  <ActionButton size="sm" variant="secondary" onClick={copyBestDraft}>
                    {copied ? "복사됨!" : "Copy"}
                  </ActionButton>
                  <ActionButton
                    size="sm"
                    variant="primary"
                    onClick={() => onApplyToMainDraft(loop.bestDraft)}
                  >
                    Apply to main draft
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

        {/* Blocking Questions */}
        <SectionCard title="Blocking Questions" collapsible={false}>
          {loop.blockingQuestions.length === 0 ? (
            <p className="text-xs text-slate-400">
              No blocking engineer questions yet. Questions appear when the loop
              cannot safely improve without missing technical facts.
            </p>
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
