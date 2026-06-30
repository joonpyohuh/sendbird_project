"use client";

import { useEffect, useState } from "react";
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
import PremiumShell from "@/components/shell/PremiumShell";
import BentoGuide from "@/components/shell/BentoGuide";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import type { ActiveTab } from "@/components/shell/types";
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

export default function Page() {
  const { t } = useAppPreferences();
  const [form, setForm] = useState<RawFormInput>(EMPTY_FORM);
  const [project, setProject] = useState<ApiDocProject | null>(null);
  const [busy, setBusy] = useState<AiAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [coachResult, setCoachResult] = useState<TechnicalEnglishResult | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>(null);
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

  const loadingLabel = (action: AiAction) => t(`loading.${action}`);

  const apiBento = [
    { label: t("bento.api.step1Label"), value: t("bento.api.step1Value") },
    { label: t("bento.api.step2Label"), value: t("bento.api.step2Value") },
    { label: t("bento.api.step3Label"), value: t("bento.api.step3Value") },
  ];

  const docsBento = [
    { label: t("bento.docs.workflowLabel"), value: t("bento.docs.workflowValue") },
    { label: t("bento.docs.convertLabel"), value: t("bento.docs.convertValue") },
    { label: t("bento.docs.qualityLabel"), value: t("bento.docs.qualityValue") },
  ];

  const loopBento = [
    { label: t("bento.loop.reviewLabel"), value: t("bento.loop.reviewValue") },
    { label: t("bento.loop.patchLabel"), value: t("bento.loop.patchValue") },
    { label: t("bento.loop.targetLabel"), value: t("bento.loop.targetValue") },
  ];

  const readerOptions = [
    { value: "beginner", label: t("api.readerBeginner") },
    { value: "frontend", label: t("api.readerFrontend") },
    { value: "backend", label: t("api.readerBackend") },
    { value: "technical_writer", label: t("api.readerTw") },
  ];

  const authOptions = [
    { value: "api_token", label: t("api.authApiToken") },
    { value: "bearer_token", label: t("api.authBearer") },
    { value: "none", label: t("api.authNone") },
    { value: "unknown", label: t("api.authUnknown") },
  ];

  return (
    <PremiumShell
      activeTab={activeTab}
      onTabChange={setActiveTab}
      error={error}
      onDismissError={() => setError(null)}
    >
      {activeTab === "api" && (
        <>
          <BentoGuide items={apiBento} />

          <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800/70 dark:bg-slate-900/20">
            <ActionButton variant="secondary" onClick={loadSample} disabled={isBusy}>
              {t("api.loadSample")}
            </ActionButton>
            <ActionButton
              variant="primary"
              onClick={handleAnalyze}
              loading={busy === "analyze"}
              loadingText={loadingLabel("analyze")}
              disabled={isBusy}
            >
              {t("api.analyze")}
            </ActionButton>
            <ActionButton
              onClick={handleMissingInfo}
              loading={busy === "missing_info"}
              loadingText={loadingLabel("missing_info")}
              disabled={isBusy || !project}
            >
              {t("api.missingInfo")}
            </ActionButton>
            <ActionButton
              onClick={handleEngineerQuestions}
              loading={busy === "engineer_questions"}
              loadingText={loadingLabel("engineer_questions")}
              disabled={isBusy || !project}
            >
              {t("api.engineerQuestions")}
            </ActionButton>
            <ActionButton
              onClick={handleGenerateDoc}
              loading={busy === "generate_doc"}
              loadingText={loadingLabel("generate_doc")}
              disabled={isBusy || !project}
            >
              {t("api.generateDoc")}
            </ActionButton>
            <ActionButton
              onClick={handleReviewDoc}
              loading={busy === "review_doc"}
              loadingText={loadingLabel("review_doc")}
              disabled={isBusy || !project?.docDraftMarkdown}
            >
              {t("api.reviewDoc")}
            </ActionButton>
            <div className="ml-auto">
              <ActionButton variant="danger" onClick={reset} disabled={isBusy}>
                {t("api.reset")}
              </ActionButton>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* LEFT: input */}
        <div className="space-y-3 lg:col-span-4">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("api.colInput")}
          </h2>

          <SectionCard
            title={t("api.coachTitle")}
            description={t("api.coachDesc")}
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

          <SectionCard title={t("api.rawNotesTitle")} description={t("api.rawNotesDesc")}>
            <TextAreaField
              label={t("api.rawNotesLabel")}
              value={form.rawNotes}
              onChange={(v) => setField("rawNotes", v)}
              rows={8}
              mono
              placeholder={t("api.rawNotesPlaceholder")}
            />
          </SectionCard>

          <SectionCard title={t("api.basicInfo")}>
            <InputField
              label={t("api.featureName")}
              value={form.featureName}
              onChange={(v) => setField("featureName", v)}
              placeholder="Create a user"
            />
            <InputField
              label={t("api.endpointTitle")}
              value={form.endpointTitle}
              onChange={(v) => setField("endpointTitle", v)}
              placeholder="Create a user"
            />
            <InputField
              label={t("api.productArea")}
              value={form.productArea}
              onChange={(v) => setField("productArea", v)}
              placeholder="Chat Platform API"
            />
            <SelectField
              label={t("api.targetReader")}
              value={form.targetReader}
              onChange={(v) => setField("targetReader", v as RawFormInput["targetReader"])}
              options={readerOptions}
            />
            <TextAreaField
              label={t("api.useCase")}
              value={form.useCase}
              onChange={(v) => setField("useCase", v)}
              rows={2}
              placeholder="Create a user before starting a chat"
            />
          </SectionCard>

          <SectionCard title={t("api.endpoint")}>
            <SelectField
              label={t("api.httpMethod")}
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
              label={t("api.endpointUrl")}
              value={form.endpointUrl}
              onChange={(v) => setField("endpointUrl", v)}
              placeholder="/v3/users"
            />
            <TextAreaField
              label={t("api.description")}
              value={form.description}
              onChange={(v) => setField("description", v)}
              rows={2}
              placeholder="Creates a new user in the application."
            />
          </SectionCard>

          <SectionCard title={t("api.authHeaders")} defaultOpen={false}>
            <SelectField
              label={t("api.authType")}
              value={form.authType}
              onChange={(v) => setField("authType", v as RawFormInput["authType"])}
              options={authOptions}
            />
            <TextAreaField
              label={t("api.requiredHeaders")}
              value={form.requiredHeaders}
              onChange={(v) => setField("requiredHeaders", v)}
              rows={3}
              mono
              placeholder={"Content-Type: application/json\nApi-Token: {your_api_token}"}
            />
            <TextAreaField
              label={t("api.optionalHeaders")}
              value={form.optionalHeaders}
              onChange={(v) => setField("optionalHeaders", v)}
              rows={2}
              mono
            />
            <TextAreaField
              label={t("api.securityNote")}
              value={form.securityNote}
              onChange={(v) => setField("securityNote", v)}
              rows={2}
              placeholder="API token must stay server-side."
            />
          </SectionCard>

          <SectionCard title={t("api.request")} defaultOpen={false}>
            <TextAreaField
              label={t("api.pathParams")}
              value={form.pathParams}
              onChange={(v) => setField("pathParams", v)}
              rows={2}
              mono
            />
            <TextAreaField
              label={t("api.queryParams")}
              value={form.queryParams}
              onChange={(v) => setField("queryParams", v)}
              rows={2}
              mono
            />
            <TextAreaField
              label={t("api.requestBody")}
              value={form.requestBody}
              onChange={(v) => setField("requestBody", v)}
              rows={4}
              mono
            />
            <TextAreaField
              label={t("api.exampleRequest")}
              value={form.exampleRequest}
              onChange={(v) => setField("exampleRequest", v)}
              rows={4}
              mono
            />
          </SectionCard>

          <SectionCard title={t("api.response")} defaultOpen={false}>
            <InputField
              label={t("api.successStatus")}
              value={form.successStatus}
              onChange={(v) => setField("successStatus", v)}
              placeholder="200"
            />
            <TextAreaField
              label={t("api.responseBody")}
              value={form.responseBody}
              onChange={(v) => setField("responseBody", v)}
              rows={4}
              mono
            />
            <TextAreaField
              label={t("api.exampleResponse")}
              value={form.exampleResponse}
              onChange={(v) => setField("exampleResponse", v)}
              rows={4}
              mono
            />
          </SectionCard>

          <SectionCard title={t("api.errors")} defaultOpen={false}>
            <TextAreaField
              label={t("api.errorCases")}
              value={form.errorCases}
              onChange={(v) => setField("errorCases", v)}
              rows={4}
              mono
              placeholder={"400 Bad Request: missing required field\n401 Unauthorized: invalid API token"}
            />
          </SectionCard>

          <SectionCard title={t("api.operationalNotes")} defaultOpen={false}>
            <InputField
              label={t("api.rateLimit")}
              value={form.rateLimit}
              onChange={(v) => setField("rateLimit", v)}
            />
            <InputField
              label={t("api.pagination")}
              value={form.pagination}
              onChange={(v) => setField("pagination", v)}
            />
            <InputField
              label={t("api.webhook")}
              value={form.webhook}
              onChange={(v) => setField("webhook", v)}
            />
            <InputField
              label={t("api.retryBehavior")}
              value={form.retryBehavior}
              onChange={(v) => setField("retryBehavior", v)}
            />
            <InputField
              label={t("api.idempotency")}
              value={form.idempotency}
              onChange={(v) => setField("idempotency", v)}
            />
          </SectionCard>
        </div>

        {/* MIDDLE: structured summary */}
        <div className="space-y-3 lg:col-span-4">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("api.colSummary")}
          </h2>

          {busy === "analyze" && <LoadingState label={loadingLabel("analyze")} />}

          <SectionCard title={t("api.structuredSummary")} collapsible={false}>
            <StructuredSummary project={project} />
          </SectionCard>

          <SectionCard title={t("api.missingInformation")}>
            {busy === "missing_info" ? (
              <LoadingState label={loadingLabel("missing_info")} />
            ) : (
              <MissingInfoList items={project?.missingInfo ?? []} />
            )}
          </SectionCard>

          <SectionCard title={t("api.engineerQuestions")}>
            {busy === "engineer_questions" ? (
              <LoadingState label={loadingLabel("engineer_questions")} />
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
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("api.colOutput")}
          </h2>

          <SectionCard title={t("api.documentationDraft")} collapsible={false}>
            <div className="mb-3 flex flex-wrap gap-2">
              <ActionButton
                variant="primary"
                size="sm"
                onClick={() => setActiveTab("loop")}
                disabled={!project?.docDraftMarkdown?.trim()}
                title={t("api.runLoopTitle")}
              >
                {t("api.runLoop")}
              </ActionButton>
            </div>
            {busy === "generate_doc" ? (
              <LoadingState label={loadingLabel("generate_doc")} />
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

          <SectionCard title={t("api.aiReview")}>
            {busy === "review_doc" ? (
              <LoadingState label={loadingLabel("review_doc")} />
            ) : (
              <ReviewIssuesPanel
                issues={project?.reviewIssues ?? []}
                hasReviewed={hasReviewed}
              />
            )}
          </SectionCard>
        </div>
          </div>
        </>
      )}

      {activeTab === "docs" && (
        <>
          <BentoGuide items={docsBento} />
          <GlobalDocsMode
            result={globalResult}
            converting={busy === "global_docs_convert"}
            reviewing={busy === "language_quality_review"}
            canApply
            onConvert={handleGlobalConvert}
            onReview={handleGlobalReview}
            onApply={applyEnglishToDraft}
          />
        </>
      )}

      {activeTab === "loop" && (
        <>
          <BentoGuide items={loopBento} />
          <DocumentationImprovementLoop
            project={project}
            currentDraft={project?.docDraftMarkdown ?? ""}
            targetReader={form.targetReader}
            onApplyToMainDraft={(text) => applyDraftToMain(text, "replace")}
          />
        </>
      )}
    </PremiumShell>
  );
}
