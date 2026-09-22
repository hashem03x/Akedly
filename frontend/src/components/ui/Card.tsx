import type { HTMLAttributes, ReactNode } from "react";
import { clsx } from "@/lib/clsx";

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={clsx("rounded-md border border-border bg-surface", className)} {...props}>
      {children}
    </div>
  );
}
