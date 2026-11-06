"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup } from "radix-ui";

import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

const options = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <RadioGroup.Root
      aria-label="Theme"
      value={mounted ? (theme ?? "dark") : ""}
      onValueChange={setTheme}
      className="grid grid-cols-3 gap-1 rounded-md border border-border bg-bg p-1"
    >
      {options.map(({ value, label, icon: Icon }) => (
        <RadioGroup.Item
          key={value}
          value={value}
          className={cn(
            "flex h-11 cursor-pointer items-center justify-center gap-2 rounded-sm text-body-sm font-medium text-fg-muted transition-colors duration-120",
            "hover:text-fg data-[state=checked]:bg-surface-2 data-[state=checked]:text-fg",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
