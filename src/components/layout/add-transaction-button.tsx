"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

export function AddTransactionButton({ label = "Add transaction" }: { label?: string }) {
  const setQuickAddOpen = useUiStore((s) => s.setQuickAddOpen);
  return (
    <Button
      onClick={() => {
        setQuickAddOpen(true);
      }}
    >
      <Plus aria-hidden />
      {label}
    </Button>
  );
}
