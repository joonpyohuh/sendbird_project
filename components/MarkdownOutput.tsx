"use client";

import { useMemo, useState } from "react";
import { marked } from "marked";
import ActionButton from "./ActionButton";
import EmptyState from "./EmptyState";

type Props = {
  markdown: string;
  onChange: (value: string) => void;
  fileBaseName?: string;
};

marked.setOptions({ gfm: true, breaks: false });

export default function MarkdownOutput({
  markdown,
  onChange,
  fileBaseName = "api-documentation",
}: Props) {
  const [tab, setTab] = useState<"preview" | "raw">("preview");
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => {
    try {
      return marked.parse(markdown || "") as string;
    } catch {
      return "<p>미리보기를 렌더링할 수 없습니다.</p>";
    }
  }, [markdown]);

  async function copyMarkdown() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function exportMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBaseName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!markdown) {
    return (
      <EmptyState
        title="아직 생성된 문서가 없습니다"
        description="'Generate Documentation'을 실행하면 여기에 Markdown 문서 초안이 표시됩니다."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              tab === "preview"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => setTab("raw")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              tab === "raw"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Raw
          </button>
        </div>
        <div className="flex gap-2">
          <ActionButton size="sm" variant="secondary" onClick={copyMarkdown}>
            {copied ? "복사됨!" : "Copy Markdown"}
          </ActionButton>
          <ActionButton size="sm" variant="secondary" onClick={exportMarkdown}>
            Export .md
          </ActionButton>
        </div>
      </div>

      {tab === "preview" ? (
        <div
          className="markdown-preview max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <textarea
          value={markdown}
          rows={24}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      )}
    </div>
  );
}
