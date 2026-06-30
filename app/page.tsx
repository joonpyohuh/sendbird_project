"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import SectionCard from "@/components/SectionCard";
import TextAreaField from "@/components/TextAreaField";
import InputField from "@/components/InputField";
import SelectField from "@/components/SelectField";
import ActionButton from "@/components/ActionButton";
import StructuredSummary from "@/components/StructuredSummary";
import MissingInfoList from "@/components/MissingInfoList";
import EngineerQuestionsPanel from "@/components/EngineerQuestionsPanel";
import MarkdownOutput from "@/components/MarkdownOutput";
import ReviewIssuesPanel from "@/components/ReviewIssuesPanel";
import LoadingState from "@/components/LoadingState";
import TechnicalEnglishCoach from "@/components/TechnicalEnglishCoach";
import GlobalDocsMode from "@/components/GlobalDocsMode";
import DocumentationImprovementLoop from "@/components/DocumentationImprovementLoop";
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

type AppMode = "workspace" | "global" | "loop";

const FORM_KEY = "adw_form_v1";
const PROJECT_KEY = "adw_project_v1";

const LOADING_LABELS: Record<AiAction, string> = {
  analyze: "API 분석 중…",
  missing_info: "누락 정보 탐색 중…",
  engineer_questions: "엔지니어 질문 생성 중…",
  generate_doc: "문서 생성 중…",
  review_doc: "문서 리뷰 중…",
  technical_english_coach: "Technical English 변환 중…",
  global_docs_convert: "영문 문서 변환 중…",
  language_quality_review: "언어 품질 리뷰 중…",
  run_improvement_loop_iteration: "문서 개선 반복 실행 중…",
  run_improvement_loop_review: "문서 리뷰 중…",
  run_improvement_loop_patch: "섹션 패치 생성 중…",
};

