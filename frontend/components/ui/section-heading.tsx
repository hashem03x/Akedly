import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

export function SectionHeading({
  eyebrow,
  heading,
  sub,
  align = "center",
  className,
}: {
  eyebrow?: string;
  heading: string;
  sub?: string;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-start",
        className,
      )}
    >
      {eyebrow ? (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {heading}
      </h2>
      {sub ? (
        <p className="mt-4 text-balance text-lg text-muted">{sub}</p>
      ) : null}
    </Reveal>
  );
}
