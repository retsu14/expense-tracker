export const MOODS = ["happy", "worried", "sad", "celebrating", "sleeping", "munch"] as const;

export type Mood = (typeof MOODS)[number];

export type MoodSignals = {
  hour: number;
  budgetUsedPct: number | null;
  alertPct?: number;
  justSaved?: boolean;
  milestoneReached?: boolean;
  idleMinutes?: number;
};

const NIGHT_START = 23;
const NIGHT_END = 5;
const IDLE_SLEEP_MINUTES = 30;

export function isNight(hour: number) {
  return hour >= NIGHT_START || hour < NIGHT_END;
}

export function deriveMood(signals: MoodSignals): Mood {
  const { hour, budgetUsedPct, alertPct = 80, idleMinutes = 0 } = signals;

  if (signals.milestoneReached) return "celebrating";
  if (signals.justSaved) return "munch";
  if (budgetUsedPct !== null && budgetUsedPct > 100) return "sad";
  if (budgetUsedPct !== null && budgetUsedPct >= alertPct) return "worried";
  if (isNight(hour) || idleMinutes >= IDLE_SLEEP_MINUTES) return "sleeping";
  return "happy";
}
