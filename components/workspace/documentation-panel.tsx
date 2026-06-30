"use client";

import { useMemo, useState } from "react";
import { Eye, Code, RefreshCw, Copy, Download } from "lucide-react";
import { marked } from "marked";
import type { ApiDocProject, TargetReader } from "@/lib/types";
import DocumentationImprovementLoop from "@/components/DocumentationImprovementLoop";
import { useAppPreferences } from "@/components/shell/AppPreferencesProvider";
import { Tabs, ActionButton, EmptyState } from "./primitives";

marked.setOptions({ gfm: true, breaks: false });

type DocumentationPanelProps = {
  project: ApiDocProject | null;
  markdown: string;
  onChange: (value: string) => void;
  fileBaseName: string;
  targetReader: TargetReader;
  onApplyToMainDraft: (text: string) => void;
};

export function DocumentationPanel({
  project,
  markdown,
  onChange,
  fileBaseName,
  targetReader,
  onApplyToMainDraft,
}: DocumentationPanelProps) {
  const { t } = useAppPreferences();
  const [tab, setTab] = useState("preview");
  const [copied, setCopied] = useState(false);

  const tabs = useMemo(
    () => [
      { id: "preview", label: t("workspace.tabPreview"), icon: <Eye className="h-3.5 w-3.5" /> },
      { id: "markdown", label: t("workspace.tabMarkdown"), icon: <Code className="h-3.5 w-3.5" /> },
      {
        id: "loop",
        label: t("workspace.tabLoop"),
        icon: <RefreshCw className="h-3.5 w-3.5" />,
      },
    ],
    [t]
  );

  const html = useMemo(() => {
    try {
      return marked.parse(markdown || "") as string;
    } catch {
      return `<p>${t("workspace.previewError")}</p>`;
    }
  }, [markdown, t]);

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

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-card shadow-sm shadow-primary/5">
      <div className="border-b border-border p-3">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          {t("workspace.documentation")}
        </p>
        <Tabs tabs={tabs} active={tab} onChange={setTab} />
      </div>
      <div className="premium-content p-4 sm:p-5">
        {tab === "preview" && (
          <>
            {!markdown.trim() ? (
              <EmptyState
                title={t("workspace.noDocTitle")}
                description={t("workspace.noDocDesc")}
              />
            ) : (
              <article
                className="markdown-preview max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-surface-subtle p-4"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </>
        )}

        {tab === "markdown" && (
          <div className="space-y-3">
            {!markdown.trim() ? (
              <EmptyState
                title={t("workspace.noDocTitle")}
                description={t("workspace.noDocDesc")}
              />
            ) : (
              <>
                <textarea
                  value={markdown}
                  onChange={(e) => onChange(e.target.value)}
                  rows={20}
                  spellCheck={false}
                  className="w-full resize-y rounded-lg border border-input bg-surface-subtle p-3 font-mono text-[13px] leading-6 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    variant="outline"
                    size="sm"
                    icon={<Copy className="h-3.5 w-3.5" />}
                    onClick={copyMarkdown}
                  >
                    {copied ? t("workspace.copied") : t("workspace.copyMarkdown")}
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    size="sm"
                    icon={<Download className="h-3.5 w-3.5" />}
                    onClick={exportMarkdown}
                  >
                    {t("workspace.exportMd")}
                  </ActionButton>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "loop" && (
          <DocumentationImprovementLoop
            project={project}
            currentDraft={markdown}
            targetReader={targetReader}
            onApplyToMainDraft={onApplyToMainDraft}
          />
        )}
      </div>
    </div>
  );
}
