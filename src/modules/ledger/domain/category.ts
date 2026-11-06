import { DomainError, err, ok, type Result } from "@/shared/kernel/result";

export const CATEGORY_KINDS = ["expense", "income"] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORY_ICONS = [
  "utensils",
  "shopping-cart",
  "bus",
  "fuel",
  "zap",
  "home",
  "wifi",
  "shopping-bag",
  "heart-pulse",
  "graduation-cap",
  "users",
  "clapperboard",
  "repeat",
  "sparkles",
  "gift",
  "percent",
  "coffee",
  "plane",
  "paw-print",
  "baby",
  "dumbbell",
  "smartphone",
  "briefcase",
  "laptop",
  "store",
  "party-popper",
  "coins",
  "rotate-ccw",
  "wallet",
  "circle-dollar-sign",
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const CATEGORY_COLORS = [
  "#E09090",
  "#E3B96A",
  "#8FB996",
  "#7FB3D5",
  "#B59AD6",
  "#E8A87C",
  "#D98BB0",
  "#9AA5B1",
] as const;

export type Category = {
  id: string;
  userId: string;
  name: string;
  kind: CategoryKind;
  icon: CategoryIcon;
  color: string;
  archived: boolean;
  sort: number;
  system: "fees" | "debt_out" | "debt_in" | null;
};

type Seed = Pick<Category, "name" | "kind" | "icon" | "color"> & {
  system?: "fees" | "debt_out" | "debt_in";
};

const c = CATEGORY_COLORS;

export const DEFAULT_CATEGORIES: Seed[] = [
  { name: "Food", kind: "expense", icon: "utensils", color: c[0] },
  { name: "Groceries", kind: "expense", icon: "shopping-cart", color: c[2] },
  { name: "Transport", kind: "expense", icon: "bus", color: c[3] },
  { name: "Bills & Utilities", kind: "expense", icon: "zap", color: c[1] },
  { name: "Rent", kind: "expense", icon: "home", color: c[4] },
  { name: "Load & Internet", kind: "expense", icon: "wifi", color: c[3] },
  { name: "Shopping", kind: "expense", icon: "shopping-bag", color: c[6] },
  { name: "Health", kind: "expense", icon: "heart-pulse", color: c[0] },
  { name: "Education", kind: "expense", icon: "graduation-cap", color: c[4] },
  { name: "Family & Padala", kind: "expense", icon: "users", color: c[5] },
  { name: "Entertainment", kind: "expense", icon: "clapperboard", color: c[6] },
  { name: "Subscriptions", kind: "expense", icon: "repeat", color: c[7] },
  { name: "Personal Care", kind: "expense", icon: "sparkles", color: c[5] },
  { name: "Gifts", kind: "expense", icon: "gift", color: c[1] },
  { name: "Fees", kind: "expense", icon: "percent", color: c[7], system: "fees" },
  { name: "Other", kind: "expense", icon: "circle-dollar-sign", color: c[7] },
  { name: "Utang payments", kind: "expense", icon: "users", color: c[7], system: "debt_out" },
  { name: "Salary", kind: "income", icon: "briefcase", color: c[2] },
  { name: "Freelance", kind: "income", icon: "laptop", color: c[3] },
  { name: "Business", kind: "income", icon: "store", color: c[4] },
  { name: "13th Month", kind: "income", icon: "party-popper", color: c[1] },
  { name: "Allowance", kind: "income", icon: "coins", color: c[5] },
  { name: "Refund", kind: "income", icon: "rotate-ccw", color: c[6] },
  { name: "Other Income", kind: "income", icon: "wallet", color: c[7] },
  { name: "Utang collected", kind: "income", icon: "users", color: c[7], system: "debt_in" },
];

export function validateCategoryName(input: string): Result<string> {
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 30) {
    return err(
      new DomainError("invalid_category_name", "Name must be 1–30 characters.", {
        name: ["Name must be 1–30 characters."],
      }),
    );
  }
  return ok(name);
}
