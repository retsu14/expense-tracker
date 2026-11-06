"use client";

import { useMounted } from "@/lib/use-mounted";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";

type AmountProps = {
  value: number;
  kind?: "expense" | "income" | "transfer" | "neutral";
  sign?: boolean;
  compact?: boolean;
  className?: string;
};

export function Amount({ value, kind = "neutral", sign = false, compact, className }: AmountProps) {
  const mounted = useMounted();
  const hidden = useSettingsStore((s) => s.hideAmounts) && mounted;
  const signed =
    kind === "expense" ? -Math.abs(value) : kind === "income" ? Math.abs(value) : value;

  return (
    <span
      className={cn(
        "whitespace-nowrap tabular",
        kind === "income" && "text-income",
        kind === "expense" && sign && "text-fg",
        className,
      )}
    >
      {hidden ? "₱•••" : formatPeso(signed, { sign, ...(compact ? { compact } : {}) })}
    </span>
  );
}
