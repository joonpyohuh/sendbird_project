type Option = { value: string; label: string };

type SelectFieldProps = {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
};

export default function SelectField({
  label,
  value,
  options,
  onChange,
}: SelectFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
