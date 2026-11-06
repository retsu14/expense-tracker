import type { Metadata } from "next";

import { CategoriesManager } from "@/components/categories/categories-manager";
import { PageHeader } from "@/components/layout/page-header";
import { requireUser } from "@/modules/identity/presentation/dal";
import { ledgerDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const user = await requireUser();
  const { ledger } = ledgerDeps();
  const [categories, templates] = await Promise.all([
    ledger.listCategories(user.id, true),
    ledger.listTemplates(user.id),
  ]);

  return (
    <>
      <PageHeader title="Categories" description="Organize where your money goes." />
      <CategoriesManager categories={categories} templates={templates} />
    </>
  );
}
