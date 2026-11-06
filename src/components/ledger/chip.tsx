import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Chip({
  selected,
  className,
  ...props
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-body-sm font-medium transition-colors duration-120 disabled:opacity-50",
        selected
          ? "border-accent bg-accent text-accent-fg"
          : "border-border bg-surface-2 text-fg hover:border-fg-muted",
        className,
      )}
      {...props}
    />
  );
}
