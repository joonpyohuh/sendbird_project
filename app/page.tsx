"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, ScanSearch, WandSparkles } from "lucide-react";
import { AppHeader } from "@/components/workspace/app-header";
import { ApiSourcePanel } from "@/components/workspace/api-source-panel";
import { AiReviewPanel } from "@/components/workspace/ai-review-panel";
import { DocumentationPanel } from "@/components/workspace/documentation-panel";
import ShellControls from "@/components/shell/ShellControls";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import { getPriorityLabel, useTranslatedOptions } from "@/lib/i18n/helpers";
import { callAi } from "@/lib/client";
import {
  normalizeEngineerQuestions,
  normalizeGlobalDocsResult,
  normalizeLanguageQualityIssues,
  normalizeMissingInfo,
  normalizeProject,
  normalizeReviewIssues,
  normalizeTechnicalEnglish,
  projectFromForm,
  uid,
} from "@/lib/normalize";
import { EMPTY_FORM, SAMPLE_FORM } from "@/lib/sample";
import type {
  AiAction,
  ApiDocProject,
  EngineerQuestion,
  GlobalDocsConvertPayload,
  GlobalDocsResult,
  LanguageQualityReviewPayload,
  RawFormInput,
  TechnicalEnglishPayload,
  TechnicalEnglishResult,
} from "@/lib/types";

const FORM_KEY = "adw_form_v1";
const PROJECT_KEY = "adw_project_v1";
type FeatureStep = "input" | "review" | "docs";

