"use client";

import { startTransition, type SubmitEvent, useActionState } from "react";

import type { ActionResult } from "@/shared/kernel/result";

export function useFormAction<T>(
  action: (prev: ActionResult<T> | null, form: FormData) => Promise<ActionResult<T>>,
) {
  const [state, dispatch, pending] = useActionState(action, null);

  const onSubmit = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    startTransition(() => {
      dispatch(form);
    });
  };

  const fieldError = (name: string) =>
    state && !state.ok ? state.error.fieldErrors?.[name]?.[0] : undefined;

  const formError =
    state && !state.ok && !state.error.fieldErrors ? state.error.message : undefined;

  const formProps = { action: dispatch, onSubmit };

  return { state, formProps, pending, fieldError, formError };
}