export default function Page() {
  const [form, setForm] = useState<RawFormInput>(EMPTY_FORM);
  const [project, setProject] = useState<ApiDocProject | null>(null);
  const [busy, setBusy] = useState<AiAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [coachResult, setCoachResult] = useState<TechnicalEnglishResult | null>(
    null
  );
  const [appMode, setAppMode] = useState<AppMode>("workspace");
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
      setError("먼저 API 정보를 입력하거나 'Load Sample API'를 눌러주세요.");
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
        (e instanceof Error ? e.message : "분석에 실패했습니다.") +
          " 기본 요약으로 대체했습니다."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleMissingInfo() {
    if (!project) {
      setError("먼저 'Analyze API'를 실행해주세요.");
      return;
    }
    setBusy("missing_info");
    setError(null);
    try {
      const res = await callAi("missing_info", { project });
      const items = normalizeMissingInfo(res.data?.missingInfo);
      setProject((prev) => (prev ? { ...prev, missingInfo: items } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "누락 정보 탐색에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleEngineerQuestions() {
    if (!project) {
      setError("먼저 'Analyze API'를 실행해주세요.");
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
      setError(e instanceof Error ? e.message : "질문 생성에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleGenerateDoc() {
    if (!project) {
      setError("먼저 'Analyze API'를 실행해주세요.");
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
      setError(e instanceof Error ? e.message : "문서 생성에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReviewDoc() {
    if (!project || !project.docDraftMarkdown.trim()) {
      setError("먼저 'Generate Documentation'으로 문서를 생성해주세요.");
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
      setError(e instanceof Error ? e.message : "문서 리뷰에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function handleTechnicalEnglish(payload: TechnicalEnglishPayload) {
    if (!payload.koreanText.trim()) {
      setError("변환할 한국어 텍스트를 입력해주세요.");
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
        e instanceof Error ? e.message : "Technical English 변환에 실패했습니다."
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
      setError("변환할 소스 텍스트를 입력해주세요.");
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
        e instanceof Error ? e.message : "영문 문서 변환에 실패했습니다."
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleGlobalReview(payload: LanguageQualityReviewPayload) {
    if (!payload.englishText.trim()) {
      setError("리뷰할 영문 텍스트가 없습니다. 먼저 변환을 실행해주세요.");
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
      setError(e instanceof Error ? e.message : "언어 품질 리뷰에 실패했습니다.");
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
          `   - Reason: ${q.reason}`,
          `   - Priority: ${q.priority}`,
        ];
        if (q.owner) lines.push(`   - Owner: ${q.owner}`);
        if (q.answer) lines.push(`   - Answer: ${q.answer}`);
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

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      {/* Top-level mode navigation */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center gap-1 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setAppMode("workspace")}
            className={`-mb-px border-b-2 px-3 py-3 text-sm font-medium transition ${
              appMode === "workspace"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            API Workspace
          </button>
          <button
            type="button"
            onClick={() => setAppMode("global")}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition ${
              appMode === "global"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Global Docs Mode
            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 ring-1 ring-inset ring-brand-200">
              KO → EN
            </span>
          </button>
          <button
            type="button"
            onClick={() => setAppMode("loop")}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition ${
              appMode === "loop"
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Improvement Loop
            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 ring-1 ring-inset ring-brand-200">
              Loop
            </span>
          </button>
        </div>
      </div>

      {/* Action toolbar (API Workspace only) */}
      {appMode === "workspace" && (
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
          <ActionButton variant="secondary" onClick={loadSample} disabled={isBusy}>
            Load Sample API
          </ActionButton>
          <ActionButton
            variant="primary"
            onClick={handleAnalyze}
            loading={busy === "analyze"}
            loadingText={LOADING_LABELS.analyze}
            disabled={isBusy}
          >
            Analyze API
          </ActionButton>
          <ActionButton
            onClick={handleMissingInfo}
            loading={busy === "missing_info"}
            loadingText={LOADING_LABELS.missing_info}
            disabled={isBusy || !project}
          >
            Find Missing Info
          </ActionButton>
          <ActionButton
            onClick={handleEngineerQuestions}
            loading={busy === "engineer_questions"}
            loadingText={LOADING_LABELS.engineer_questions}
            disabled={isBusy || !project}
          >
            Generate Engineer Questions
          </ActionButton>
          <ActionButton
            onClick={handleGenerateDoc}
            loading={busy === "generate_doc"}
            loadingText={LOADING_LABELS.generate_doc}
            disabled={isBusy || !project}
          >
            Generate Documentation
          </ActionButton>
          <ActionButton
            onClick={handleReviewDoc}
            loading={busy === "review_doc"}
            loadingText={LOADING_LABELS.review_doc}
            disabled={isBusy || !project?.docDraftMarkdown}
          >
            Review Documentation
          </ActionButton>
          <div className="ml-auto">
            <ActionButton variant="danger" onClick={reset} disabled={isBusy}>
              Reset
            </ActionButton>
          </div>
        </div>
      </div>
      )}

      {error && (
        <div className="mx-auto max-w-[1600px] px-4 pt-3 sm:px-6">
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <span className="font-medium">오류:</span>
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-600"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {appMode === "global" && (
        <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
          <GlobalDocsMode
            result={globalResult}
            converting={busy === "global_docs_convert"}
            reviewing={busy === "language_quality_review"}
            canApply
            onConvert={handleGlobalConvert}
            onReview={handleGlobalReview}
            onApply={applyEnglishToDraft}
          />
        </main>
      )}

      {appMode === "loop" && (
        <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
          <DocumentationImprovementLoop
            project={project}
            currentDraft={project?.docDraftMarkdown ?? ""}
            targetReader={form.targetReader}
            onApplyToMainDraft={(text) => applyDraftToMain(text, "replace")}
          />
        </main>
      )}

      {/* 3-column layout */}
      {appMode === "workspace" && (
      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-4 sm:px-6 lg:grid-cols-12">
        {/* LEFT: input */}
        <div className="space-y-3 lg:col-span-4">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            1 · API Input
          </h2>

          <SectionCard
            title="Technical English Coach"
            description="한국어 API 설명을 개발자용 영어로 변환하고 표현을 코치합니다"
            defaultOpen={false}
          >
            <TechnicalEnglishCoach
              result={coachResult}
              loading={busy === "technical_english_coach"}
              canApply={!!project}
              onConvert={handleTechnicalEnglish}
              onApply={applyEnglishToDraft}
            />
          </SectionCard>

          <SectionCard title="Raw API Notes" description="엔지니어에게 받은 원본 정보를 붙여넣으세요">
            <TextAreaField
              label="Raw notes"
              value={form.rawNotes}
              onChange={(v) => setField("rawNotes", v)}
              rows={8}
              mono
              placeholder="엔지니어가 공유한 API 설명, 예시, 메모 등을 그대로 붙여넣으세요…"
            />
          </SectionCard>

          <SectionCard title="Basic Info">
            <InputField
              label="Feature name"
              value={form.featureName}
              onChange={(v) => setField("featureName", v)}
              placeholder="Create a user"
            />
            <InputField
              label="Endpoint title"
              value={form.endpointTitle}
              onChange={(v) => setField("endpointTitle", v)}
              placeholder="Create a user"
            />
            <InputField
              label="Product area"
              value={form.productArea}
              onChange={(v) => setField("productArea", v)}
              placeholder="Chat Platform API"
            />
            <SelectField
              label="Target reader"
              value={form.targetReader}
              onChange={(v) => setField("targetReader", v as RawFormInput["targetReader"])}
              options={[
                { value: "beginner", label: "Beginner developer" },
                { value: "frontend", label: "Frontend developer" },
                { value: "backend", label: "Backend developer" },
                { value: "technical_writer", label: "Technical writer" },
              ]}
            />
            <TextAreaField
              label="Use case"
              value={form.useCase}
              onChange={(v) => setField("useCase", v)}
              rows={2}
              placeholder="Create a user before starting a chat"
            />
          </SectionCard>

          <SectionCard title="Endpoint">
            <SelectField
              label="HTTP method"
              value={form.method}
              onChange={(v) => setField("method", v as RawFormInput["method"])}
              options={[
                { value: "GET", label: "GET" },
                { value: "POST", label: "POST" },
                { value: "PUT", label: "PUT" },
                { value: "PATCH", label: "PATCH" },
                { value: "DELETE", label: "DELETE" },
              ]}
            />
            <InputField
              label="Endpoint URL"
              value={form.endpointUrl}
              onChange={(v) => setField("endpointUrl", v)}
              placeholder="/v3/users"
            />
            <TextAreaField
              label="Description"
              value={form.description}
              onChange={(v) => setField("description", v)}
              rows={2}
              placeholder="Creates a new user in the application."
            />
          </SectionCard>

          <SectionCard title="Authentication & Headers" defaultOpen={false}>
            <SelectField
              label="Authentication type"
              value={form.authType}
              onChange={(v) => setField("authType", v as RawFormInput["authType"])}
              options={[
                { value: "api_token", label: "API token" },
                { value: "bearer_token", label: "Bearer token" },
                { value: "none", label: "None" },
                { value: "unknown", label: "Unknown" },
              ]}
            />
            <TextAreaField
              label="Required headers"
              value={form.requiredHeaders}
              onChange={(v) => setField("requiredHeaders", v)}
              rows={3}
              mono
              placeholder={"Content-Type: application/json\nApi-Token: {your_api_token}"}
            />
            <TextAreaField
              label="Optional headers"
              value={form.optionalHeaders}
              onChange={(v) => setField("optionalHeaders", v)}
              rows={2}
              mono
            />
            <TextAreaField
              label="Security note"
              value={form.securityNote}
              onChange={(v) => setField("securityNote", v)}
              rows={2}
              placeholder="API token must stay server-side."
            />
          </SectionCard>

          <SectionCard title="Request" defaultOpen={false}>
            <TextAreaField
              label="Path parameters"
              value={form.pathParams}
              onChange={(v) => setField("pathParams", v)}
              rows={2}
              mono
            />
            <TextAreaField
              label="Query parameters"
              value={form.queryParams}
              onChange={(v) => setField("queryParams", v)}
              rows={2}
              mono
            />
            <TextAreaField
              label="Request body"
              value={form.requestBody}
              onChange={(v) => setField("requestBody", v)}
              rows={4}
              mono
            />
            <TextAreaField
              label="Example request"
              value={form.exampleRequest}
              onChange={(v) => setField("exampleRequest", v)}
              rows={4}
              mono
            />
          </SectionCard>

          <SectionCard title="Response" defaultOpen={false}>
            <InputField
              label="Success status code"
              value={form.successStatus}
              onChange={(v) => setField("successStatus", v)}
              placeholder="200"
            />
            <TextAreaField
              label="Response body"
              value={form.responseBody}
              onChange={(v) => setField("responseBody", v)}
              rows={4}
              mono
            />
            <TextAreaField
              label="Example response"
              value={form.exampleResponse}
              onChange={(v) => setField("exampleResponse", v)}
              rows={4}
              mono
            />
          </SectionCard>

          <SectionCard title="Errors" defaultOpen={false}>
            <TextAreaField
              label="Error cases"
              value={form.errorCases}
              onChange={(v) => setField("errorCases", v)}
              rows={4}
              mono
              placeholder={"400 Bad Request: missing required field\n401 Unauthorized: invalid API token"}
            />
          </SectionCard>

          <SectionCard title="Operational Notes" defaultOpen={false}>
            <InputField
              label="Rate limit"
              value={form.rateLimit}
              onChange={(v) => setField("rateLimit", v)}
            />
            <InputField
              label="Pagination"
              value={form.pagination}
              onChange={(v) => setField("pagination", v)}
            />
            <InputField
              label="Webhook event"
              value={form.webhook}
              onChange={(v) => setField("webhook", v)}
            />
            <InputField
              label="Retry behavior"
              value={form.retryBehavior}
              onChange={(v) => setField("retryBehavior", v)}
            />
            <InputField
              label="Idempotency"
              value={form.idempotency}
              onChange={(v) => setField("idempotency", v)}
            />
          </SectionCard>
        </div>

        {/* MIDDLE: structured summary */}
        <div className="space-y-3 lg:col-span-4">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            2 · Structured API Summary
          </h2>

          {busy === "analyze" && <LoadingState label={LOADING_LABELS.analyze} />}

          <SectionCard title="Structured API Summary" collapsible={false}>
            <StructuredSummary project={project} />
          </SectionCard>

          <SectionCard title="Missing Information">
            {busy === "missing_info" ? (
              <LoadingState label={LOADING_LABELS.missing_info} />
            ) : (
              <MissingInfoList items={project?.missingInfo ?? []} />
            )}
          </SectionCard>

          <SectionCard title="Engineer Questions">
            {busy === "engineer_questions" ? (
              <LoadingState label={LOADING_LABELS.engineer_questions} />
            ) : (
              <EngineerQuestionsPanel
                questions={project?.engineerQuestions ?? []}
                onUpdate={updateQuestion}
                onCopyAll={copyEngineerQuestions}
              />
            )}
          </SectionCard>
        </div>

        {/* RIGHT: documentation output */}
        <div className="space-y-3 lg:col-span-4">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            3 · Documentation Output
          </h2>

          <SectionCard title="Documentation Draft" collapsible={false}>
            <div className="mb-3 flex flex-wrap gap-2">
              <ActionButton
                variant="primary"
                size="sm"
                onClick={() => setAppMode("loop")}
                disabled={!project?.docDraftMarkdown?.trim()}
                title="Improvement Loop 탭에서 문서 품질을 반복 개선합니다"
              >
                Run Improvement Loop
              </ActionButton>
            </div>
            {busy === "generate_doc" ? (
              <LoadingState label={LOADING_LABELS.generate_doc} />
            ) : (
              <MarkdownOutput
                markdown={project?.docDraftMarkdown ?? ""}
                onChange={updateDoc}
                fileBaseName={
                  (project?.title || "api-documentation")
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/^-+|-+$/g, "") || "api-documentation"
                }
              />
            )}
          </SectionCard>

          <SectionCard title="AI Review">
            {busy === "review_doc" ? (
              <LoadingState label={LOADING_LABELS.review_doc} />
            ) : (
              <ReviewIssuesPanel
                issues={project?.reviewIssues ?? []}
                hasReviewed={hasReviewed}
              />
            )}
          </SectionCard>
        </div>
      </main>
      )}

      <footer className="mx-auto max-w-[1600px] px-4 pb-8 pt-2 text-center text-xs text-slate-400 sm:px-6">
        API Doc Workspace · Technical Writer를 대체하지 않고, 더 빠르게 일하도록
        돕습니다.
      </footer>
    </div>
  );
}
