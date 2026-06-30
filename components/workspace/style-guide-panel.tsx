import { BookMarked, ShieldAlert, Code2, ListTree } from "lucide-react"
import { TextAreaField } from "./primitives"

const checklist = [
  {
    icon: BookMarked,
    title: "Terminology consistency",
    desc: "Enforce approved terms across every doc.",
  },
  {
    icon: ShieldAlert,
    title: "Security warnings",
    desc: "Flag missing token and server-side notes.",
  },
  {
    icon: Code2,
    title: "Developer-facing English",
    desc: "Clear, concise, and unambiguous wording.",
  },
  {
    icon: ListTree,
    title: "Markdown structure",
    desc: "Consistent headings, tables, and code blocks.",
  },
]

export function StyleGuidePanel() {
  return (
    <div className="space-y-4">
      <TextAreaField
        label="Documentation style guide"
        rows={6}
        defaultValue={`Use "API token", not "API key".
Use "request body", not "payload".
Avoid "just" and "simply".
Use backticks for field names.`}
        placeholder={`Use "API token", not "API key". Use "request body", not "payload". Avoid "just" and "simply". Use backticks for field names.`}
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
  )
}
