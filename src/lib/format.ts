const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export function relativeTime(date: Date, now = new Date()) {
  const diff = date.getTime() - now.getTime();
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

const BROWSERS: [string, string][] = [
  ["Edg/", "Edge"],
  ["OPR/", "Opera"],
  ["Chrome/", "Chrome"],
  ["Firefox/", "Firefox"],
  ["Safari/", "Safari"],
];

const SYSTEMS: [string, string][] = [
  ["iPhone", "iOS"],
  ["iPad", "iOS"],
  ["Android", "Android"],
  ["Windows", "Windows"],
  ["Mac OS X", "macOS"],
  ["Linux", "Linux"],
];

const match = (ua: string, table: [string, string][]) =>
  table.find(([needle]) => ua.includes(needle))?.[1];

export function describeDevice(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  const browser = match(userAgent, BROWSERS) ?? "Browser";
  const os = match(userAgent, SYSTEMS);
  return os ? `${browser} on ${os}` : browser;
}
