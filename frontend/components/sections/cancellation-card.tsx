import { RotateCcw } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Card } from "@/components/ui/card";

export function CancellationCard({ dict }: { dict: Dictionary }) {
  const c = dict.howItWorks.cancellationCard;

  return (
    <Card className="w-full max-w-sm p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.55)]">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-full bg-warning-soft text-warning">
          <RotateCcw className="size-3.5" />
        </span>
        <p className="text-sm font-medium text-ink">{c.question}</p>
      </div>

      <div className="space-y-2">
        {c.options.map((option, index) => (
          <label
            key={option}
            className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-sm text-ink transition-colors has-checked:border-accent/40 has-checked:bg-accent-soft"
          >
            <input
              type="radio"
              name="cancel-reason"
              defaultChecked={index === 0}
              tabIndex={-1}
              className="size-3.5 accent-accent"
              readOnly
            />
            {option}
          </label>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">{c.footnote}</p>
    </Card>
  );
}
