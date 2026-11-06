import type { TransactionKind } from "./transaction";

export type Template = {
  id: string;
  userId: string;
  name: string;
  kind: Exclude<TransactionKind, "transfer">;
  amount: number;
  categoryId: string;
  accountId: string | null;
  note: string;
  sort: number;
};

export const MAX_TEMPLATES = 12;
