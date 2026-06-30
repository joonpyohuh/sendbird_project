type BentoItem = {
  label: string;
  value: string;
};

type BentoGuideProps = {
  items: BentoItem[];
};

export default function BentoGuide({ items }: BentoGuideProps) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 transition-colors duration-300 hover:border-slate-300 dark:border-slate-800/60 dark:bg-slate-900/20 dark:hover:border-slate-700/80"
        >
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            {item.label}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
