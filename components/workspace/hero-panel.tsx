import {
  Boxes,
  SearchX,
  MessagesSquare,
  Globe,
  RefreshCw,
} from "lucide-react"

const chips = [
  { label: "API Structure", icon: Boxes },
  { label: "Missing Info", icon: SearchX },
  { label: "Engineer Questions", icon: MessagesSquare },
  { label: "Global Docs", icon: Globe },
  { label: "Improvement Loop", icon: RefreshCw },
]

export function HeroPanel() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-primary/5">
      <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Developer-friendly API docs, faster.
          </h2>
          <p className="mt-2 text-pretty text-sm leading-6 text-text-secondary">
            Turn raw API notes into structured documentation, missing-info checks, engineer
            questions, technical English, and style-guide aligned Markdown.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
          {chips.map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-text-secondary"
            >
              <Icon className="h-3.5 w-3.5 text-primary" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
