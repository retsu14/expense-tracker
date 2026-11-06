import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full cursor-pointer appearance-none rounded-sm border border-border bg-surface-2 pr-10 pl-3 text-body text-fg focus-visible:border-ring aria-invalid:border-expense",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted"
        aria-hidden
      />
    </div>
  );
}
