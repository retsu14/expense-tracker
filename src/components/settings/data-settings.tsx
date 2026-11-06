"use client";

import { FileJson, FileSpreadsheet, Trash2 } from "lucide-react";
import { useState } from "react";

import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { deleteAccountAction } from "@/modules/identity/presentation/actions";

function DeleteForm({ username }: { username: string }) {
  const { formProps, pending, fieldError, formError } = useFormAction(deleteAccountAction);
  return (
    <form {...formProps} className="grid gap-4" noValidate>
      <FormAlert>
        This permanently deletes your wallets, transactions, budgets, bills, goals and avatar. It
        can&apos;t be undone. Export a backup first if you might want your data.
      </FormAlert>
      {formError && <FormAlert>{formError}</FormAlert>}
      <Field
        id="confirmUsername"
        label={`Type ${username} to confirm`}
        error={fieldError("confirmUsername")}
      >
        <Input name="confirmUsername" autoComplete="off" autoCapitalize="none" spellCheck={false} />
      </Field>
      <Field id="delete-password" label="Password" error={fieldError("password")}>
        <PasswordInput name="password" autoComplete="current-password" />
      </Field>
      <SubmitButton pending={pending} pendingLabel="Deleting…" variant="destructive" size="lg">
        Delete my account forever
      </SubmitButton>
    </form>
  );
}

export function DataSettings({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild variant="secondary">
          <a href="/api/export/transactions" download>
            <FileSpreadsheet aria-hidden />
            Transactions (CSV)
          </a>
        </Button>
        <Button asChild variant="secondary">
          <a href="/api/export/backup" download>
            <FileJson aria-hidden />
            Full backup (JSON)
          </a>
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div>
          <p className="text-body-sm font-medium">Delete account</p>
          <p className="text-caption font-normal text-fg-muted">
            Remove your account and all data.
          </p>
        </div>
        <Button
          variant="ghost"
          className="text-expense"
          onClick={() => {
            setOpen(true);
          }}
        >
          <Trash2 aria-hidden />
          Delete account
        </Button>
      </div>
      <ResponsiveModal open={open} onOpenChange={setOpen} title="Delete your account?">
        {open && <DeleteForm username={username} />}
      </ResponsiveModal>
    </div>
  );
}
