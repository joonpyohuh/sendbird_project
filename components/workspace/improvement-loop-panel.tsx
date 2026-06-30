"use client"

import { useState } from "react"
import {
  Settings2,
  Play,
  Square,
  CheckCheck,
  Gauge,
  GitBranch,
  HelpCircle,
} from "lucide-react"
import {
  ActionButton,
  InputField,
  ProgressBar,
  SectionCard,
  SelectField,
  Toggle,
} from "./primitives"
import { Badge, PriorityBadge } from "./badges"

const scores = [
  { label: "Accuracy", value: 95 },
  { label: "Completeness", value: 88 },
  { label: "Clarity", value: 94 },
  { label: "Style Guide", value: 92 },
  { label: "Developer Readability", value: 91 },
  { label: "Security", value: 90 },
  { label: "Technical English", value: 96 },
  { label: "Structure", value: 93 },
]

const iterations = [
  {
    title: "Iteration 1",
    score: 72,
    heading: "Issues",
    items: ["Authentication warning missing", "Error responses vague"],
    done: false,
  },
  {
    title: "Iteration 2",
    score: 86,
    heading: "Improvements",
    items: ["Added API token warning", "Clarified 401 and 409 errors"],
    done: false,
  },
  {
    title: "Iteration 3",
    score: 93,
    heading: "Status",
    items: ["Target quality score reached"],
    done: true,
  },
]

export function ImprovementLoopPanel() {
  const [tokenSaving, setTokenSaving] = useState(true)
  const [stopOnMissing, setStopOnMissing] = useState(true)
  const [running, setRunning] = useState(false)

  return (
    <div className="space-y-4">
      <SectionCard title="Loop Settings" icon={<Settings2 className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-3">
          <InputField label="Target quality score" type="number" defaultValue={88} mono />
          <InputField label="Max iterations" type="number" defaultValue={2} mono />
          <SelectField label="Loop mode" options={["Conservative", "Balanced", "Aggressive"]} defaultValue="Balanced" />
        </div>
        <div className="mt-4 space-y-3 rounded-xl border border-border bg-surface-subtle p-3.5">
          <Toggle checked={tokenSaving} onChange={setTokenSaving} label="Token-saving mode" />
          <Toggle
            checked={stopOnMissing}
            onChange={setStopOnMissing}
            label="Stop when missing facts are found"
          />
        </div>
      </SectionCard>

      <SectionCard title="Run Controls" icon={<Play className="h-4 w-4" />}>
        <div className="flex flex-wrap gap-2">
          <ActionButton
            icon={<Play className="h-4 w-4" />}
            loading={running}
            loadingLabel="Running loop…"
            onClick={() => {
              setRunning(true)
              setTimeout(() => setRunning(false), 1600)
            }}
          >
            Run Improvement Loop
          </ActionButton>
          <ActionButton variant="outline" icon={<Square className="h-4 w-4" />} onClick={() => setRunning(false)}>
            Stop Loop
          </ActionButton>
          <ActionButton variant="secondary" icon={<CheckCheck className="h-4 w-4" />}>
            Apply Best Draft
          </ActionButton>
        </div>
      </SectionCard>

      <SectionCard title="Quality Score" icon={<Gauge className="h-4 w-4" />}>
        <div className="mb-4 flex items-center gap-4 rounded-xl bg-primary-soft/60 p-4">
          <div className="text-3xl font-semibold text-primary-dark">
            93<span className="text-base font-normal text-text-secondary"> / 100</span>
          </div>
          <Badge tone="success">Target reached</Badge>
        </div>
        <div className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
          {scores.map((s) => (
            <ProgressBar key={s.label} label={s.label} value={s.value} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Iteration Timeline" icon={<GitBranch className="h-4 w-4" />}>
        <ol className="space-y-3">
          {iterations.map((it) => (
            <li key={it.title} className="rounded-xl border border-border bg-surface-subtle p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{it.title}</span>
                <Badge tone={it.done ? "success" : "muted"}>Score {it.score}</Badge>
              </div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
                {it.heading}
              </p>
              <ul className="space-y-1">
                {it.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-5 text-text-secondary">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title="Blocking Questions" icon={<HelpCircle className="h-4 w-4" />}>
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <PriorityBadge priority="High" />
          <p className="text-sm leading-5 text-amber-900">
            Confirm the exact status code returned for a duplicate{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-[12px]">user_id</code> before
            finalizing the error responses section.
          </p>
        </div>
      </SectionCard>
    </div>
  )
}
