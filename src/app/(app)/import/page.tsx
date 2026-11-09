import type { Metadata } from "next";

import { ImportWizard } from "@/components/import/import-wizard";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/modules/identity/presentation/dal";
import { ledgerDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const user = await requireUser();
  const accounts = await ledgerDeps().ledger.listAccounts(user.id);
  return (
    <>
      <PageHeader title="Import transactions" description="CSV from your bank, GCash or a sheet." />
      <ImportWizard accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
    </>
  );
}
