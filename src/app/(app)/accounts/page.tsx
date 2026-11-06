import type { Metadata } from "next";

import { AccountsManager } from "@/components/accounts/accounts-manager";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/modules/identity/presentation/dal";
import { ledgerDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await ledgerDeps().ledger.listAccounts(user.id, true);

  return (
    <>
      <PageHeader title="Accounts" description="Cash, e-wallets, banks and cards." />
      <AccountsManager accounts={accounts} />
    </>
  );
}
