"use client";

import { useMemo, useState } from "react";
import {
  FileInput,
  BookMarked,
  Globe,
  Languages,
  ListTree,
  ArrowDownToLine,
  AlertTriangle,
  ScanSearch,
  SearchX,
  MessagesSquare,
  FileText,
} from "lucide-react";
import type { AiAction, RawFormInput } from "@/lib/types";
import GlobalDocsMode from "@/components/GlobalDocsMode";
import TechnicalEnglishCoach from "@/components/TechnicalEnglishCoach";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import { StyleGuidePanel } from "./style-guide-panel";
import type {
  GlobalDocsConvertPayload,
  GlobalDocsResult,
  LanguageQualityReviewPayload,
  TechnicalEnglishPayload,
  TechnicalEnglishResult,
} from "@/lib/types";
import {
  ActionButton,
  Collapsible,
  InputField,
  SelectField,
  Tabs,
  TextAreaField,
} from "./primitives";

type ApiSourcePanelProps = {
  form: RawFormInput;
  setField: <K extends keyof RawFormInput>(key: K, value: RawFormInput[K]) => void;
  busy: AiAction | null;
  isBusy: boolean;
  hasProject: boolean;
  readerOptions: { value: string; label: string }[];
  authOptions: { value: string; label: string }[];
  loadingLabel: (action: AiAction) => string;
  onAnalyze: () => void;
  onMissingInfo: () => void;
  onEngineerQuestions: () => void;
  onGenerateDoc: () => void;
  coachResult: TechnicalEnglishResult | null;
  onGlobalConvert: (payload: GlobalDocsConvertPayload) => void;
  onGlobalReview: (payload: LanguageQualityReviewPayload) => void;
  onApplyGlobal: (text: string) => void;
  globalResult: GlobalDocsResult | null;
  onTechnicalEnglish: (payload: TechnicalEnglishPayload) => void;
  onApplyEnglish: (text: string) => void;
};

