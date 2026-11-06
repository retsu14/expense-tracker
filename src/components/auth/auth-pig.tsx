"use client";

import { Pig } from "@/components/pig/pig";
import { useMounted } from "@/lib/use-mounted";
import { useUiStore } from "@/stores/ui-store";

export function AuthPig() {
  const mounted = useMounted();
  const cover = useUiStore((s) => s.passwordFocused && !s.passwordVisible);
  return (
    <div className="flex h-28 justify-center">
      {mounted && <Pig size={112} mood="happy" coverEyes={cover} />}
    </div>
  );
}
