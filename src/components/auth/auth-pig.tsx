"use client";

import { useEffect } from "react";

import { PigWithBubble } from "@/components/pig/pig-with-bubble";
import { useMounted } from "@/lib/use-mounted";
import { useUiStore } from "@/stores/ui-store";

export function AuthPig() {
  const mounted = useMounted();

  useEffect(() => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("oink-qa-ctx")) localStorage.removeItem(key);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);
  const cover = useUiStore((s) => s.passwordFocused && !s.passwordVisible);
  return (
    <div className="flex min-h-40 justify-center">
      {mounted && (
        <PigWithBubble
          size={104}
          mood="happy"
          coverEyes={cover}
          bubbleClassName="h-12"
          className="gap-1"
        />
      )}
    </div>
  );
}
