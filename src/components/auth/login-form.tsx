"use client";

import Link from "next/link";

import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import { loginAction } from "@/modules/identity/presentation/actions";

export function LoginForm({ next, notice }: { next: string; notice?: string | undefined }) {
  const { formProps, pending, fieldError, formError } = useFormAction(loginAction);

  return (
    <form {...formProps} className="grid gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {notice && !formError && <FormAlert tone="info">{notice}</FormAlert>}
      {formError && <FormAlert>{formError}</FormAlert>}
      <Field id="username" label="Username" error={fieldError("username")}>
        <Input
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
        />
      </Field>
      <Field id="password" label="Password" error={fieldError("password")}>
        <PasswordInput name="password" autoComplete="current-password" required />
      </Field>
      <div className="-mt-1 flex justify-end">
        <Link
          href="/forgot-password"
          className="rounded-sm text-body-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <SubmitButton pending={pending} pendingLabel="Signing in…" size="lg" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
