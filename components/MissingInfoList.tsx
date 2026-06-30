"use client";

import type { MissingInfoItem } from "@/lib/types";
import { PriorityBadge } from "./Badges";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";

export default function MissingInfoList({
  items,
}: {
  items: MissingInfoItem[];
}) {
  const { t } = useAppPreferences();

  if (items.length === 0) {
    return <p className="text-xs text-slate-400">{t("missingInfo.empty")}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((m, i) => (
        <li
          key={i}
          className="rounded-lg border border-slate-200 bg-white p-3 text-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-slate-800">{m.item}</p>
            <PriorityBadge priority={m.priority} />
          </div>
          {m.reason && (
            <p className="mt-1 text-xs text-slate-500">{m.reason}</p>
          )}
          {m.suggestedQuestion && (
            <p className="mt-1.5 rounded bg-slate-50 px-2 py-1 text-xs italic text-slate-600">
              {t("engineer.suggestedQuestion")}: {m.suggestedQuestion}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
