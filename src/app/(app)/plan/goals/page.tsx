import type { Metadata } from "next";

import { GoalsView } from "@/components/plan/goals-view";
import { requireUser } from "@/modules/identity/presentation/dal";
import { listGoals } from "@/modules/planning/application/planning.use-cases";
import { planningDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listGoals(planningDeps(), user.id);
  return <GoalsView goals={goals} />;
}
