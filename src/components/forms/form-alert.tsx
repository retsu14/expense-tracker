import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function FormAlert({
  tone = "error",
  children,
}: {
  tone?: "error" | "success" | "info";
  children: ReactNode;
}) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-body-sm",
        tone === "error" && "border-expense/40 bg-expense/10 text-fg",
        tone === "success" && "border-income/40 bg-income/10 text-fg",
        tone === "info" && "border-border bg-surface-2 text-fg",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          tone === "error" && "text-expense",
          tone === "success" && "text-income",
          tone === "info" && "text-fg-muted",
        )}
        aria-hidden
      />
      <div>{children}</div>
    </div>
  );
}
