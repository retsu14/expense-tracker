"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Input } from "@/components/ui/input";
import { updateProfileAction } from "@/modules/identity/presentation/actions";

export function ProfileForm({ displayName, pigName }: { displayName: string; pigName: string }) {
  const { state, formProps, pending, fieldError, formError } = useFormAction(updateProfileAction);

  useEffect(() => {
    if (state?.ok) toast.success("Profile saved");
  }, [state]);

  return (
    <form {...formProps} className="grid gap-4" noValidate>
      {formError && <FormAlert>{formError}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="displayName" label="Your name" error={fieldError("displayName")}>
          <Input
            name="displayName"
            defaultValue={displayName}
            maxLength={40}
            autoComplete="nickname"
            required
          />
        </Field>
        <Field id="pigName" label="Pig's name" error={fieldError("pigName")}>
          <Input name="pigName" defaultValue={pigName} maxLength={20} required />
        </Field>
      </div>
      <div>
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Save profile
        </SubmitButton>
      </div>
    </form>
  );
}
