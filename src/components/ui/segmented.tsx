"use client";

import { RadioGroup } from "radix-ui";

import { cn } from "@/lib/utils";

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  className?: string;
};

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: SegmentedProps<T>) {
  return (
    <RadioGroup.Root
      aria-label={label}
      value={value}
      onValueChange={(v) => {
        onChange(v as T);
      }}
      className={cn(
        "grid auto-cols-fr grid-flow-col gap-1 rounded-md border border-border bg-bg p-1",
        className,
      )}
    >
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          className="h-10 cursor-pointer rounded-sm px-3 text-body-sm font-semibold text-fg-muted transition-colors duration-120 hover:text-fg data-[state=checked]:bg-surface-2 data-[state=checked]:text-fg"
        >
          {o.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
