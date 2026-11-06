import "server-only";

import { syncPlanning } from "@/modules/planning/application/planning.use-cases";
import { planningDeps } from "@/shared/container";

const INTERVAL_MS = 2 * 60_000;
const lastRun = new Map<string, number>();

export async function maybeSyncPlanning(userId: string) {
  const now = Date.now();
  if (now - (lastRun.get(userId) ?? 0) < INTERVAL_MS) return;
  lastRun.set(userId, now);
  try {
    await syncPlanning(planningDeps(), userId);
  } catch (e) {
    lastRun.delete(userId);
    console.error("[planning-sync]", e);
  }
}
