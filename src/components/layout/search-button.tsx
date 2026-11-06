"use client";

import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

export function SearchButton({ compact, className }: { compact?: boolean; className?: string }) {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  return (
    <button
      type="button"
      aria-label={compact ? "Search and commands" : undefined}
      aria-keyshortcuts="Control+K Meta+K"
      onClick={() => {
        setCommandOpen(true);
      }}
      className={cn(
        compact
          ? "flex size-11 cursor-pointer items-center justify-center rounded-full text-fg-muted hover:bg-surface-2 hover:text-fg"
          : "flex h-10 w-full cursor-pointer items-center gap-2 rounded-md border border-border bg-bg px-3 text-body-sm text-fg-muted hover:text-fg",
        className,
      )}
    >
      <Search className="size-4" aria-hidden />
      {!compact && (
        <>
          <span className="flex-1 text-left">Search</span>
          <kbd aria-hidden className="rounded border border-border px-1.5 text-caption">
            Ctrl K
          </kbd>
        </>
      )}
    </button>
  );
}
