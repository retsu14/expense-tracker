import type { Metadata } from "next";

import { AddTransactionButton } from "@/components/layout/add-transaction-button";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <>
      <PageHeader title="Activity" description="Every peso in and out." />
      <EmptyState
        title="Nothing here yet"
        description="Your transactions will show up here, grouped by day."
        action={<AddTransactionButton />}
      />
    </>
  );
}
