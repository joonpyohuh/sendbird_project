"use client";

import type { TechnicalEnglishStyleCheck } from "@/lib/types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  checks: TechnicalEnglishStyleCheck[];
};

const STATUS_STYLES: Record<
  TechnicalEnglishStyleCheck["status"],
  { label: string; cls: string }
> = {
  passed: { label: "Passed", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  needs_revision: {
    label: "Needs revision",
    cls: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  not_applicable: { label: "N/A", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export default function GlobalStyleGuidePanel({
  value,
  onChange,
  checks,
}: Props) {
  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          Style guide rules (AI 변환·리뷰에 적용됨)
        </span>
        <textarea
          value={value}
          rows={8}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>

      {checks.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Style guide checks
          </p>
          <ul className="space-y-1.5">
            {checks.map((c, i) => {
              const s = STATUS_STYLES[c.status];
              return (
                <li key={i} className="flex items-start gap-2 text-xs">
                  <span
                    className={`mt-0.5 inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 font-medium ring-1 ring-inset ${s.cls}`}
                  >
                    {s.label}
                  </span>
                  <span className="text-slate-600">
                    <span className="font-medium text-slate-700">{c.rule}</span>
                    {c.comment && (
                      <span className="block text-slate-400">{c.comment}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
