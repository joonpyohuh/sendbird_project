"use client";

import ModeCard from "./ModeCard";
import ShellControls from "./ShellControls";
import { useAppPreferences } from "./AppPreferencesProvider";
import { getModes, type ActiveTab } from "./types";

type PremiumShellProps = {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  error?: string | null;
  onDismissError?: () => void;
  children: React.ReactNode;
};

export default function PremiumShell({
  activeTab,
  onTabChange,
  error,
  onDismissError,
  children,
}: PremiumShellProps) {
  const { t } = useAppPreferences();
  const modes = getModes(t);
  const isActive = activeTab !== null;
  const current = modes.find((m) => m.id === activeTab);

  return (
    <div className="premium-app relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-[#09090b] dark:text-slate-100">
      <ShellControls />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.08),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]"
        aria-hidden="true"
      />

      <div className="relative flex min-h-screen flex-col md:flex-row">
        <div
          className={`flex shrink-0 flex-col transition-[width,padding] duration-500 ease-out ${
            isActive
              ? "w-full border-b border-slate-200 md:h-screen md:w-[280px] md:border-b-0 md:border-r dark:border-slate-800/80 lg:w-[300px]"
              : "w-full"
          }`}
        >
          <div
            className={`px-6 pr-28 transition-all duration-500 md:pr-6 ${
              isActive ? "py-5 md:py-8" : "py-8 md:py-12"
            }`}
          >
            <button
              type="button"
              onClick={() => onTabChange(null)}
              className="group text-left transition-opacity duration-300 hover:opacity-80"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500">
                {t("shell.brandEyebrow")}
              </p>
              <p
                className={`mt-1 font-semibold tracking-tight text-slate-900 transition-all duration-500 dark:text-white ${
                  isActive ? "text-base" : "text-xl md:text-2xl"
                }`}
              >
                {t("shell.brandTitle")}
              </p>
            </button>
          </div>

          {!isActive && (
            <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 md:px-10">
              <div className="grid w-full max-w-4xl gap-4 md:grid-cols-3 md:gap-5">
                {modes.map((mode, index) => (
                  <ModeCard
                    key={mode.id}
                    title={mode.title}
                    subtitle={mode.subtitle}
                    badge={mode.badge}
                    openLabel={t("shell.openWorkspace")}
                    delayMs={index * 120}
                    onClick={() => onTabChange(mode.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {isActive && (
            <nav className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-col md:gap-1.5 md:overflow-visible md:px-4 md:pb-8">
              {modes.map((mode) => (
                <ModeCard
                  key={mode.id}
                  compact
                  active={activeTab === mode.id}
                  title={mode.title}
                  subtitle={mode.subtitle}
                  badge={mode.badge}
                  openLabel={t("shell.openWorkspace")}
                  onClick={() => onTabChange(mode.id)}
                />
              ))}
            </nav>
          )}
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col transition-all duration-500 ease-out ${
            isActive
              ? "translate-x-0 opacity-100"
              : "pointer-events-none w-0 overflow-hidden opacity-0"
          }`}
        >
          {isActive && (
            <div className="animate-slide-in-right flex h-full min-h-[50vh] flex-col md:min-h-screen md:max-h-screen md:overflow-hidden">
              <header className="shrink-0 border-b border-slate-200 px-6 py-5 pr-28 dark:border-slate-800/80 md:px-8 md:pr-8">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                  {t("shell.activeWorkspace")}
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-2xl">
                  {current?.title}
                </h1>
                <p className="mt-1 text-sm text-slate-500">{current?.subtitle}</p>
              </header>

              {error && (
                <div className="mx-6 mt-4 shrink-0 md:mx-8">
                  <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/[0.08] dark:text-rose-200">
                    <span className="flex-1">{error}</span>
                    {onDismissError && (
                      <button
                        type="button"
                        onClick={onDismissError}
                        className="text-rose-400/80 transition hover:text-rose-600 dark:hover:text-rose-200"
                        aria-label={t("controls.close")}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="premium-content flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8">
                {children}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
