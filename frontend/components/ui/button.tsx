import Link from "next/link";
import { cn } from "@/lib/utils";

type CommonProps = {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "md" | "lg" | "sm";
  className?: string;
  children: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:ring-accent disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<NonNullable<CommonProps["variant"]>, string> = {
  primary:
    "bg-accent text-on-accent shadow-[0_0_0_1px_rgba(34,197,94,0.15),0_8px_30px_rgba(34,197,94,0.12)] hover:bg-accent-dark active:bg-accent-dark",
  secondary:
    "bg-surface text-ink border border-border hover:border-border-strong hover:bg-elevated",
  outline: "bg-transparent text-ink border border-border hover:border-border-strong hover:bg-surface",
  ghost: "bg-transparent text-ink hover:bg-surface",
};

const sizes: Record<NonNullable<CommonProps["size"]>, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] px-7 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  href,
  ...props
}: CommonProps &
  (
    | ({ href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">)
    | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">)
  )) {
  const classes = cn(base, variants[variant], sizes[size], className);

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        {...(props as Omit<React.ComponentProps<typeof Link>, "href" | "className">)}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      {...(props as Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className">)}
    >
      {children}
    </button>
  );
}
