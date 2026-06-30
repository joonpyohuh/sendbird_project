"use client";

import { useState } from "react";
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

const tabs = [
  { id: "input", label: "API Input", icon: <FileInput className="h-3.5 w-3.5" /> },
  { id: "style", label: "Style Guide", icon: <BookMarked className="h-3.5 w-3.5" /> },
  { id: "global", label: "Global Docs", icon: <Globe className="h-3.5 w-3.5" /> },
  { id: "english", label: "Technical English", icon: <Languages className="h-3.5 w-3.5" /> },
];

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
  return (
    <div className="space-y-4">
      <TextAreaField
        label="Raw API notes"
        rows={5}
        value={form.rawNotes}
        onChange={(e) => setField("rawNotes", e.target.value)}
        placeholder="Paste raw API notes from engineers. Korean or English is fine."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          label="Feature name"
          value={form.featureName}
          onChange={(e) => setField("featureName", e.target.value)}
          placeholder="Create a user"
        />
        <SelectField
          label="HTTP method"
          value={form.method}
          onChange={(e) => setField("method", e.target.value as RawFormInput["method"])}
          options={["GET", "POST", "PUT", "PATCH", "DELETE"]}
        />
      </div>

      <InputField
        label="Endpoint URL"
        mono
        value={form.endpointUrl}
        onChange={(e) => setField("endpointUrl", e.target.value)}
        placeholder="/v3/users"
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <InputField
          label="Product area"
          value={form.productArea}
          onChange={(e) => setField("productArea", e.target.value)}
          placeholder="User management"
        />
        <SelectField
          label="Target reader"
          value={form.targetReader}
          onChange={(e) =>
            setField("targetReader", e.target.value as RawFormInput["targetReader"])
          }
          options={readerOptions}
        />
      </div>

      <TextAreaField
        label="Description"
        rows={2}
        value={form.description}
        onChange={(e) => setField("description", e.target.value)}
        placeholder="Creates a new user in the application."
      />

      <SelectField
        label="Authentication type"
        value={form.authType}
        onChange={(e) => setField("authType", e.target.value as RawFormInput["authType"])}
        options={authOptions}
      />

      <Collapsible title="Request Details" icon={<ArrowDownToLine className="h-4 w-4 text-primary" />}>
        <TextAreaField
          label="Path parameters"
          mono
          rows={2}
          value={form.pathParams}
          onChange={(e) => setField("pathParams", e.target.value)}
        />
        <TextAreaField
          label="Query parameters"
          mono
          rows={2}
          value={form.queryParams}
          onChange={(e) => setField("queryParams", e.target.value)}
        />
        <TextAreaField
          label="Request body"
          mono
          rows={3}
          value={form.requestBody}
          onChange={(e) => setField("requestBody", e.target.value)}
        />
        <TextAreaField
          label="Example request"
          mono
          rows={3}
          value={form.exampleRequest}
          onChange={(e) => setField("exampleRequest", e.target.value)}
        />
      </Collapsible>

      <Collapsible title="Response Details" icon={<ListTree className="h-4 w-4 text-primary" />}>
        <InputField
          label="Success status code"
          mono
          value={form.successStatus}
          onChange={(e) => setField("successStatus", e.target.value)}
          placeholder="200"
        />
        <TextAreaField
          label="Response body"
          mono
          rows={3}
          value={form.responseBody}
          onChange={(e) => setField("responseBody", e.target.value)}
        />
        <TextAreaField
          label="Example response"
          mono
          rows={3}
          value={form.exampleResponse}
          onChange={(e) => setField("exampleResponse", e.target.value)}
        />
      </Collapsible>

      <Collapsible title="Errors & Operations" icon={<AlertTriangle className="h-4 w-4 text-primary" />}>
        <TextAreaField
          label="Error cases"
          mono
          rows={3}
          value={form.errorCases}
          onChange={(e) => setField("errorCases", e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField
            label="Rate limit"
            value={form.rateLimit}
            onChange={(e) => setField("rateLimit", e.target.value)}
          />
          <InputField
            label="Pagination"
            value={form.pagination}
            onChange={(e) => setField("pagination", e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <InputField
            label="Webhook event"
            value={form.webhook}
            onChange={(e) => setField("webhook", e.target.value)}
          />
          <InputField
            label="Retry behavior"
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
          Analyze API
        </ActionButton>
        <ActionButton
          variant="secondary"
          icon={<SearchX className="h-4 w-4" />}
          loading={busy === "missing_info"}
          loadingLabel={loadingLabel("missing_info")}
          disabled={isBusy || !hasProject}
          onClick={onMissingInfo}
        >
          Find Missing Info
        </ActionButton>
        <ActionButton
          variant="secondary"
          icon={<MessagesSquare className="h-4 w-4" />}
          loading={busy === "engineer_questions"}
          loadingLabel={loadingLabel("engineer_questions")}
          disabled={isBusy || !hasProject}
          onClick={onEngineerQuestions}
        >
          Generate Engineer Questions
        </ActionButton>
        <ActionButton
          icon={<FileText className="h-4 w-4" />}
          loading={busy === "generate_doc"}
          loadingLabel={loadingLabel("generate_doc")}
          disabled={isBusy || !hasProject}
          onClick={onGenerateDoc}
        >
          Generate Documentation
        </ActionButton>
      </div>
    </div>
  );
}

export function ApiSourcePanel(props: ApiSourcePanelProps) {
  const [tab, setTab] = useState("input");
  const { busy } = props;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-sm shadow-primary/5">
      <div className="border-b border-border p-3">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          API Source
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