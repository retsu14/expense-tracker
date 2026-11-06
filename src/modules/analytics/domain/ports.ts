import type { Ymd } from "@/shared/kernel/time";

import type { Totals } from "./insights";

export type CategoryTotal = {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
};

export type BigExpense = {
  id: string;
  note: string;
  categoryName: string | null;
  icon: string | null;
  color: string | null;
  amount: number;
  occurredAt: Date;
};

export type ExportRow = {
  occurredAt: Date;
  kind: string;
  amount: number;
  account: string;
  toAccount: string | null;
  category: string | null;
  note: string;
  tags: string[];
};

export type AnalyticsRepository = {
  totals(userId: string, from: Date, to: Date): Promise<Totals>;
  byCategory(userId: string, from: Date, to: Date): Promise<CategoryTotal[]>;
  monthly(
    userId: string,
    from: Date,
    to: Date,
    tz: string,
  ): Promise<{ month: string; expense: number; income: number }[]>;
  daily(
    userId: string,
    from: Date,
    to: Date,
    tz: string,
  ): Promise<{ day: Ymd; expense: number; income: number }[]>;
  weekday(
    userId: string,
    from: Date,
    to: Date,
    tz: string,
  ): Promise<{ weekday: number; expense: number }[]>;
  biggest(userId: string, from: Date, to: Date, limit: number): Promise<BigExpense[]>;
  topTags(
    userId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<{ tag: string; total: number; count: number }[]>;
  exportRows(userId: string, from: Date | null, to: Date | null): Promise<ExportRow[]>;
};
