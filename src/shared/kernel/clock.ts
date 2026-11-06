export type Clock = {
  now(): Date;
};

export const systemClock: Clock = { now: () => new Date() };

export const DEFAULT_TIMEZONE = "Asia/Manila";
