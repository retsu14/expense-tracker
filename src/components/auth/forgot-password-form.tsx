"use client";

import { useRouter } from "next/navigation";

import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/modules/identity/presentation/actions";

export function ForgotPasswordForm() {
  const router = useRouter();
  const { state, formProps, pending, fieldError, formError } = useFormAction(resetPasswordAction);

  if (state?.ok) {
    const left = state.data.remainingCodes;
    return (
      <div className="grid gap-4">
        <h1 className="text-h1-sm">Password updated</h1>
        <FormAlert tone="success">You&apos;re signed in. Other devices were signed out.</FormAlert>
        <p className="text-body-sm text-fg-muted">
          You have <strong className="text-fg">{left}</strong> recovery code{left === 1 ? "" : "s"}{" "}
          left. {left <= 2 && "Make new ones in Settings → Security soon."}
        </p>
        <Button
          size="lg"
          onClick={() => {
            router.replace("/");
            router.refresh();
          }}
        >
          Go to Oink
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-h1-sm">Reset your password</h1>
      <p className="mt-1 mb-6 text-body-sm text-fg-muted">
        Enter your username and one of the recovery codes you saved when you signed up.
      </p>
      <form {...formProps} className="grid gap-4" noValidate>
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
        <Field
          id="code"
          label="Recovery code"
          error={fieldError("code")}
          hint="Looks like ABCDE-23456. Each code works once."
        >
          <Input
            name="code"
            autoComplete="one-time-code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="font-mono tracking-wider uppercase"
            required
          />
        </Field>
        <Field id="newPassword" label="New password" error={fieldError("newPassword")}>
          <PasswordInput name="newPassword" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field
          id="confirmPassword"
          label="Confirm new password"
          error={fieldError("confirmPassword")}
        >
          <PasswordInput name="confirmPassword" autoComplete="new-password" required />
        </Field>
        <SubmitButton pending={pending} pendingLabel="Resetting…" size="lg" className="w-full">
          Reset password
        </SubmitButton>
      </form>
    </>
  );
}
