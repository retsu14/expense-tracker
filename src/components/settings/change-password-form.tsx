"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { changePasswordAction } from "@/modules/identity/presentation/actions";

export function ChangePasswordForm() {
  const form = useRef<HTMLFormElement>(null);
  const { state, formProps, pending, fieldError, formError } = useFormAction(changePasswordAction);

  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      toast.success("Password changed. Other devices were signed out.");
    }
  }, [state]);

  return (
    <form ref={form} {...formProps} className="grid gap-4" noValidate>
      {formError && <FormAlert>{formError}</FormAlert>}
      <Field id="currentPassword" label="Current password" error={fieldError("currentPassword")}>
        <PasswordInput name="currentPassword" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="newPassword" label="New password" error={fieldError("newPassword")}>
          <PasswordInput name="newPassword" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field
          id="confirmNewPassword"
          label="Confirm new password"
          error={fieldError("confirmPassword")}
        >
          <PasswordInput name="confirmPassword" autoComplete="new-password" required />
        </Field>
      </div>
      <div>
        <SubmitButton pending={pending} pendingLabel="Updating…">
          Change password
        </SubmitButton>
      </div>
    </form>
  );
}
