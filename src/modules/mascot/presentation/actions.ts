"use server";

import { markCelebrated, wearOutfit } from "@/modules/mascot/application/mascot.use-cases";
import { requireUser } from "@/modules/identity/presentation/dal";
import { runAction } from "@/shared/action";
import { mascotDeps } from "@/shared/container";
import { ok } from "@/shared/kernel/result";

export async function celebratedAction() {
  const user = await requireUser();
  await markCelebrated(mascotDeps(), user.id);
}

export async function wearOutfitAction(outfit: string | null) {
  return runAction(async () => {
    const user = await requireUser();
    const res = await wearOutfit(mascotDeps(), user.id, outfit);
    return res.ok ? ok(res.value) : res;
  });
}
