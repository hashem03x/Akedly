import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  optionalLabel,
  children,
}: {
  label: string;
  htmlFor: string;
  optionalLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-ink">
        <span>{label}</span>
        {optionalLabel ? <span className="text-xs font-normal text-muted">{optionalLabel}</span> : null}
      </label>
      {children}
    </div>
  );
}

export const inputClasses = cn(
  "h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-ink placeholder:text-subtle",
  "transition-colors focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15",
);
