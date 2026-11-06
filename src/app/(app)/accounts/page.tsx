import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Accounts" };

export default function AccountsPage() {
  return (
    <>
      <PageHeader title="Accounts" description="Cash, GCash, Maya, banks and cards." />
      <EmptyState
        title="No wallets yet"
        description="Add where your money lives to track balances."
      />
    </>
  );
}
