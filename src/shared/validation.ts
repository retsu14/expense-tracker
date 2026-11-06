import { z } from "zod";

import { DomainError, err, ok, type Result } from "@/shared/kernel/result";

export function parse<T>(schema: z.ZodType<T>, input: unknown): Result<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return ok(parsed.data);
  const fieldErrors = z.flattenError(parsed.error).fieldErrors as Record<string, string[]>;
  return err(
    new DomainError("validation_failed", "Please check the highlighted fields.", fieldErrors),
  );
}