export default function Page() {
  const { t } = useAppPreferences();
  const { readerOptions, authOptions } = useTranslatedOptions();
  const [activeFeature, setActiveFeature] = useState<FeatureStep>("input");
  const [form, setForm] = useState<RawFormInput>(EMPTY_FORM);
  const [project, setProject] = useState<ApiDocProject | null>(null);
  const [busy, setBusy] = useState<AiAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [coachResult, setCoachResult] = useState<TechnicalEnglishResult | null>(
    null
  );
  const [globalResult, setGlobalResult] = useState<GlobalDocsResult | null>(
    null
  );
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state from localStorage on mount.
  useEffect(() => {
    try {
      const savedForm = localStorage.getItem(FORM_KEY);
      if (savedForm) setForm({ ...EMPTY_FORM, ...JSON.parse(savedForm) });
      const savedProject = localStorage.getItem(PROJECT_KEY);
      if (savedProject) {
        const parsed = JSON.parse(savedProject) as ApiDocProject;
        setProject(parsed);
        if (parsed.technicalEnglish) setCoachResult(parsed.technicalEnglish);
      }
    } catch {
      // Ignore corrupt storage.
    }
    setHydrated(true);
  }, []);

  // Persist form + project whenever they change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify(form));
    } catch {
      /* storage may be full or unavailable */
    }
  }, [form, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (project) localStorage.setItem(PROJECT_KEY, JSON.stringify(project));
      else localStorage.removeItem(PROJECT_KEY);
    } catch {
      /* ignore */
    }
  }, [project, hydrated]);

  function setField<K extends keyof RawFormInput>(
    key: K,
    value: RawFormInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function loadSample() {
    setForm(SAMPLE_FORM);
    setProject(null);
    setHasReviewed(false);
    setCoachResult(null);
    setError(null);
  }

  function reset() {
    setForm(EMPTY_FORM);
    setProject(null);
    setHasReviewed(false);
    setCoachResult(null);
    setGlobalResult(null);
    setError(null);
    try {
      localStorage.removeItem(FORM_KEY);
      localStorage.removeItem(PROJECT_KEY);
    } catch {
      /* ignore */
    }
  }

  const formIsEmpty =
    !form.rawNotes.trim() &&
    !form.featureName.trim() &&
    !form.endpointUrl.trim() &&
    !form.description.trim();

  async function handleAnalyze() {
    if (formIsEmpty) {
      setError(t("errors.emptyForm"));
      return;
    }
    setBusy("analyze");
    setError(null);
    try {
      const res = await callAi("analyze", { form });
      const normalized = normalizeProject(res.data ?? {}, uid("proj"));
      // Keep raw notes from the form for traceability.
      normalized.rawNotes = form.rawNotes;
      setProject(normalized);
      setHasReviewed(false);
    } catch (e) {
      // Fallback: build a basic project locally so the writer is not blocked.
      setProject(projectFromForm(form));
      setError(
        (e instanceof Error ? e.message : t("errors.analyzeFallback")) +
          t("errors.analyzeFallbackSuffix")
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleMissingInfo() {
    if (!project) {
      setError(t("errors.needAnalyze"));
      return;
    }
    setBusy("missing_info");
    setError(null);
    try {
      const res = await callAi("missing_info", { project });
      const items = normalizeMissingInfo(res.data?.missingInfo);
      setProject((prev) => (prev ? { ...prev, missingInfo: items } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.missingInfoFail"));
    } finally {
      setBusy(null);
    }
  }

  async function handleEngineerQuestions() {
    if (!project) {
      setError(t("errors.needAnalyze"));
      return;
    }
    setBusy("engineer_questions");
    setError(null);
    try {
      const res = await callAi("engineer_questions", { project });
      const questions = normalizeEngineerQuestions(res.data?.engineerQuestions);
      setProject((prev) =>
        prev ? { ...prev, engineerQuestions: questions } : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.questionsFail"));
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateDoc() {
    if (!project) {
      setError(t("errors.needAnalyze"));
      return;
    }
    setBusy("generate_doc");
    setError(null);
    try {
      const res = await callAi("generate_doc", { project });
      const md = (res.markdown ?? "").trim();
      setProject((prev) => (prev ? { ...prev, docDraftMarkdown: md } : prev));
      setHasReviewed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.generateFail"));
    } finally {
      setBusy(null);
    }
  }

  async function handleReviewDoc() {
    if (!project || !project.docDraftMarkdown.trim()) {
      setError(t("errors.needGenerate"));
      return;
    }
    setBusy("review_doc");
    setError(null);
    try {
      const res = await callAi("review_doc", {
        markdown: project.docDraftMarkdown,
        project,
      });
      const issues = normalizeReviewIssues(res.data?.reviewIssues);
      setProject((prev) => (prev ? { ...prev, reviewIssues: issues } : prev));
      setHasReviewed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.reviewFail"));
    } finally {
      setBusy(null);
    }
  }

  async function handleTechnicalEnglish(payload: TechnicalEnglishPayload) {
    if (!payload.koreanText.trim()) {
      setError(t("errors.coachEmpty"));
      return;
    }
    setBusy("technical_english_coach");
    setError(null);
    try {
      const res = await callAi("technical_english_coach", payload);
      const result = normalizeTechnicalEnglish(
        res.data ?? {},
        payload.koreanText
      );
      setCoachResult(result);
      // Persist into the main project state when a project exists.
      setProject((prev) =>
        prev ? { ...prev, technicalEnglish: result } : prev
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("errors.coachFail")
      );
    } finally {
      setBusy(null);
    }
  }

  // Replace or set the main Markdown documentation draft.
  function applyDraftToMain(text: string, mode: "replace" | "append" = "append") {
    const snippet = text.trim();
    if (!snippet) return;
    setProject((prev) => {
      const base = prev ?? projectFromForm(form);
      if (mode === "replace") {
        return { ...base, docDraftMarkdown: `${snippet}\n` };
      }
      const existing = base.docDraftMarkdown.trim();
      const next = existing ? `${existing}\n\n${snippet}\n` : `${snippet}\n`;
      return { ...base, docDraftMarkdown: next };
    });
  }

  // Backward-compatible alias used by English coach / Global Docs (append).
  function applyEnglishToDraft(text: string) {
    applyDraftToMain(text, "append");
  }

  async function handleGlobalConvert(payload: GlobalDocsConvertPayload) {
    if (!payload.sourceText.trim()) {
      setError(t("errors.globalEmpty"));
      return;
    }
    setBusy("global_docs_convert");
    setError(null);
    try {
      const enriched: GlobalDocsConvertPayload = {
        ...payload,
        existingDraft: project?.docDraftMarkdown || undefined,
      };
      const res = await callAi("global_docs_convert", enriched);
      const result = normalizeGlobalDocsResult(res.data ?? {}, {
        sourceLanguage: payload.sourceLanguage,
        targetLanguage: payload.targetLanguage,
      });
      setGlobalResult(result);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : t("errors.globalFail")
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleGlobalReview(payload: LanguageQualityReviewPayload) {
    if (!payload.englishText.trim()) {
      setError(t("errors.globalReviewEmpty"));
      return;
    }
    setBusy("language_quality_review");
    setError(null);
    try {
      const res = await callAi("language_quality_review", payload);
      const issues = normalizeLanguageQualityIssues(
        res.data?.languageQualityIssues
      );
      setGlobalResult((prev) =>
        prev ? { ...prev, languageQualityIssues: issues } : prev
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.globalReviewFail"));
    } finally {
      setBusy(null);
    }
  }

  function updateQuestion(id: string, patch: Partial<EngineerQuestion>) {
    setProject((prev) =>
      prev
        ? {
            ...prev,
            engineerQuestions: prev.engineerQuestions.map((q) =>
              q.id === id ? { ...q, ...patch } : q
            ),
          }
        : prev
    );
  }

  async function copyEngineerQuestions() {
    if (!project) return;
    const text = project.engineerQuestions
      .map((q, i) => {
        const lines = [
          `${i + 1}. ${q.question}`,
          `   - ${t("engineer.reason")}: ${q.reason}`,
          `   - ${t("engineer.priority")}: ${getPriorityLabel(t, q.priority)}`,
        ];
        if (q.owner) lines.push(`   - ${t("engineer.owner")}: ${q.owner}`);
        if (q.answer) lines.push(`   - ${t("engineer.answer")}: ${q.answer}`);
        return lines.join("\n");
      })
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  function updateDoc(markdown: string) {
    setProject((prev) => (prev ? { ...prev, docDraftMarkdown: markdown } : prev));
  }

  const isBusy = busy !== null;

  const loadingLabel = (action: AiAction) => t(`loading.${action}`);

  const fileBaseName =
    (project?.title || "api-documentation")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "api-documentation";

  function exportMarkdown() {
    const md = project?.docDraftMarkdown ?? "";
    if (!md.trim()) return;
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const hasSavedState = hydrated && (!!project || !formIsEmpty);
  const featureSteps = useMemo(
    () => [
      {
        id: "input" as FeatureStep,
        eyebrow: t("featureNav.inputEyebrow"),
        title: t("featureNav.inputTitle"),
        description: t("featureNav.inputDesc"),
        cta: t("api.analyze"),
        icon: <WandSparkles className="h-6 w-6" />,
      },
      {
        id: "review" as FeatureStep,
        eyebrow: t("featureNav.reviewEyebrow"),
        title: t("featureNav.reviewTitle"),
        description: t("featureNav.reviewDesc"),
        cta: t("api.reviewDoc"),
        icon: <ScanSearch className="h-6 w-6" />,
      },
      {
        id: "docs" as FeatureStep,
        eyebrow: t("featureNav.docsEyebrow"),
        title: t("featureNav.docsTitle"),
        description: t("featureNav.docsDesc"),
        cta: t("workspace.documentation"),
        icon: <FileText className="h-6 w-6" />,
      },
    ],
    [t]
  );
  const activeIndex = featureSteps.findIndex((step) => step.id === activeFeature);
  const activeStep = featureSteps[activeIndex] ?? featureSteps[0];
  const goToFeature = (direction: "prev" | "next") => {
    const nextIndex =
      direction === "next"
        ? (activeIndex + 1) % featureSteps.length
        : (activeIndex - 1 + featureSteps.length) % featureSteps.length;
    setActiveFeature(featureSteps[nextIndex].id);
  };

  return (
    <main className="min-h-screen bg-background">
      <ShellControls />
      <AppHeader
        onLoadSample={loadSample}
        onReset={reset}
        onExport={exportMarkdown}
        hasDraft={!!project?.docDraftMarkdown?.trim()}
        hasSavedState={hasSavedState}
        disabled={isBusy}
      />

      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/[0.08] dark:text-rose-200">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400/80 transition hover:text-rose-600 dark:hover:text-rose-200"
              aria-label={t("controls.close")}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-xl shadow-primary/10">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.35fr]">
            <aside className="border-b border-border bg-gradient-to-br from-primary-soft via-background to-card p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
                <span>{activeStep.eyebrow}</span>
                <span className="opacity-70">
                  {activeIndex + 1} / {featureSteps.length}
                </span>
              </div>

              <div className="mt-8 flex min-h-[34rem] flex-col justify-between">
                <div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
                    {activeStep.icon}
                  </div>
                  <h1 className="mt-7 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                    {activeStep.title}
                  </h1>
                  <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-text-secondary sm:text-xl">
                    {activeStep.description}
                  </p>
                </div>

                <div className="mt-10 space-y-5">
                  <div className="grid gap-3">
                    {featureSteps.map((step, index) => {
                      const active = step.id === activeFeature;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => setActiveFeature(step.id)}
                          className={`flex items-center gap-4 rounded-2xl border px-4 py-4 text-left transition ${
                            active
                              ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                              : "border-border bg-card/80 text-text-secondary hover:border-primary/40 hover:bg-background"
                          }`}
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-surface-subtle text-foreground"
                            }`}
                          >
                            {index + 1}
                          </span>
                          <span className="text-base font-extrabold">{step.cta}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => goToFeature("prev")}
                      className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:border-primary hover:text-primary"
                      aria-label={t("featureNav.previous")}
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goToFeature("next")}
                      className="flex h-14 flex-1 items-center justify-center gap-3 rounded-full bg-primary px-6 text-base font-black text-primary-foreground shadow-lg shadow-primary/25 transition hover:translate-x-0.5"
                      aria-label={t("featureNav.next")}
                    >
                      {t("featureNav.next")}
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-h-[48rem] bg-background/60 p-4 sm:p-6 lg:p-8">
              <div className={activeFeature === "input" ? "block" : "hidden"}>
                <ApiSourcePanel
                  form={form}
                  setField={setField}
                  busy={busy}
                  isBusy={isBusy}
                  hasProject={!!project}
                  readerOptions={readerOptions}
                  authOptions={authOptions}
                  loadingLabel={loadingLabel}
                  onAnalyze={handleAnalyze}
                  onMissingInfo={handleMissingInfo}
                  onEngineerQuestions={handleEngineerQuestions}
                  onGenerateDoc={handleGenerateDoc}
                  globalResult={globalResult}
                  onGlobalConvert={handleGlobalConvert}
                  onGlobalReview={handleGlobalReview}
                  onApplyGlobal={applyEnglishToDraft}
                  coachResult={coachResult}
                  onTechnicalEnglish={handleTechnicalEnglish}
                  onApplyEnglish={applyEnglishToDraft}
                />
              </div>
              <div className={activeFeature === "review" ? "block" : "hidden"}>
                <AiReviewPanel
                  project={project}
                  busy={busy}
                  isBusy={isBusy}
                  hasReviewed={hasReviewed}
                  loadingLabel={loadingLabel}
                  onReviewDoc={handleReviewDoc}
                  onUpdateQuestion={updateQuestion}
                  onCopyQuestions={copyEngineerQuestions}
                />
              </div>
              <div className={activeFeature === "docs" ? "block" : "hidden"}>
                <DocumentationPanel
                  project={project}
                  markdown={project?.docDraftMarkdown ?? ""}
                  onChange={updateDoc}
                  fileBaseName={fileBaseName}
                  targetReader={form.targetReader}
                  onApplyToMainDraft={(text) => applyDraftToMain(text, "replace")}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
