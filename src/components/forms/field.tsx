import type { ReactElement, ReactNode } from "react";
import { cloneElement } from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldProps = {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: ReactNode;
  className?: string;
  children: ReactElement<{
    id?: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }>;
};

export function Field({ id, label, error, hint, className, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, {
        id,
        ...(error ? { "aria-invalid": true } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
      })}
      {error && (
        <p id={errorId} className="text-body-sm text-expense">
          {error}
        </p>
      )}
      {hint && !error && (
        <div id={hintId} className="text-caption font-normal text-fg-muted">
          {hint}
        </div>
      )}
    </div>
  );
}
