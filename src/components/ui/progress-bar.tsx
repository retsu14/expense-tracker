import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  status?: "ok" | "warn" | "over" | "goal";
  label: string;
  className?: string;
};

export function ProgressBar({ value, status = "ok", label, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300 ease-out-soft",
          status === "ok" && "bg-income",
          status === "warn" && "bg-warning",
          status === "over" && "bg-expense",
          status === "goal" && "bg-pig",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
