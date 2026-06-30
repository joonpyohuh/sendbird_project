import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Tone = "default" | "primary" | "success" | "warning" | "danger" | "muted"

const toneStyles: Record<Tone, string> = {
  default: "bg-secondary text-secondary-foreground border-border",
  primary: "bg-primary text-primary-foreground border-transparent",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  muted: "bg-surface-subtle text-text-muted border-border",
}

export function Badge({
  children,
  tone = "default",
  className,
  icon,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  icon?: ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium leading-5",
        toneStyles[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

const methodStyles: Record<string, string> = {
  GET: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POST: "bg-primary-soft text-primary-dark border-border",
  PUT: "bg-amber-50 text-amber-700 border-amber-200",
  PATCH: "bg-sky-50 text-sky-700 border-sky-200",
  DELETE: "bg-red-50 text-red-700 border-red-200",
}

export function MethodBadge({ method, className }: { method: string; className?: string }) {
  const style = methodStyles[method.toUpperCase()] ?? methodStyles.POST
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs font-semibold tracking-wide",
        style,
        className,
      )}
    >
      {method.toUpperCase()}
    </span>
  )
}

type Priority = "High" | "Medium" | "Low"
const priorityTone: Record<Priority, Tone> = {
  High: "danger",
  Medium: "warning",
  Low: "muted",
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={priorityTone[priority]}>{priority}</Badge>
}

type Status = "Open" | "Answered" | "Applied"
const statusTone: Record<Status, Tone> = {
  Open: "warning",
  Answered: "primary",
  Applied: "success",
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>
}
