import { DomainError, err, ok, type Result } from "@/shared/kernel/result";

export const ACCOUNT_TYPES = ["cash", "ewallet", "bank", "card"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash: "Cash",
  ewallet: "E-wallet",
  bank: "Bank",
  card: "Credit card",
};

export type Account = {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
  archived: boolean;
  sort: number;
  createdAt: Date;
};

export type AccountWithBalance = Account & { balance: number };

export const SUGGESTED_ACCOUNTS: { name: string; type: AccountType; color: string }[] = [
  { name: "Cash", type: "cash", color: "#8FB996" },
  { name: "GCash", type: "ewallet", color: "#7FB3D5" },
  { name: "Maya", type: "ewallet", color: "#8FD1B0" },
  { name: "Bank", type: "bank", color: "#B59AD6" },
  { name: "Credit card", type: "card", color: "#E09090" },
];

export const MAX_ACCOUNTS = 30;

export function validateAccountName(input: string): Result<string> {
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 30) {
    return err(
      new DomainError("invalid_account_name", "Name must be 1–30 characters.", {
        name: ["Name must be 1–30 characters."],
      }),
    );
  }
  return ok(name);
}
