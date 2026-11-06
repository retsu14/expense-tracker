import type { Ymd } from "@/shared/kernel/time";

import { daysBetween } from "./period";

export const GOAL_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type GoalStatus = (typeof GOAL_STATUSES)[number];

export type Goal = {
  id: string;
  userId: string;
  name: string;
  target: number;
  deadline: Ymd | null;
  icon: string;
  color: string;
  status: GoalStatus;
  completedAt: Date | null;
};

export type GoalWithProgress = Goal & {
  saved: number;
  pct: number;
  remaining: number;
  monthlyNeeded: number | null;
  daysLeft: number | null;
};

export function monthsBetween(from: Ymd, to: Ymd) {
  const [y1 = 0, m1 = 0, d1 = 0] = from.split("-").map(Number);
  const [y2 = 0, m2 = 0, d2 = 0] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

export function goalProgress(goal: Goal, saved: number, today: Ymd): GoalWithProgress {
  const remaining = Math.max(0, goal.target - saved);
  const pct = goal.target > 0 ? Math.min(100, (saved / goal.target) * 100) : 0;
  const daysLeft = goal.deadline ? daysBetween(today, goal.deadline) : null;
  const months = goal.deadline ? Math.max(1, monthsBetween(today, goal.deadline)) : null;
  return {
    ...goal,
    saved,
    pct: Math.round(pct * 10) / 10,
    remaining,
    daysLeft,
    monthlyNeeded: months === null || remaining === 0 ? null : Math.ceil(remaining / months),
  };
}
