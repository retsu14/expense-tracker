import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Plan" };

export default function PlanPage() {
  return (
    <>
      <PageHeader title="Plan" description="Budgets, bills, goals and debts." />
      <EmptyState
        title="No budgets yet"
        description="Set a monthly or per-payday budget and Oink will keep an eye on it."
      />
    </>
  );
}
