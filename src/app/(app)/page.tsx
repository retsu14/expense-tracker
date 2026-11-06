import { AddTransactionButton } from "@/components/layout/add-transaction-button";
import { PageHeader } from "@/components/layout/page-header";
import { HomePig } from "@/components/pig/home-pig";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/modules/identity/presentation/dal";

export default async function HomePage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Home" description="Your money at a glance." />
      <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
        <Card className="flex items-center justify-center overflow-visible lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
          <HomePig name={user.displayName} pigName={user.pigName} />
        </Card>
        <Card className="lg:col-span-8 lg:row-start-1">
          <p className="text-body-sm text-fg-muted">Safe to spend today</p>
          <p className="mt-1 text-display-sm tabular md:text-display">₱0.00</p>
          <p className="mt-2 text-body-sm text-fg-muted">Set a budget to see your daily limit.</p>
        </Card>
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Budgets</CardTitle>
          </CardHeader>
          <p className="text-body-sm text-fg-muted">No budgets yet.</p>
        </Card>
        <div className="lg:col-span-12">
          <EmptyState
            title="No transactions yet"
            description="Log your first expense and Oink will start tracking for you."
            action={<AddTransactionButton />}
          />
        </div>
      </div>
    </>
  );
}
