import "server-only";

import type { IdentityDeps } from "@/modules/identity/application/deps";
import type { LedgerDeps } from "@/modules/ledger/application/deps";
import type { PlanningDeps } from "@/modules/planning/application/planning.use-cases";
import { drizzlePlanningRepository } from "@/modules/planning/infrastructure/drizzle-planning.repository";
import { argon2Hasher, cryptoTokens } from "@/modules/identity/infrastructure/crypto";
import {
  drizzleRateLimiter,
  drizzleRecoveryCodeRepository,
  drizzleSessionRepository,
  drizzleUserRepository,
} from "@/modules/identity/infrastructure/drizzle-identity.repositories";
import { drizzleLedgerRepository } from "@/modules/ledger/infrastructure/drizzle-ledger.repository";
import { db } from "@/shared/db/client";
import { newId } from "@/shared/kernel/id";
import { systemClock } from "@/shared/kernel/clock";
import { r2Storage } from "@/shared/storage/r2-storage";

let identity: IdentityDeps | undefined;

export function identityDeps(): IdentityDeps {
  if (identity) return identity;
  const database = db();
  identity = {
    users: drizzleUserRepository(database),
    sessions: drizzleSessionRepository(database),
    recoveryCodes: drizzleRecoveryCodeRepository(database),
    rateLimiter: drizzleRateLimiter(database),
    hasher: argon2Hasher,
    tokens: cryptoTokens,
    storage: r2Storage,
    clock: systemClock,
    newId,
  };
  return identity;
}

let ledger: LedgerDeps | undefined;

export function ledgerDeps(): LedgerDeps {
  ledger ??= { ledger: drizzleLedgerRepository(db()), clock: systemClock, newId };
  return ledger;
}

let planning: PlanningDeps | undefined;

export function planningDeps(): PlanningDeps {
  planning ??= { planning: drizzlePlanningRepository(db()), ledger: ledgerDeps() };
  return planning;
}
