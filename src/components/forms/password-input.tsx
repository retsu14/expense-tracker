"use client";

import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

export function PasswordInput({ className, onFocus, onBlur, ...props }: ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  const setPasswordState = useUiStore((s) => s.setPasswordState);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        className={cn("pr-12", className)}
        onFocus={(e) => {
          setPasswordState({ focused: true, visible });
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setPasswordState({ focused: false });
          onBlur?.(e);
        }}
        {...props}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onMouseDown={(e) => {
          e.preventDefault();
        }}
        onClick={() => {
          setVisible((v) => !v);
          setPasswordState({ visible: !visible });
        }}
        className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-sm text-fg-muted hover:text-fg"
      >
        {visible ? (
          <EyeOff className="size-5" aria-hidden />
        ) : (
          <Eye className="size-5" aria-hidden />
        )}
      </button>
    </div>
  );
}
