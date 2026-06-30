import type { ReviewIssue } from "@/lib/types";
import { CategoryBadge, PriorityBadge } from "./Badges";

export default function ReviewIssuesPanel({
  issues,
  hasReviewed,
}: {
  issues: ReviewIssue[];
  hasReviewed: boolean;
}) {
  if (!hasReviewed) {
    return (
      <p className="text-xs text-slate-400">
        'Review Documentation'을 실행하면 명확성, 일관성, 보안 등 항목별 리뷰가
        표시됩니다.
      </p>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
        리뷰 결과 큰 문제가 발견되지 않았습니다. 좋은 초안입니다!
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {issues.map((issue, i) => (
        <li
          key={i}
          className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={issue.category} />
            <PriorityBadge priority={issue.severity} />
          </div>
          <p className="mt-2 text-slate-800">{issue.issue}</p>
          {issue.suggestion && (
            <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
              <span className="font-medium text-slate-700">제안:</span>{" "}
              {issue.suggestion}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
