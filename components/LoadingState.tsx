export default function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm text-brand-700">
      <svg
        className="h-4 w-4 animate-spin"
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
      <span>{label}</span>
    </div>
  );
}
