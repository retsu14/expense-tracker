import { useId } from "react";

export function GoalPig({ pct, size = 72 }: { pct: number; size?: number }) {
  const id = useId();
  const level = 60 - (Math.max(0, Math.min(100, pct)) / 100) * 48;

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        <clipPath id={`${id}-body`}>
          <path d="M14 18 L10 6 L24 13 Z" />
          <path d="M50 18 L54 6 L40 13 Z" />
          <circle cx="32" cy="34" r="24" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-body)`}>
        <rect width="64" height="64" fill="var(--surface-2)" />
        <rect
          y={level}
          width="64"
          height="64"
          fill="var(--pig)"
          className="transition-[y] duration-500 ease-out-soft"
        />
      </g>
      <path d="M14 18 L10 6 L24 13 Z" fill="none" stroke="var(--pig-blush)" strokeWidth="1.5" />
      <path d="M50 18 L54 6 L40 13 Z" fill="none" stroke="var(--pig-blush)" strokeWidth="1.5" />
      <circle cx="32" cy="34" r="24" fill="none" stroke="var(--pig-blush)" strokeWidth="1.5" />
      <rect x="27" y="10" width="10" height="3" rx="1.5" fill="var(--fg-muted)" />
      <circle cx="23" cy="30" r="2.5" fill="#2b1d22" />
      <circle cx="41" cy="30" r="2.5" fill="#2b1d22" />
      <ellipse cx="32" cy="41" rx="8" ry="5.5" fill="var(--pig-blush)" />
      <ellipse cx="29.5" cy="41" rx="1.5" ry="2" fill="#7a3b4a" />
      <ellipse cx="34.5" cy="41" rx="1.5" ry="2" fill="#7a3b4a" />
    </svg>
  );
}
