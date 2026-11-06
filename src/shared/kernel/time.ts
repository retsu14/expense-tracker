export type Ymd = string;

const pad = (n: number) => String(n).padStart(2, "0");

function partsIn(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function offsetMinutes(date: Date, tz: string) {
  const p = partsIn(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000);
}

export function toYmd(date: Date, tz: string): Ymd {
  const p = partsIn(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function isYmd(value: string): value is Ymd {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export function addDays(ymd: Ymd, days: number): Ymd {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function startOfMonth(ymd: Ymd): Ymd {
  return `${ymd.slice(0, 7)}-01`;
}

export function addMonths(ymd: Ymd, months: number): Ymd {
  const [y = 0, m = 1] = ymd.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + months, 1));
  return d.toISOString().slice(0, 10);
}

export function zonedStart(ymd: Ymd, tz: string): Date {
  const guess = new Date(`${ymd}T00:00:00Z`);
  const offset = offsetMinutes(guess, tz);
  const first = new Date(guess.getTime() - offset * 60_000);
  const corrected = offsetMinutes(first, tz);
  return corrected === offset ? first : new Date(guess.getTime() - corrected * 60_000);
}

export function zonedDateTime(ymd: Ymd, time: string, tz: string): Date {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return new Date(zonedStart(ymd, tz).getTime() + (h * 60 + m) * 60_000);
}
