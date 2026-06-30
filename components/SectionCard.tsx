"use client";

import { useState } from "react";

type SectionCardProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  right?: React.ReactNode;
  children: React.ReactNode;
};

export default function SectionCard({
  title,
  description,
  defaultOpen = true,
  collapsible = true,
  right,
  children,
}: SectionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => collapsible && setOpen((v) => !v)}
          className={`flex flex-1 items-center gap-2 text-left ${
            collapsible ? "cursor-pointer" : "cursor-default"
          }`}
          aria-expanded={open}
        >
          {collapsible && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`h-4 w-4 text-slate-400 transition-transform ${
                open ? "rotate-90" : ""
              }`}
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
        </button>
        {right}
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-4">
          {children}
        </div>
      )}
    </section>
  );
}
