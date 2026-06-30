"use client";

import type { EngineerQuestion } from "@/lib/types";
import { PriorityBadge, StatusBadge } from "./Badges";
import ActionButton from "./ActionButton";

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
  if (questions.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        아직 엔지니어 질문이 없습니다. 'Generate Engineer Questions'를 실행해
        보세요.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{questions.length}개 질문</p>
        <ActionButton size="sm" variant="ghost" onClick={onCopyAll}>
          질문 복사
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
              <span className="font-medium text-slate-600">Reason:</span>{" "}
              {q.reason}
            </p>
          )}
          {q.owner && (
            <p className="mt-0.5 text-xs text-slate-500">
              <span className="font-medium text-slate-600">Owner:</span>{" "}
              {q.owner}
            </p>
          )}

          <textarea
            value={q.answer ?? ""}
            rows={2}
            placeholder="엔지니어 답변을 여기에 기록하세요…"
            onChange={(e) => onUpdate(q.id, { answer: e.target.value })}
            className="mt-2 w-full resize-y rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            <ActionButton
              size="sm"
              variant="secondary"
              onClick={() =>
                onUpdate(q.id, { status: "answered" })
              }
              disabled={q.status === "answered" || q.status === "applied"}
            >
              Mark Answered
            </ActionButton>
            <ActionButton
              size="sm"
              variant="primary"
              onClick={() =>
                onUpdate(q.id, { status: "applied", appliedToDocs: true })
              }
              disabled={q.status === "applied"}
            >
              Mark Applied
            </ActionButton>
          </div>
        </div>
      ))}
    </div>
  );
}
