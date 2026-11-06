import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { RecapCard } from "@/components/insights/recap-card";
import { Button } from "@/components/ui/button";
import { monthlyRecap } from "@/modules/analytics/application/analytics.use-cases";
import { requireUser } from "@/modules/identity/presentation/dal";
import { analyticsDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Monthly recap" };

export default async function RecapPage({ searchParams }: PageProps<"/insights/recap">) {
  const user = await requireUser();
  const { m } = await searchParams;
  const recap = await monthlyRecap(analyticsDeps(), user.id, typeof m === "string" ? m : null);

  return (
    <div className="mx-auto grid max-w-md gap-4">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="icon" aria-label="Previous month">
          <Link href={`/insights/recap?m=${recap.prev}`}>
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <Link
          href="/insights"
          className="text-body-sm text-fg-muted underline-offset-4 hover:underline"
        >
          Back to Insights
        </Link>
        {recap.hasNext ? (
          <Button asChild variant="ghost" size="icon" aria-label="Next month">
            <Link href={`/insights/recap?m=${recap.next}`}>
              <ChevronRight aria-hidden />
            </Link>
          </Button>
        ) : (
          <span className="size-11" />
        )}
      </div>
      <RecapCard
        recap={recap}
        name={user.displayName.split(" ")[0] ?? user.displayName}
        pigName={user.pigName}
      />
    </div>
  );
}
