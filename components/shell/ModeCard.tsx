"use client";

type ModeCardProps = {
  title: string;
  subtitle: string;
  badge?: string;
  openLabel?: string;
  delayMs?: number;
  compact?: boolean;
  active?: boolean;
  onClick: () => void;
};

export default function ModeCard({
  title,
  subtitle,
  badge,
  openLabel = "Open workspace →",
  delayMs = 0,
  compact = false,
  active = false,
  onClick,
}: ModeCardProps) {
  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group w-full rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 ${
          active
            ? "border-blue-500/40 bg-blue-500/[0.08] shadow-[0_0_0_1px_rgba(59,130,246,0.15)]"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800/80 dark:bg-slate-900/20 dark:hover:border-slate-700 dark:hover:bg-slate-900/40"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-sm font-medium tracking-tight ${
              active
                ? "text-slate-900 dark:text-white"
                : "text-slate-700 group-hover:text-slate-900 dark:text-slate-200 dark:group-hover:text-white"
            }`}
          >
            {title}
          </span>
          {badge && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {badge}
            </span>
          )}
        </div>
        {!active && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">{subtitle}</p>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${delayMs}ms` }}
      className="group animate-fade-in-up opacity-0 rounded-3xl border border-slate-200 bg-white p-8 text-left shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:border-slate-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 dark:border-slate-800/80 dark:bg-slate-900/30 dark:hover:border-slate-700 dark:hover:bg-slate-900/50 dark:hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-inset ring-blue-500/20 transition-colors duration-300 group-hover:bg-blue-500/15">
          <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
        </div>
        {badge && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium tracking-wide text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-400">
            {badge}
          </span>
        )}
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-500 transition-colors duration-300 group-hover:text-slate-600 dark:group-hover:text-slate-400">
        {subtitle}
      </p>
      <p className="mt-6 text-xs font-medium text-slate-400 transition-colors duration-300 group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-blue-400/80">
        {openLabel}
      </p>
    </button>
  );
}
