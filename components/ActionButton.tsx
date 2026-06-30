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
    "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-200 disabled:bg-brand-300",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:ring-brand-200 disabled:text-slate-400",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-200 disabled:text-slate-300",
  danger:
    "bg-white text-rose-600 ring-1 ring-inset ring-rose-200 hover:bg-rose-50 focus:ring-rose-200 disabled:text-rose-300",
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
