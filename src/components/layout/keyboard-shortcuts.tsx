"use client";

import { useEffect } from "react";

import { useUiStore } from "@/stores/ui-store";

export function KeyboardShortcuts() {
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setQuickAddOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [setQuickAddOpen]);

  return null;
}
