import { cn } from "@/lib/utils";

const STROKE = {
  ok: "stroke-income",
  warn: "stroke-warning",
  over: "stroke-expense",
} as const;

export function Ring({
  value,
  status,
  label,
  caption,
  size = 76,
  className,
}: {
  value: number;
  status: keyof typeof STROKE;
  label: string;
  caption: string;
  size?: number;
  className?: string;
}) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 72 72" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle cx={36} cy={36} r={r} fill="none" strokeWidth={7} className="stroke-surface-2" />
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className={cn("transition-[stroke-dashoffset] duration-500", STROKE[status])}
        />
      </svg>
      <span className="relative text-center leading-tight" aria-hidden>
        <span className="block text-body-sm font-semibold tabular">{Math.round(value)}%</span>
        <span className="block text-[10px] text-fg-muted">{caption}</span>
      </span>
    </div>
  );
}
