"use client";

import { BookMarked, ShieldAlert, Code2, ListTree } from "lucide-react";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import { TextAreaField } from "./primitives";

export function StyleGuidePanel() {
  const { t } = useAppPreferences();

  const checklist = [
    {
      icon: BookMarked,
      title: t("styleGuide.item1Title"),
      desc: t("styleGuide.item1Desc"),
    },
    {
      icon: ShieldAlert,
      title: t("styleGuide.item2Title"),
      desc: t("styleGuide.item2Desc"),
    },
    {
      icon: Code2,
      title: t("styleGuide.item3Title"),
      desc: t("styleGuide.item3Desc"),
    },
    {
      icon: ListTree,
      title: t("styleGuide.item4Title"),
      desc: t("styleGuide.item4Desc"),
    },
  ];

  return (
    <div className="space-y-4">
      <TextAreaField
        label={t("styleGuide.label")}
        rows={6}
        defaultValue={t("styleGuide.defaultValue")}
        placeholder={t("styleGuide.placeholder")}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {checklist.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-subtle p-3"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-dark">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{title}</p>
              <p className="mt-0.5 text-xs leading-5 text-text-secondary">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
