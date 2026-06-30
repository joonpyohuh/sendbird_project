type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
};

export default function EmptyState({
  title,
  description,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      <div className="mb-2 text-slate-300">
        {icon ?? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12h6m-6 4h6m-6-8h6M6 4h9l4 4v12a0 0 0 0 1 0 0H6a0 0 0 0 1 0 0V4Z"
            />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-slate-400">{description}</p>
      )}
    </div>
  );
}
