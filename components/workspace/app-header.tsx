"use client";

import { BookOpen, Download, RotateCcw, Sparkles, Save, CircleCheck } from "lucide-react";
import { Badge } from "./badges";
import { ActionButton } from "./primitives";

type AppHeaderProps = {
  onLoadSample: () => void;
  onReset: () => void;
  onExport: () => void;
  hasDraft: boolean;
  hasSavedState: boolean;
  disabled?: boolean;
};

export function AppHeader({
  onLoadSample,
  onReset,
  onExport,
  hasDraft,
  hasSavedState,
  disabled = false,
}: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 pr-28 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:pr-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                API Doc Workspace
              </h1>
              <Badge tone="primary" icon={<Sparkles className="h-3 w-3" />}>
                Technical Writer AX Tool
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-text-secondary">
              Structure, review, and polish API documentation with AI.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Badge tone="success" icon={<CircleCheck className="h-3 w-3" />}>
              AI Ready
            </Badge>
            {hasSavedState && (
              <Badge tone="muted" icon={<Save className="h-3 w-3" />}>
                Local Draft Saved
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ActionButton
              variant="outline"
              size="sm"
              icon={<BookOpen className="h-4 w-4" />}
              onClick={onLoadSample}
              disabled={disabled}
            >
              Load Sample
            </ActionButton>
            <ActionButton
              variant="secondary"
              size="sm"
              icon={<Download className="h-4 w-4" />}
              onClick={onExport}
              disabled={disabled || !hasDraft}
            >
              Export Markdown
            </ActionButton>
            <ActionButton
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={onReset}
              disabled={disabled}
            >
              Reset
            </ActionButton>
          </div>
        </div>
      </div>
    </header>
  );
}
