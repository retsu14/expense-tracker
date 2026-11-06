"use client";

import { useMounted } from "@/lib/use-mounted";
import { formatPeso } from "@/lib/money";
import { useSettingsStore } from "@/stores/settings-store";

export function useMoneyFormat() {
  const mounted = useMounted();
  const hidden = useSettingsStore((s) => s.hideAmounts) && mounted;
  return {
    hidden,
    full: (c: number) => (hidden ? "₱•••" : formatPeso(c)),
    compact: (c: number) => (hidden ? "•••" : formatPeso(c, { compact: true })),
  };
}
