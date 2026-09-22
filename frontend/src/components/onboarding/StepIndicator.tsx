import { clsx } from "@/lib/clsx";

interface StepIndicatorProps {
  steps: string[];
  currentIndex: number;
}

export function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-3 text-sm">
      {steps.map((label, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={clsx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                state === "done" && "border-accent bg-accent text-white",
                state === "current" && "border-accent text-accent",
                state === "upcoming" && "border-border text-muted"
              )}
            >
              {index + 1}
            </span>
            <span className={state === "upcoming" ? "text-muted" : "text-ink"}>{label}</span>
            {index < steps.length - 1 && <span className="mx-1 h-px w-6 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
