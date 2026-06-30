type Variant = "primary" | "secondary" | "ghost" | "danger";

type ActionButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
  size?: "sm" | "md";
  title?: string;
};

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500/30 disabled:bg-blue-300 disabled:text-blue-100 dark:disabled:bg-blue-900/50 dark:disabled:text-blue-200/50",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:ring-blue-500/20 disabled:text-slate-400 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800/80 dark:disabled:text-slate-600",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200 disabled:text-slate-300 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200 dark:focus:ring-slate-700 dark:disabled:text-slate-600",
  danger:
    "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 focus:ring-rose-200 disabled:text-rose-300 dark:bg-rose-500/[0.08] dark:text-rose-300 dark:ring-rose-500/20 dark:hover:bg-rose-500/[0.12] dark:focus:ring-rose-500/20 dark:disabled:text-rose-900",
};

export default function ActionButton({
  children,
  onClick,
  variant = "secondary",
  disabled = false,
  loading = false,
  loadingText,
  fullWidth = false,
  size = "md",
  title,
}: ActionButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium shadow-sm outline-none transition focus:ring-2 disabled:cursor-not-allowed ${
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-sm"
      } ${VARIANT_STYLES[variant]} ${fullWidth ? "w-full" : ""}`}
    >
      {loading && (
        <svg
          className="h-3.5 w-3.5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
