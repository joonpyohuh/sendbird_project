import type { TerminologyNote } from "@/lib/types";

export default function TerminologyMapper({
  notes,
}: {
  notes: TerminologyNote[];
}) {
  if (notes.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        변환을 실행하면 한국어-영어 용어 매핑이 여기에 표시됩니다.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((t, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
              {t.koreanTerm || "—"}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5 text-slate-400"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                clipRule="evenodd"
              />
            </svg>
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
              {t.recommendedEnglish || "—"}
            </span>
            {t.avoid && (
              <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600 ring-1 ring-inset ring-rose-200">
                avoid: {t.avoid}
              </span>
            )}
          </div>
          {t.reason && (
            <p className="mt-1.5 text-xs text-slate-500">{t.reason}</p>
          )}
          {t.exampleUsage && (
            <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs italic text-slate-600">
              {t.exampleUsage}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
