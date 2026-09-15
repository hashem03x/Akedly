import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "muted" | "info" | "danger" | "warning";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-elevated text-ink border-border",
    accent: "bg-accent-soft text-accent border-accent/20",
    muted: "bg-elevated text-muted border-border",
    info: "bg-info-soft text-info border-info/20",
    danger: "bg-danger-soft text-danger border-danger/20",
    warning: "bg-warning-soft text-warning border-warning/20",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
