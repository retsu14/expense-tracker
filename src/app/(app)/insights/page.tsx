import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" description="Where your money goes." />
      <EmptyState
        title="Not enough data"
        description="Add a few transactions and your charts will appear here."
      />
    </>
  );
}
