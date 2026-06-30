export default function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m-6-8h6M5 5.5A1.5 1.5 0 0 1 6.5 4H16l3 3v11.5A1.5 1.5 0 0 1 17.5 20h-11A1.5 1.5 0 0 1 5 18.5v-13Z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">
              API Doc Workspace
            </h1>
            <p className="text-sm text-slate-500">
              AI-assisted workspace for API documentation
            </p>
          </div>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
          Technical Writer AX Tool
        </span>
      </div>
    </header>
  );
}
