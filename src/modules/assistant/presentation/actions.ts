"use server";

import { requireUser } from "@/modules/identity/presentation/dal";
import { analyticsDeps } from "@/shared/container";

import { assistantSnapshot } from "../application/snapshot.use-cases";

export async function assistantSnapshotAction() {
  const user = await requireUser();
  return assistantSnapshot(analyticsDeps(), user);
}
