"use client";

import { useCallback, useEffect } from "react";

import { useUiStore } from "@/stores/ui-store";

import { CommandPalette, useCommandPaletteShortcut } from "./command-palette";
import { useSyncHiddenAmounts } from "./hide-amounts-toggle";

export function KeyboardShortcuts() {
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen);
  const commandOpen = useUiStore((s) => s.commandOpen);
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const openPalette = useCallback(() => {
    setCommandOpen(true);
  }, [setCommandOpen]);

  useSyncHiddenAmounts();

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("add") !== "1") return;
    url.searchParams.delete("add");
    window.history.replaceState(null, "", url.pathname + url.search);
    setQuickAddOpen(true);
  }, [setQuickAddOpen]);
  useCommandPaletteShortcut(openPalette);

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

  return <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />;
}
