import type { Metadata } from "next";

import { TrashList } from "@/components/activity/trash-list";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/modules/identity/presentation/dal";
import { getSettings, listTrash } from "@/modules/ledger/application/ledger.use-cases";
import { TRASH_RETENTION_DAYS } from "@/modules/ledger/domain/transaction";
import { ledgerDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Trash" };

export default async function TrashPage() {
  const user = await requireUser();
  const deps = ledgerDeps();
  const [items, settings] = await Promise.all([
    listTrash(deps, user.id),
    getSettings(deps, user.id),
  ]);

  return (
    <>
      <PageHeader title="Trash" description={`Kept for ${TRASH_RETENTION_DAYS} days.`} />
      <TrashList items={items} timezone={settings.timezone} />
    </>
  );
}
