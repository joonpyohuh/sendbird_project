"use client";

import type {
  AuthType,
  HttpMethod,
  Priority,
  QuestionStatus,
  ReviewIssueCategory,
  TargetReader,
} from "@/lib/types";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import {
  getAuthLabel,
  getCategoryLabel,
  getPriorityLabel,
  getReaderLabel,
  getStatusLabel,
} from "@/lib/i18n/helpers";

const METHOD_STYLES: Record<HttpMethod, string> = {
  GET: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  POST: "bg-blue-50 text-blue-700 ring-blue-200",
  PUT: "bg-amber-50 text-amber-700 ring-amber-200",
  PATCH: "bg-violet-50 text-violet-700 ring-violet-200",
  DELETE: "bg-rose-50 text-rose-700 ring-rose-200",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  high: "bg-rose-50 text-rose-700 ring-rose-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
};

const STATUS_STYLES: Record<QuestionStatus, string> = {
  open: "bg-slate-100 text-slate-600 ring-slate-200",
  answered: "bg-blue-50 text-blue-700 ring-blue-200",
  applied: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

/** @deprecated use getReaderLabel(t, reader) */
export const READER_LABELS: Record<TargetReader, string> = {
  beginner: "Beginner developer",
  frontend: "Frontend developer",
  backend: "Backend developer",
  technical_writer: "Technical writer",
};

/** @deprecated use getAuthLabel(t, auth) */
export const AUTH_LABELS: Record<AuthType, string> = {
  api_token: "API token",
  bearer_token: "Bearer token",
  none: "None",
  unknown: "Unknown",
};

function base(extra: string) {
  return `inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${extra}`;
}

export function MethodBadge({ method }: { method: HttpMethod }) {
  return <span className={base(METHOD_STYLES[method])}>{method}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useAppPreferences();
  return (
    <span className={base(PRIORITY_STYLES[priority])}>
      {getPriorityLabel(t, priority)}
    </span>
  );
}

export function StatusBadge({ status }: { status: QuestionStatus }) {
  const { t } = useAppPreferences();
  return (
    <span className={base(STATUS_STYLES[status])}>
      {getStatusLabel(t, status)}
    </span>
  );
}

export function CategoryBadge({
  category,
}: {
  category: ReviewIssueCategory;
}) {
  const { t } = useAppPreferences();
  return (
    <span className={base("bg-brand-50 text-brand-700 ring-brand-200")}>
      {getCategoryLabel(t, category)}
    </span>
  );
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className={base("bg-slate-100 text-slate-700 ring-slate-200")}>
      {children}
    </span>
  );
}

export { getReaderLabel, getAuthLabel };
