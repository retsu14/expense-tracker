import { PageHeader } from "@/components/layout/page-header";
import { PlanTabs } from "@/components/plan/plan-tabs";

export default function PlanLayout({ children }: LayoutProps<"/plan">) {
  return (
    <>
      <PageHeader title="Plan" />
      <PlanTabs />
      {children}
    </>
  );
}
