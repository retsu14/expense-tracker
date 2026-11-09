import {
  advance,
  EMPTY_PROGRESS,
  isOutfit,
  isUnlocked,
  nextMilestone,
  type Outfit,
  pendingUnlock,
  unlockedCount,
} from "@/modules/mascot/domain/milestones";
import type { MascotRepository } from "@/modules/mascot/domain/ports";
import { DomainError, err, ok, type Result } from "@/shared/kernel/result";

export type MascotDeps = { mascot: MascotRepository };

export async function syncPigProgress(deps: MascotDeps, userId: string, balance: number) {
  const prev = (await deps.mascot.get(userId)) ?? EMPTY_PROGRESS;
  const progress = advance(prev, balance);
  if (progress.best !== prev.best || progress.outfit !== prev.outfit)
    await deps.mascot.save(userId, progress);
  return {
    progress,
    unlocked: unlockedCount(progress.best),
    pending: pendingUnlock(progress),
    next: nextMilestone(progress, balance),
  };
}

export async function markCelebrated(deps: MascotDeps, userId: string) {
  const p = await deps.mascot.get(userId);
  if (p) await deps.mascot.save(userId, { ...p, celebrated: unlockedCount(p.best) });
}

export async function wearOutfit(
  deps: MascotDeps,
  userId: string,
  outfit: unknown,
): Promise<Result<Outfit | null>> {
  const p = (await deps.mascot.get(userId)) ?? EMPTY_PROGRESS;
  if (outfit !== null && !(isOutfit(outfit) && isUnlocked(p.best, outfit)))
    return err(new DomainError("locked", "Save a bit more to unlock that one."));
  await deps.mascot.save(userId, { ...p, outfit });
  return ok(outfit);
}
