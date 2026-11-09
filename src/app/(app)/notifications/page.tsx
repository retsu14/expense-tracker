import type { Metadata } from "next";

import { NotificationList } from "@/components/plan/notification-list";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/modules/identity/presentation/dal";
import { listNotifications } from "@/modules/planning/application/planning.use-cases";
import { planningDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await listNotifications(planningDeps(), user.id);
  return (
    <>
      <PageHeader title="Notifications" />
      <NotificationList items={items} />
    </>
  );
}
