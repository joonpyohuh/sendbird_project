export type ActiveTab = null | "api" | "docs" | "loop";

export type ModeDefinition = {
  id: Exclude<ActiveTab, null>;
  title: string;
  subtitle: string;
  badge?: string;
};

export function getModes(t: (path: string) => string): ModeDefinition[] {
  return [
    {
      id: "api",
      title: t("modes.api.title"),
      subtitle: t("modes.api.subtitle"),
    },
    {
      id: "docs",
      title: t("modes.docs.title"),
      subtitle: t("modes.docs.subtitle"),
      badge: t("modes.docs.badge"),
    },
    {
      id: "loop",
      title: t("modes.loop.title"),
      subtitle: t("modes.loop.subtitle"),
      badge: t("modes.loop.badge"),
    },
  ];
}
