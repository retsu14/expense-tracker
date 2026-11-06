import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full min-w-0 rounded-sm border border-border bg-surface-2 px-3 text-body text-fg transition-colors duration-120 placeholder:text-fg-muted focus-visible:border-ring disabled:opacity-50 aria-invalid:border-expense",
        className,
      )}
      {...props}
    />
  );
}
