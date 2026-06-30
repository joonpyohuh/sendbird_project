import type { SectionPatch } from "./types";

export type MarkdownSection = {
  title: string;
  level: number;
  /** Full section text including the heading line. */
  content: string;
  start: number;
  end: number;
};

/** Normalize a heading title for fuzzy matching. */
function normTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Parse Markdown into sections keyed by ATX headings (# … ######).
 * Preamble content before the first heading is stored as title "".
 */
export function parseMarkdownSections(draft: string): MarkdownSection[] {
  const lines = draft.split("\n");
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^(#{1,6})\s+(.+)$/.exec(line);
    if (m) {
      if (current) {
        current.content = lines.slice(current.start, i).join("\n");
        current.end = i;
        sections.push(current);
      }
      current = {
        title: m[2].trim(),
        level: m[1].length,
        content: "",
        start: i,
        end: lines.length,
      };
    }
  }

  if (current) {
    current.content = lines.slice(current.start).join("\n");
    current.end = lines.length;
    sections.push(current);
  } else if (draft.trim()) {
    sections.push({
      title: "",
      level: 0,
      content: draft,
      start: 0,
      end: lines.length,
    });
  }

  return sections;
}

function findSectionIndex(
  sections: MarkdownSection[],
  title: string
): number {
  const target = normTitle(title);
  if (!target) return -1;

  let idx = sections.findIndex((s) => normTitle(s.title) === target);
  if (idx !== -1) return idx;

  idx = sections.findIndex(
    (s) =>
      normTitle(s.title).includes(target) || target.includes(normTitle(s.title))
  );
  return idx;
}

function rebuildDraft(sections: MarkdownSection[]): string {
  return sections
    .map((s) => s.content.trimEnd())
    .filter(Boolean)
    .join("\n\n")
    .trimEnd();
}

function ensureHeading(sectionTitle: string, markdown: string): string {
  const trimmed = markdown.trim();
  const firstLine = trimmed.split("\n")[0] ?? "";
  if (/^#{1,6}\s+/.test(firstLine)) return trimmed;
  return `## ${sectionTitle}\n\n${trimmed}`;
}

/**
 * Apply targeted section patches to a Markdown draft.
 * Matches sections by heading title; preserves unchanged sections.
 */
export function applyMarkdownPatches(
  draft: string,
  patches: SectionPatch[]
): string {
  if (!patches.length) return draft;

  let sections = parseMarkdownSections(draft);

  for (const patch of patches) {
    const title = patch.sectionTitle.trim();
    const md = ensureHeading(title || patch.sectionTitle, patch.markdown);

    switch (patch.action) {
      case "replace": {
        const idx = findSectionIndex(sections, title);
        if (idx !== -1) {
          sections[idx] = {
            ...sections[idx],
            title: title || sections[idx].title,
            content: md,
          };
        } else if (patch.targetSection) {
          const afterIdx = findSectionIndex(sections, patch.targetSection);
          const newSection: MarkdownSection = {
            title,
            level: 2,
            content: md,
            start: 0,
            end: 0,
          };
          if (afterIdx !== -1) {
            sections.splice(afterIdx + 1, 0, newSection);
          } else {
            sections.push(newSection);
          }
        } else {
          sections.push({
            title,
            level: 2,
            content: md,
            start: 0,
            end: 0,
          });
        }
        break;
      }
      case "insert_after": {
        const target = patch.targetSection ?? title;
        const afterIdx = findSectionIndex(sections, target);
        const newSection: MarkdownSection = {
          title,
          level: 2,
          content: md,
          start: 0,
          end: 0,
        };
        if (afterIdx !== -1) {
          sections.splice(afterIdx + 1, 0, newSection);
        } else {
          sections.push(newSection);
        }
        break;
      }
      case "append": {
        sections.push({
          title,
          level: 2,
          content: md,
          start: 0,
          end: 0,
        });
        break;
      }
      case "delete": {
        const idx = findSectionIndex(sections, title);
        if (idx !== -1) sections.splice(idx, 1);
        break;
      }
      default:
        break;
    }
  }

  return rebuildDraft(sections);
}
