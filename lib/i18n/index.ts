import { messages, type Locale, type MessageTree } from "./messages";

export type { Locale };
export type Theme = "light" | "dark";

export function getMessage(tree: MessageTree, path: string): string {
  const parts = path.split(".");
  let current: string | MessageTree = tree;
  for (const part of parts) {
    if (typeof current !== "object" || current === null || !(part in current)) {
      return path;
    }
    current = current[part];
  }
  return typeof current === "string" ? current : path;
}

export function createTranslator(locale: Locale) {
  const tree = messages[locale];
  return (path: string) => getMessage(tree, path);
}

export { messages };
