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
      normTitle(s.title).length > 0 &&
      (normTitle(s.title).includes(target) || target.includes(normTitle(s.title)))
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
    if (patch.action !== "delete" && !patch.markdown.trim()) {
      continue;
    }
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

/** Count duplicate section keys (level + normalized title). */
export function getDuplicateSectionTitles(draft: string): string[] {
  const sections = parseMarkdownSections(draft);
  const counts = new Map<string, number>();
  for (const s of sections) {
    if (!s.title.trim()) continue;
    const key = `${s.level}:${normTitle(s.title)}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
}

/** Keep the first occurrence of each heading (same level + title). */
export function deduplicateMarkdownSections(draft: string): string {
  const sections = parseMarkdownSections(draft);
  const seen = new Set<string>();
  const kept: MarkdownSection[] = [];

  for (const s of sections) {
    if (!s.title.trim()) {
      kept.push(s);
      continue;
    }
    const key = `${s.level}:${normTitle(s.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(s);
  }

  return rebuildDraft(kept);
}

export function validateImprovementLoopDraft(draft: string): boolean {
  return getDuplicateSectionTitles(draft).length === 0;
}

/**
 * Detect when the model concatenated the input draft with an improved copy
 * and return the replacement document instead of the concatenation.
 */
export function resolveLoopOutputDraft(
  inputDraft: string,
  outputDraft: string
): string {
  let result = outputDraft.trim();
  const input = inputDraft.trim();
  if (!result) return input;
  if (!input || result === input) return result;

  if (input.length > 80 && result.startsWith(input)) {
    const tail = result.slice(input.length).replace(/^\s*\n+/, "").trim();
    if (tail.length >= 40 && /^#{1,6}\s/m.test(tail)) {
      result = tail;
    }
  }

  return result;
}

const MAX_DEDUPE_PASSES = 3;

/** Finalize a loop iteration draft: strip concatenation, dedupe, validate. */
export function finalizeImprovementLoopDraft(
  inputDraft: string,
  candidateDraft: string
): string {
  let draft = resolveLoopOutputDraft(inputDraft, candidateDraft);
  for (let i = 0; i < MAX_DEDUPE_PASSES; i++) {
    draft = deduplicateMarkdownSections(draft);
    if (validateImprovementLoopDraft(draft)) break;
  }
  return draft;
}

function patchLooksLikeFullDocument(markdown: string): boolean {
  const topSections = parseMarkdownSections(markdown).filter(
    (s) => s.title.trim() && s.level <= 2
  );
  return topSections.length >= 3;
}

function coerceLoopPatches(
  draft: string,
  patches: SectionPatch[]
): SectionPatch[] {
  const sections = parseMarkdownSections(draft);
  return patches.map((patch) => {
    if (patch.action === "delete") return patch;
    const exists =
      patch.sectionTitle.trim().length > 0 &&
      findSectionIndex(sections, patch.sectionTitle) !== -1;
    if (exists && (patch.action === "append" || patch.action === "insert_after")) {
      return { ...patch, action: "replace" };
    }
    return patch;
  });
}

/**
 * Apply patches for the improvement loop — always replaces, never stacks
 * a second full document beneath the original.
 */
export function applyImprovementLoopPatches(
  draft: string,
  patches: SectionPatch[]
): string {
  if (!patches.length) return draft;

  const fullDocPatch = patches.find(
    (p) => p.markdown.trim() && patchLooksLikeFullDocument(p.markdown)
  );
  if (fullDocPatch) {
    return finalizeImprovementLoopDraft(draft, fullDocPatch.markdown);
  }

  const coerced = coerceLoopPatches(draft, patches);
  const patched = applyMarkdownPatches(draft, coerced);
  return finalizeImprovementLoopDraft(draft, patched);
}
