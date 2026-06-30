"use client";

import type { TechnicalEnglishStyleCheck } from "@/lib/types";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import { getStyleCheckStatus } from "@/lib/i18n/helpers";

type Props = {
  value: string;
  onChange: (value: string) => void;
  checks: TechnicalEnglishStyleCheck[];
};

export default function GlobalStyleGuidePanel({
  value,
  onChange,
  checks,
}: Props) {
  const { t } = useAppPreferences();

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {t("styleGuidePanel.rulesLabel")}
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
            {t("styleGuidePanel.checksLabel")}
          </p>
          <ul className="space-y-1.5">
            {checks.map((c, i) => {
              const s = getStyleCheckStatus(t, c.status);
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
