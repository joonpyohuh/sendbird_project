import { useMemo } from "react";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import type {
  AuthType,
  GlobalDocsWorkflow,
  LoopMode,
  Priority,
  QualityScores,
  QuestionStatus,
  ReviewIssueCategory,
  TargetReader,
  TechnicalEnglishStyleCheck,
} from "@/lib/types";
import type { createTranslator } from "./index";

export type TFunction = ReturnType<typeof createTranslator>;

export function getWorkflowOptions(t: TFunction) {
  return [
    {
      value: "korean_source_to_english_docs" as GlobalDocsWorkflow,
      label: t("options.workflowKoToEn"),
      source: t("options.langKorean"),
      target: t("options.langEnglish"),
    },
    {
      value: "english_source_to_english_docs" as GlobalDocsWorkflow,
      label: t("options.workflowEnToEn"),
      source: t("options.langEnglish"),
      target: t("options.langEnglish"),
    },
    {
      value: "korean_review_to_english_polish" as GlobalDocsWorkflow,
      label: t("options.workflowKoPolish"),
      source: t("options.langKorean"),
      target: t("options.langEnglish"),
    },
    {
      value: "bilingual_compare" as GlobalDocsWorkflow,
      label: t("options.workflowBilingual"),
      source: t("options.langKorean"),
      target: t("options.langEnglish"),
    },
  ];
}

export function getLoopModeOptions(t: TFunction) {
  return [
    {
      value: "conservative" as LoopMode,
      label: t("loop.modeConservative"),
      description: t("loop.modeConservativeDesc"),
    },
    {
      value: "balanced" as LoopMode,
      label: t("loop.modeBalanced"),
      description: t("loop.modeBalancedDesc"),
    },
    {
      value: "aggressive" as LoopMode,
      label: t("loop.modeAggressive"),
      description: t("loop.modeAggressiveDesc"),
    },
  ];
}

export function getScoreRows(t: TFunction) {
  return [
    { key: "overall" as keyof QualityScores, label: t("loop.scoreOverall") },
    { key: "accuracy" as keyof QualityScores, label: t("loop.scoreAccuracy") },
    {
      key: "completeness" as keyof QualityScores,
      label: t("loop.scoreCompleteness"),
    },
    { key: "clarity" as keyof QualityScores, label: t("loop.scoreClarity") },
    {
      key: "styleGuide" as keyof QualityScores,
      label: t("loop.scoreStyleGuide"),
    },
    {
      key: "developerReadability" as keyof QualityScores,
      label: t("loop.scoreDeveloperReadability"),
    },
    { key: "security" as keyof QualityScores, label: t("loop.scoreSecurity") },
    {
      key: "technicalEnglish" as keyof QualityScores,
      label: t("loop.scoreTechnicalEnglish"),
    },
    { key: "structure" as keyof QualityScores, label: t("loop.scoreStructure") },
  ];
}

export function getStyleCheckStatus(
  t: TFunction,
  status: TechnicalEnglishStyleCheck["status"]
) {
  const map = {
    passed: {
      label: t("technicalEnglish.statusPassed"),
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    },
    needs_revision: {
      label: t("technicalEnglish.statusNeedsRevision"),
      cls: "bg-amber-50 text-amber-700 ring-amber-200",
    },
    not_applicable: {
      label: t("technicalEnglish.statusNa"),
      cls: "bg-slate-100 text-slate-600 ring-slate-200",
    },
  };
  return map[status];
}

export function getReaderOptions(t: TFunction) {
  return [
    { value: "beginner", label: t("api.readerBeginner") },
    { value: "frontend", label: t("api.readerFrontend") },
    { value: "backend", label: t("api.readerBackend") },
    { value: "technical_writer", label: t("api.readerTw") },
  ];
}

export function getAuthOptions(t: TFunction) {
  return [
    { value: "api_token", label: t("api.authApiToken") },
    { value: "bearer_token", label: t("api.authBearer") },
    { value: "none", label: t("api.authNone") },
    { value: "unknown", label: t("api.authUnknown") },
  ];
}

export function getStyleOptions(t: TFunction) {
  return [
    { value: "api_reference", label: t("options.styleApiReference") },
    { value: "tutorial", label: t("options.styleTutorial") },
    { value: "release_note", label: t("options.styleReleaseNote") },
    { value: "engineer_question", label: t("options.styleEngineerQuestion") },
    { value: "error_explanation", label: t("options.styleErrorExplanation") },
    { value: "ui_copy", label: t("options.styleUiCopy") },
    { value: "faq", label: t("options.styleFaq") },
  ];
}

export function getReaderLabel(t: TFunction, reader: TargetReader) {
  const map: Record<TargetReader, string> = {
    beginner: t("api.readerBeginner"),
    frontend: t("api.readerFrontend"),
    backend: t("api.readerBackend"),
    technical_writer: t("api.readerTw"),
  };
  return map[reader];
}

export function getAuthLabel(t: TFunction, auth: AuthType) {
  const map: Record<AuthType, string> = {
    api_token: t("api.authApiToken"),
    bearer_token: t("api.authBearer"),
    none: t("api.authNone"),
    unknown: t("api.authUnknown"),
  };
  return map[auth];
}

export function getPriorityLabel(t: TFunction, priority: Priority) {
  const map: Record<Priority, string> = {
    high: t("badges.priorityHigh"),
    medium: t("badges.priorityMedium"),
    low: t("badges.priorityLow"),
  };
  return map[priority];
}

export function getStatusLabel(t: TFunction, status: QuestionStatus) {
  const map: Record<QuestionStatus, string> = {
    open: t("badges.statusOpen"),
    answered: t("badges.statusAnswered"),
    applied: t("badges.statusApplied"),
  };
  return map[status];
}

export function getCategoryLabel(t: TFunction, category: ReviewIssueCategory) {
  const map: Record<ReviewIssueCategory, string> = {
    clarity: t("badges.categoryClarity"),
    consistency: t("badges.categoryConsistency"),
    terminology: t("badges.categoryTerminology"),
    security: t("badges.categorySecurity"),
    missing_example: t("badges.categoryMissingExample"),
    client_server_confusion: t("badges.categoryClientServer"),
    accuracy: t("badges.categoryAccuracy"),
    structure: t("badges.categoryStructure"),
  };
  return map[category];
}

export function useTranslatedOptions() {
  const { t } = useAppPreferences();
  return useMemo(
    () => ({
      t,
      readerOptions: getReaderOptions(t),
      authOptions: getAuthOptions(t),
      styleOptions: getStyleOptions(t),
      workflowOptions: getWorkflowOptions(t),
      loopModeOptions: getLoopModeOptions(t),
      scoreRows: getScoreRows(t),
    }),
    [t]
  );
}
