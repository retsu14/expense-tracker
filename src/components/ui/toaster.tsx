"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "light" ? "light" : "dark"}
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      toastOptions={{
        classNames: {
          toast: "!bg-surface !text-fg !border-border !rounded-lg !font-sans",
          description: "!text-fg-muted",
          actionButton: "!bg-accent !text-accent-fg",
        },
      }}
    />
  );
}
