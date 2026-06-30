"use client";

import type { EngineerQuestion } from "@/lib/types";
import { PriorityBadge, StatusBadge } from "./Badges";
import ActionButton from "./ActionButton";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";

type Props = {
  questions: EngineerQuestion[];
  onUpdate: (id: string, patch: Partial<EngineerQuestion>) => void;
  onCopyAll: () => void;
};

export default function EngineerQuestionsPanel({
  questions,
  onUpdate,
  onCopyAll,
}: Props) {
  const { t } = useAppPreferences();

  if (questions.length === 0) {
    return <p className="text-xs text-slate-400">{t("engineer.empty")}</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {t("engineer.questionCount", { count: questions.length })}
        </p>
        <ActionButton size="sm" variant="ghost" onClick={onCopyAll}>
          {t("engineer.copyAll")}
        </ActionButton>
      </div>

      {questions.map((q) => (
        <div
          key={q.id}
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">{q.question}</p>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <PriorityBadge priority={q.priority} />
              <StatusBadge status={q.status} />
            </div>
          </div>

          {q.reason && (
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-medium text-slate-600">{t("engineer.reason")}:</span>{" "}
              {q.reason}
            </p>
          )}
          {q.owner && (
            <p className="mt-0.5 text-xs text-slate-500">
              <span className="font-medium text-slate-600">{t("engineer.owner")}:</span>{" "}
              {q.owner}
            </p>
          )}

          <textarea
            value={q.answer ?? ""}
            rows={2}
            placeholder={t("engineer.answerPlaceholder")}
            onChange={(e) => onUpdate(q.id, { answer: e.target.value })}
            className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() => onUpdate(q.id, { status: "answered" })}
              disabled={q.status === "answered" || q.status === "applied"}
            >
              {t("engineer.markAnswered")}
            </ActionButton>
            <ActionButton
              size="sm"
              variant="primary"
              onClick={() =>
                onUpdate(q.id, { status: "applied", appliedToDocs: true })
              }
              disabled={q.status === "applied"}
            >
              {t("engineer.markApplied")}
            </ActionButton>
          </div>
        </div>
      ))}
    </div>
  );
}
