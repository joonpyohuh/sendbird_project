"use client"

import { useState } from "react"
import { Languages, Lightbulb, ListChecks, ShieldAlert, Wand2 } from "lucide-react"
import { ActionButton, SelectField, TextAreaField } from "./primitives"

const styles = [
  "API reference",
  "Tutorial",
  "Release note",
  "Engineer question",
  "Error explanation",
  "FAQ",
]

const outputCards = [
  {
    icon: Wand2,
    title: "Recommended English",
    body: "A duplicate `user_id` returns a `409 Conflict` response. Call this endpoint from your server, because it requires an API token.",
  },
  {
    icon: ListChecks,
    title: "Expression breakdown",
    body: '"중복" → "duplicate", "서버에서 호출" → "call from your server", "필수" → "required".',
  },
  {
    icon: Lightbulb,
    title: "Why this wording works",
    body: "Leads with the developer outcome, names the exact status code, and states the security constraint as a reason.",
  },
  {
    icon: Languages,
    title: "Alternatives",
    body: "“The API responds with 409 Conflict when user_id already exists.” — slightly more formal for reference docs.",
  },
  {
    icon: ShieldAlert,
    title: "Caution",
    body: "Avoid “API key”; the approved term is “API token”. Do not use “just” or “simply”.",
  },
]

export function TechnicalEnglishPanel() {
  const [style, setStyle] = useState(styles[0])
  const [loading, setLoading] = useState(false)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-primary-soft/50 p-3 text-xs leading-5 text-primary-dark">
        Not a translator — a Korean-to-English technical writing coach for developer docs.
      </div>
      <TextAreaField
        label="Korean source text"
        rows={5}
        defaultValue="중복된 user_id로 요청하면 에러가 발생합니다. 이 엔드포인트는 API 토큰이 필요하므로 서버에서 호출해야 합니다."
      />
      <SelectField
        label="Target style"
        options={styles}
        value={style}
        onChange={(e) => setStyle(e.target.value)}
      />
      <ActionButton
        icon={<Languages className="h-4 w-4" />}
        loading={loading}
        loadingLabel="Converting…"
        onClick={() => {
          setLoading(true)
          setTimeout(() => setLoading(false), 1200)
        }}
      >
        Convert to Technical English
      </ActionButton>

      <div className="space-y-3">
        {outputCards.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border border-border bg-surface-subtle p-3.5">
            <div className="mb-1.5 flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">{title}</p>
            </div>
            <p className="text-xs leading-5 text-text-secondary">{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
