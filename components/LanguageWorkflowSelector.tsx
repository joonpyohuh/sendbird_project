"use client";

import type { GlobalDocsWorkflow } from "@/lib/types";

type Props = {
  value: GlobalDocsWorkflow;
  onChange: (value: GlobalDocsWorkflow) => void;
};

export const WORKFLOW_OPTIONS: {
  value: GlobalDocsWorkflow;
  label: string;
  source: string;
  target: string;
}[] = [
  {
    value: "korean_source_to_english_docs",
    label: "Korean Source → English Docs",
    source: "Korean",
    target: "English",
  },
  {
    value: "english_source_to_english_docs",
    label: "English Source → English Docs",
    source: "English",
    target: "English",
  },
  {
    value: "korean_review_to_english_polish",
    label: "Korean Review → English Polish",
    source: "Korean",
    target: "English",
  },
  {
    value: "bilingual_compare",
    label: "Bilingual Compare",
    source: "Korean",
    target: "English",
  },
];

export default function LanguageWorkflowSelector({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
      role="tablist"
      aria-label="Language workflow"
    >
      {WORKFLOW_OPTIONS.map((opt) => {
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
