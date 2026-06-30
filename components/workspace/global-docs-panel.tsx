"use client"

import { useState } from "react"
import { Globe, ArrowRight } from "lucide-react"
import { ActionButton, SelectField, TextAreaField } from "./primitives"
import { Badge } from "./badges"

const workflows = ["Korean Source → English Docs", "Korean Review → English Polish", "Bilingual Compare"]

const expressionMap = [
  { ko: "생성하다", en: "create" },
  { ko: "필수입니다", en: "is required" },
  { ko: "에러가 발생합니다", en: "The API returns an error" },
]

const terms = ["API token", "request body", "response field", "client-side code"]

export function GlobalDocsPanel() {
  const [workflow, setWorkflow] = useState(workflows[0])
  const [loading, setLoading] = useState(false)

  const handleConvert = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1200)
  }

  return (
    <div className="space-y-4">
      <SelectField
        label="Workflow"
        options={workflows}
        value={workflow}
        onChange={(e) => setWorkflow(e.target.value)}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <TextAreaField
          label="Korean source"
          rows={7}
          defaultValue={`user_id는 필수입니다.
서버에서 호출해야 합니다.
중복된 user_id는 에러가 발생합니다.`}
        />
        <div className="flex flex-col">
          <span className="mb-1.5 block text-xs font-medium text-text-secondary">
            English documentation
          </span>
          <div className="flex-1 rounded-lg border border-border bg-surface-subtle p-3 font-mono text-[13px] leading-6 text-foreground">
            <p>{"`user_id` is required."}</p>
            <p>This endpoint must be called from the server side.</p>
            <p>{"A duplicate `user_id` returns an error."}</p>
          </div>
        </div>
      </div>

      <ActionButton
        icon={<Globe className="h-4 w-4" />}
        loading={loading}
        loadingLabel="Converting…"
        onClick={handleConvert}
      >
        Convert to Global Docs
      </ActionButton>

      <div className="rounded-xl border border-border bg-surface-subtle p-3.5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Expression mapping
        </p>
        <ul className="space-y-1.5">
          {expressionMap.map((m) => (
            <li key={m.ko} className="flex items-center gap-2 font-mono text-[13px]">
              <span className="text-foreground">{m.ko}</span>
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
              <span className="text-text-secondary">{m.en}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Terminology notes
        </p>
        <div className="flex flex-wrap gap-1.5">
          {terms.map((t) => (
            <Badge key={t} tone="default" className="font-mono">
              {t}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
