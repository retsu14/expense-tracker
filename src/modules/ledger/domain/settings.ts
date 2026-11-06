export type PaydaySchedule =
  | { type: "semi_monthly"; days: [number, number] }
  | { type: "monthly"; day: number }
  | { type: "weekly"; weekday: number }
  | { type: "none" };

export type UserSettings = {
  userId: string;
  timezone: string;
  payday: PaydaySchedule;
  monthlyIncome: number | null;
  onboardedAt: Date | null;
};

export const DEFAULT_PAYDAY: PaydaySchedule = { type: "semi_monthly", days: [15, 30] };
