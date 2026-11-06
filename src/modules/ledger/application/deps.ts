import type { LedgerRepository } from "@/modules/ledger/domain/ports";
import type { Clock } from "@/shared/kernel/clock";

export type LedgerDeps = {
  ledger: LedgerRepository;
  clock: Clock;
  newId: () => string;
};
