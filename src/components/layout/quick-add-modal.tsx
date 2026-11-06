"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { useUiStore } from "@/stores/ui-store";

export function QuickAddModal() {
  const open = useUiStore((s) => s.quickAddOpen);
  const setOpen = useUiStore((s) => s.setQuickAddOpen);

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen} title="Add transaction">
      <EmptyState
        title="Almost ready"
        description="Quick-add arrives with wallets and categories."
        className="border-none py-6"
      />
    </ResponsiveModal>
  );
}
