"use client";

import type { GlobalDocsWorkflow } from "@/lib/types";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import { getWorkflowOptions } from "@/lib/i18n/helpers";

type Props = {
  value: GlobalDocsWorkflow;
  onChange: (value: GlobalDocsWorkflow) => void;
};

export default function LanguageWorkflowSelector({ value, onChange }: Props) {
  const { t } = useAppPreferences();
  const workflowOptions = getWorkflowOptions(t);

  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      role="tablist"
      aria-label={t("options.workflowKoToEn")}
    >
      {workflowOptions.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
