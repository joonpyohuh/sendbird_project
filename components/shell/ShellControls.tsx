"use client";

import { useAppPreferences } from "./AppPreferencesProvider";

export default function ShellControls() {
  const { locale, theme, toggleLocale, toggleTheme, t } = useAppPreferences();

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-2 md:right-6 md:top-6">
      <button
        type="button"
        onClick={toggleLocale}
        className="flex h-9 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/90 px-3 text-xs font-medium text-slate-600 shadow-sm backdrop-blur transition-all duration-300 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
        aria-label={t("controls.language")}
        title={t("controls.language")}
      >
        <span
          className={`transition-colors ${locale === "ko" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}
        >
          KO
        </span>
        <span className="text-slate-300 dark:text-slate-600">|</span>
        <span
          className={`transition-colors ${locale === "en" ? "text-blue-600 dark:text-blue-400" : "text-slate-400"}`}
        >
          EN
        </span>
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-600 shadow-sm backdrop-blur transition-all duration-300 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
        aria-label={theme === "dark" ? t("controls.light") : t("controls.dark")}
        title={theme === "dark" ? t("controls.light") : t("controls.dark")}
      >
        {theme === "dark" ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.061 1.06l1.06 1.061ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.061-1.06a.75.75 0 1 0-1.06 1.06l1.06 1.06Z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
            <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 9.958.75.75 0 0 1 .77.26A7.001 7.001 0 0 1 7.455 2.004ZM4.75 10a5.25 5.25 0 1 0 10.5 0 5.25 5.25 0 0 0-10.5 0Z" clipRule="evenodd" />
          </svg>
        )}
      </button>
    </div>
  );
}
