"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect } from "react";

import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";

export function useSyncHiddenAmounts() {
  const hidden = useSettingsStore((s) => s.hideAmounts);
  useEffect(() => {
    document.documentElement.classList.toggle("amounts-hidden", hidden);
  }, [hidden]);
}

export function HideAmountsToggle({ className }: { className?: string }) {
  const mounted = useMounted();
  const hidden = useSettingsStore((s) => s.hideAmounts) && mounted;
  const update = useSettingsStore((s) => s.update);
  const Icon = hidden ? EyeOff : Eye;

  return (
    <button
      type="button"
      aria-pressed={hidden}
      aria-label={hidden ? "Show amounts" : "Hide amounts"}
      title={hidden ? "Show amounts" : "Hide amounts"}
      onClick={() => {
        update({ hideAmounts: !hidden });
      }}
      className={cn(
        "flex size-11 cursor-pointer items-center justify-center rounded-full text-fg-muted transition-colors duration-120 hover:bg-surface-2 hover:text-fg",
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}
