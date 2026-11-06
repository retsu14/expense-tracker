import "server-only";

import { DomainError, type ActionResult, type Result } from "@/shared/kernel/result";

export function formToObject(form: FormData) {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

export function failure(error: DomainError): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    },
  };
}

export async function runAction<T>(fn: () => Promise<Result<T>>): Promise<ActionResult<T>> {
  try {
    const result = await fn();
    return result.ok ? { ok: true, data: result.value } : failure(result.error);
  } catch (e) {
    if (e instanceof DomainError) return failure(e);
    if (isNextControlFlow(e)) throw e;
    console.error("[action]", e);
    return failure(new DomainError("unexpected", "Something went wrong. Please try again."));
  }
}

function isNextControlFlow(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof e.digest === "string" &&
    (e.digest.startsWith("NEXT_REDIRECT") || e.digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}
