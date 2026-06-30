"use client";

import {
  Boxes,
  SearchX,
  MessagesSquare,
  AlertTriangle,
  ScanSearch,
} from "lucide-react";
import type { AiAction, ApiDocProject, EngineerQuestion } from "@/lib/types";
import StructuredSummary from "@/components/StructuredSummary";
import MissingInfoList from "@/components/MissingInfoList";
import EngineerQuestionsPanel from "@/components/EngineerQuestionsPanel";
import ReviewIssuesPanel from "@/components/ReviewIssuesPanel";
import LoadingState from "@/components/LoadingState";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import { SectionCard, ActionButton } from "./primitives";
import { Badge } from "./badges";

type AiReviewPanelProps = {
  project: ApiDocProject | null;
  busy: AiAction | null;
  isBusy: boolean;
  hasReviewed: boolean;
  loadingLabel: (action: AiAction) => string;
  onReviewDoc: () => void;
  onUpdateQuestion: (id: string, patch: Partial<EngineerQuestion>) => void;
  onCopyQuestions: () => void;
};

export function AiReviewPanel({
  project,
  busy,
  isBusy,
  hasReviewed,
  loadingLabel,
  onReviewDoc,
  onUpdateQuestion,
  onCopyQuestions,
}: AiReviewPanelProps) {
  const { t } = useAppPreferences();
  const openCount =
    project?.engineerQuestions.filter((q) => q.status === "open").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          {t("workspace.aiReview")}
        </p>
        <ActionButton
          variant="secondary"
          size="sm"
          icon={<ScanSearch className="h-3.5 w-3.5" />}
          loading={busy === "review_doc"}
          loadingLabel={loadingLabel("review_doc")}
          disabled={isBusy || !project?.docDraftMarkdown?.trim()}
          onClick={onReviewDoc}
        >
          {t("api.reviewDoc")}
        </ActionButton>
      </div>

      {busy === "analyze" && <LoadingState label={loadingLabel("analyze")} />}

      <SectionCard
        title={t("workspace.structuredSummary")}
        icon={<Boxes className="h-4 w-4" />}
        description={t("workspace.structuredSummaryDesc")}
        contentClassName="premium-content !p-4"
      >
        <StructuredSummary project={project} />
      </SectionCard>

      <SectionCard
        title={t("workspace.missingInformation")}
        icon={<SearchX className="h-4 w-4" />}
        description={t("workspace.missingInformationDesc")}
        contentClassName="premium-content !p-4"
      >
        {busy === "missing_info" ? (
          <LoadingState label={loadingLabel("missing_info")} />
        ) : (
          <MissingInfoList items={project?.missingInfo ?? []} />
        )}
      </SectionCard>

      <SectionCard
        title={t("workspace.engineerQuestions")}
        icon={<MessagesSquare className="h-4 w-4" />}
        description={t("workspace.engineerQuestionsDesc")}
        actions={
          openCount > 0 ? (
            <Badge tone="muted">{t("workspace.openCount", { count: openCount })}</Badge>
          ) : undefined
        }
        contentClassName="premium-content !p-4"
      >
        {busy === "engineer_questions" ? (
          <LoadingState label={loadingLabel("engineer_questions")} />
        ) : (
          <EngineerQuestionsPanel
            questions={project?.engineerQuestions ?? []}
            onUpdate={onUpdateQuestion}
            onCopyAll={onCopyQuestions}
          />
        )}
      </SectionCard>

      <SectionCard
        title={t("workspace.reviewIssues")}
        icon={<AlertTriangle className="h-4 w-4" />}
        description={t("workspace.reviewIssuesDesc")}
        contentClassName="premium-content !p-4"
      >
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
  );
}
