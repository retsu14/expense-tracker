import type { ComponentProps } from "react";

export function PigMark({ title, ...props }: ComponentProps<"svg"> & { title?: string }) {
  const a11y = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
  return (
    <svg viewBox="0 0 64 64" {...a11y} {...props}>
      <path d="M14 18 L10 6 L24 13 Z" fill="var(--pig-blush)" />
      <path d="M50 18 L54 6 L40 13 Z" fill="var(--pig-blush)" />
      <circle cx="32" cy="34" r="24" fill="var(--pig)" />
      <circle cx="22" cy="30" r="3" fill="#141414" />
      <circle cx="42" cy="30" r="3" fill="#141414" />
      <ellipse cx="32" cy="42" rx="10" ry="7" fill="var(--pig-blush)" />
      <ellipse cx="28.5" cy="42" rx="2" ry="2.6" fill="#7a3b4a" />
      <ellipse cx="35.5" cy="42" rx="2" ry="2.6" fill="#7a3b4a" />
      <ellipse cx="15" cy="38" rx="4" ry="2.4" fill="var(--pig-blush)" opacity="0.6" />
      <ellipse cx="49" cy="38" rx="4" ry="2.4" fill="var(--pig-blush)" opacity="0.6" />
    </svg>
  );
}