function ApiInputTab({
  form,
  setField,
  busy,
  isBusy,
  hasProject,
  readerOptions,
  authOptions,
  loadingLabel,
  onAnalyze,
  onMissingInfo,
  onEngineerQuestions,
  onGenerateDoc,
}: Pick<
  ApiSourcePanelProps,
  | "form"
  | "setField"
  | "busy"
  | "isBusy"
  | "hasProject"
  | "readerOptions"
  | "authOptions"
  | "loadingLabel"
  | "onAnalyze"
  | "onMissingInfo"
  | "onEngineerQuestions"
  | "onGenerateDoc"
>) {
  const { t } = useAppPreferences();

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary-soft via-card to-surface-subtle p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <FileInput className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary-dark">
              {t("processGuide.eyebrow")}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight text-foreground">
              {t("processGuide.title")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {t("processGuide.desc")}
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {[
            t("processGuide.stepPaste"),
            t("processGuide.stepAnalyze"),
            t("processGuide.stepAsk"),
            t("processGuide.stepDraft"),
          ].map((step, index) => (
            <div
              key={step}
              className="rounded-xl border border-border bg-card/80 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="inline-flex h-7 w-7 animate-pulse items-center justify-center rounded-full bg-primary-soft text-xs font-black text-primary-dark">
                {index + 1}
              </span>
              <p className="mt-2 text-xs font-bold leading-5 text-foreground">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      <TextAreaField
        label={t("api.rawNotesLabel")}
        rows={5}
        value={form.rawNotes}
        onChange={(e) => setField("rawNotes", e.target.value)}
        placeholder={t("api.rawNotesPlaceholder")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          label={t("api.featureName")}
          value={form.featureName}
          onChange={(e) => setField("featureName", e.target.value)}
          placeholder={t("api.placeholderFeatureName")}
        />
        <SelectField
          label={t("api.httpMethod")}
          value={form.method}
          onChange={(e) => setField("method", e.target.value as RawFormInput["method"])}
          options={["GET", "POST", "PUT", "PATCH", "DELETE"]}
        />
      </div>

      <InputField
        label={t("api.endpointUrl")}
        mono
        value={form.endpointUrl}
        onChange={(e) => setField("endpointUrl", e.target.value)}
        placeholder={t("api.placeholderEndpointUrl")}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          label={t("api.productArea")}
          value={form.productArea}
          onChange={(e) => setField("productArea", e.target.value)}
          placeholder={t("api.placeholderProductArea")}
        />
        <SelectField
          label={t("api.targetReader")}
          value={form.targetReader}
          onChange={(e) =>
            setField("targetReader", e.target.value as RawFormInput["targetReader"])
          }
          options={readerOptions}
        />
      </div>

      <TextAreaField
        label={t("api.description")}
        rows={2}
        value={form.description}
        onChange={(e) => setField("description", e.target.value)}
        placeholder={t("api.placeholderDescription")}
      />

      <SelectField
        label={t("api.authType")}
        value={form.authType}
        onChange={(e) => setField("authType", e.target.value as RawFormInput["authType"])}
        options={authOptions}
      />

      <Collapsible
        title={t("workspace.requestDetails")}
        icon={<ArrowDownToLine className="h-4 w-4 text-primary" />}
      >
        <TextAreaField
          label={t("api.pathParams")}
          mono
          rows={2}
          value={form.pathParams}
          onChange={(e) => setField("pathParams", e.target.value)}
        />
        <TextAreaField
          label={t("api.queryParams")}
          mono
          rows={2}
          value={form.queryParams}
          onChange={(e) => setField("queryParams", e.target.value)}
        />
        <TextAreaField
          label={t("api.requestBody")}
          mono
          rows={3}
          value={form.requestBody}
          onChange={(e) => setField("requestBody", e.target.value)}
        />
        <TextAreaField
          label={t("api.exampleRequest")}
          mono
          rows={3}
          value={form.exampleRequest}
          onChange={(e) => setField("exampleRequest", e.target.value)}
        />
      </Collapsible>

      <Collapsible
        title={t("workspace.responseDetails")}
        icon={<ListTree className="h-4 w-4 text-primary" />}
      >
        <InputField
          label={t("api.successStatus")}
          mono
          value={form.successStatus}
          onChange={(e) => setField("successStatus", e.target.value)}
          placeholder="200"
        />
        <TextAreaField
          label={t("api.responseBody")}
          mono
          rows={3}
          value={form.responseBody}
          onChange={(e) => setField("responseBody", e.target.value)}
        />
        <TextAreaField
          label={t("api.exampleResponse")}
          mono
          rows={3}
          value={form.exampleResponse}
          onChange={(e) => setField("exampleResponse", e.target.value)}
        />
      </Collapsible>

      <Collapsible
        title={t("workspace.errorsOperations")}
        icon={<AlertTriangle className="h-4 w-4 text-primary" />}
      >
        <TextAreaField
          label={t("api.errorCases")}
          mono
          rows={3}
          value={form.errorCases}
          onChange={(e) => setField("errorCases", e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField
            label={t("api.rateLimit")}
            value={form.rateLimit}
            onChange={(e) => setField("rateLimit", e.target.value)}
          />
          <InputField
            label={t("api.pagination")}
            value={form.pagination}
            onChange={(e) => setField("pagination", e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField
            label={t("api.webhook")}
            value={form.webhook}
            onChange={(e) => setField("webhook", e.target.value)}
          />
          <InputField
            label={t("api.retryBehavior")}
            value={form.retryBehavior}
            onChange={(e) => setField("retryBehavior", e.target.value)}
          />
        </div>
      </Collapsible>

      <div className="grid gap-2 sm:grid-cols-2">
        <ActionButton
          variant="secondary"
          icon={<ScanSearch className="h-4 w-4" />}
          loading={busy === "analyze"}
          loadingLabel={loadingLabel("analyze")}
          disabled={isBusy}
          onClick={onAnalyze}
        >
          {t("api.analyze")}
        </ActionButton>
        <ActionButton
          variant="secondary"
          icon={<SearchX className="h-4 w-4" />}
          loading={busy === "missing_info"}
          loadingLabel={loadingLabel("missing_info")}
          disabled={isBusy || !hasProject}
          onClick={onMissingInfo}
        >
          {t("api.missingInfo")}
        </ActionButton>
        <ActionButton
          variant="secondary"
          icon={<MessagesSquare className="h-4 w-4" />}
          loading={busy === "engineer_questions"}
          loadingLabel={loadingLabel("engineer_questions")}
          disabled={isBusy || !hasProject}
          onClick={onEngineerQuestions}
        >
          {t("api.engineerQuestions")}
        </ActionButton>
        <ActionButton
          icon={<FileText className="h-4 w-4" />}
          loading={busy === "generate_doc"}
          loadingLabel={loadingLabel("generate_doc")}
          disabled={isBusy || !hasProject}
          onClick={onGenerateDoc}
        >
          {t("api.generateDoc")}
        </ActionButton>
      </div>
    </div>
  );
}

export function ApiSourcePanel(props: ApiSourcePanelProps) {
  const [tab, setTab] = useState("input");
  const { busy } = props;
  const { t } = useAppPreferences();

  const tabs = useMemo(
    () => [
      { id: "input", label: t("workspace.tabInput"), icon: <FileInput className="h-3.5 w-3.5" /> },
      { id: "style", label: t("workspace.tabStyle"), icon: <BookMarked className="h-3.5 w-3.5" /> },
      { id: "global", label: t("workspace.tabGlobal"), icon: <Globe className="h-3.5 w-3.5" /> },
      {
        id: "english",
        label: t("workspace.tabEnglish"),
        icon: <Languages className="h-3.5 w-3.5" />,
      },
    ],
    [t]
  );

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-sm shadow-primary/5">
      <div className="border-b border-border p-3">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {t("workspace.apiSource")}
        </p>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>
      <div className="premium-content p-4 sm:p-5">
        {tab === "input" && <ApiInputTab {...props} />}
        {tab === "style" && <StyleGuidePanel />}
        {tab === "global" && (
          <GlobalDocsMode
            result={props.globalResult}
            converting={busy === "global_docs_convert"}
            reviewing={busy === "language_quality_review"}
            canApply
            onConvert={props.onGlobalConvert}
            onReview={props.onGlobalReview}
            onApply={props.onApplyGlobal}
          />
        )}
        {tab === "english" && (
          <TechnicalEnglishCoach
            result={props.coachResult}
            loading={busy === "technical_english_coach"}
            canApply={props.hasProject}
            onConvert={props.onTechnicalEnglish}
            onApply={props.onApplyEnglish}
          />
        )}
      </div>
    </div>
  );
}
