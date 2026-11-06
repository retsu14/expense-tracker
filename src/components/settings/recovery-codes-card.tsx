"use client";

import { KeyRound } from "lucide-react";
import { useState } from "react";

import { RecoveryCodesList } from "@/components/auth/recovery-codes";
import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { regenerateRecoveryCodesAction } from "@/modules/identity/presentation/actions";

function RegenerateFlow({ username, onDone }: { username: string; onDone: () => void }) {
  const { state, formProps, pending, fieldError, formError } = useFormAction(
    regenerateRecoveryCodesAction,
  );

  if (state?.ok) {
    return (
      <div className="grid gap-4">
        <FormAlert tone="success">Your old codes no longer work. Save these new ones.</FormAlert>
        <RecoveryCodesList codes={state.data} username={username} />
        <Button onClick={onDone}>I saved them</Button>
      </div>
    );
  }

  return (
    <form {...formProps} className="grid gap-4" noValidate>
      {formError && <FormAlert>{formError}</FormAlert>}
      <Field id="confirm-password" label="Confirm your password" error={fieldError("password")}>
        <PasswordInput name="password" autoComplete="current-password" required autoFocus />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Generating…">
        Generate new codes
      </SubmitButton>
    </form>
  );
}

export function RecoveryCodesCard({
  remaining,
  username,
}: {
  remaining: number;
  username: string;
}) {
  const [open, setOpen] = useState(false);
  const low = remaining <= 2;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-surface-2">
          <KeyRound className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-body-sm font-medium">Recovery codes</p>
          <p
            className={low ? "text-caption text-warning" : "text-caption font-normal text-fg-muted"}
          >
            {remaining} of 8 left{low ? " — make new ones soon" : ""}
          </p>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        Regenerate
      </Button>
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="New recovery codes"
        description="This replaces all your current codes."
      >
        {open && (
          <RegenerateFlow
            username={username}
            onDone={() => {
              setOpen(false);
            }}
          />
        )}
      </ResponsiveModal>
    </div>
  );
}
