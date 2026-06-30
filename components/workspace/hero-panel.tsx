"use client";

import {
  Boxes,
  SearchX,
  MessagesSquare,
  Globe,
  RefreshCw,
} from "lucide-react";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";

export function HeroPanel() {
  const { t } = useAppPreferences();

  const chips = [
    { label: t("hero.chipStructure"), icon: Boxes },
    { label: t("hero.chipMissing"), icon: SearchX },
    { label: t("hero.chipQuestions"), icon: MessagesSquare },
    { label: t("hero.chipGlobal"), icon: Globe },
    { label: t("hero.chipLoop"), icon: RefreshCw },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-primary/5">
      <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {t("hero.title")}
          </h2>
          <p className="mt-2 text-pretty text-sm leading-6 text-text-secondary">
            {t("hero.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
          {chips.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-text-secondary"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
