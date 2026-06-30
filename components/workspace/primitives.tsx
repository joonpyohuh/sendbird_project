"use client"

import {
  type ReactNode,
  type TextareaHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  useState,
} from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function SectionCard({
  title,
  description,
  icon,
  actions,
  children,
  className,
  contentClassName,
}: {
  title?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm shadow-primary/5",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="flex items-start gap-2.5">
            {icon && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-dark">
                {icon}
              </span>
            )}
            <div>
              {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
              {description && (
                <p className="mt-0.5 text-xs leading-5 text-text-secondary">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", contentClassName)}>{children}</div>
    </section>
  )
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline"

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-dark border border-transparent",
  secondary:
    "bg-primary-soft text-primary-dark hover:bg-primary-soft/70 border border-border",
  outline: "bg-card text-foreground hover:bg-surface-subtle border border-border",
  ghost: "bg-transparent text-text-secondary hover:bg-surface-subtle border border-transparent",
}

export function ActionButton({
  children,
  variant = "primary",
  icon,
  loading = false,
  loadingLabel,
  className,
  size = "md",
  ...props
}: {
  children: ReactNode
  variant?: ButtonVariant
  icon?: ReactNode
  loading?: boolean
  loadingLabel?: string
  size?: "sm" | "md"
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-3.5 py-2 text-sm",
        buttonVariants[variant],
        className,
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {loading ? loadingLabel ?? children : children}
    </button>
  )
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-text-secondary">
      {children}
    </label>
  )
}

const fieldBase =
  "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-text-muted shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"

export function TextAreaField({
  label,
  mono,
  className,
  rows = 4,
  ...props
}: { label?: string; mono?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <textarea
        rows={rows}
        className={cn(fieldBase, "resize-y leading-6", mono && "font-mono text-[13px]", className)}
        {...props}
      />
    </div>
  )
}

export function InputField({
  label,
  mono,
  className,
  ...props
}: { label?: string; mono?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input className={cn(fieldBase, mono && "font-mono text-[13px]", className)} {...props} />
    </div>
  )
}

export function SelectField({
  label,
  options,
  className,
  ...props
}: {
  label?: string
  options: Array<string | { value: string; label: string }>
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="relative">
        <select
          className={cn(fieldBase, "appearance-none pr-9", className)}
          {...props}
        >
          {options.map((opt) => {
            const value = typeof opt === "string" ? opt : opt.value
            const labelText = typeof opt === "string" ? opt : opt.label
            return (
              <option key={value} value={value}>
                {labelText}
              </option>
            )
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </div>
    </div>
  )
}

export function Collapsible({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: ReactNode
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-subtle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-text-muted transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="space-y-3 border-t border-border bg-card px-3.5 py-3.5">{children}</div>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-subtle px-6 py-8 text-center">
      {icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary-dark">
          {icon}
        </span>
      )}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-text-secondary">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; icon?: ReactNode }[]
  active: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface-subtle p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            active === tab.id
              ? "bg-card text-primary-dark shadow-sm"
              : "text-text-secondary hover:text-foreground",
          )}
          aria-current={active === tab.id}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono font-medium text-foreground">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary-soft">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  )
}
