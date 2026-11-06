"use client";

import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Field } from "@/components/forms/field";
import { FormAlert } from "@/components/forms/form-alert";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { checkUsernameAction, registerAction } from "@/modules/identity/presentation/actions";

import { PasswordStrength } from "./password-strength";
import { RecoveryCodesList } from "./recovery-codes";

type Availability =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "done"; available: boolean; message: string };

function useUsernameAvailability(username: string) {
  const [state, setState] = useState<Availability>({ status: "idle" });

  useEffect(() => {
    const value = username.trim();
    if (value.length < 3) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setState({ status: "checking" });
      void checkUsernameAction(value).then((res) => {
        if (!cancelled) setState({ status: "done", ...res });
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  return username.trim().length < 3 ? { status: "idle" as const } : state;
}

function UsernameHint({ availability }: { availability: Availability }) {
  if (availability.status === "idle") return <span>3–20 letters, numbers or underscores.</span>;
  if (availability.status === "checking") {
    return (
      <span className="inline-flex items-center gap-1">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Checking…
      </span>
    );
  }
  const Icon = availability.available ? CircleCheck : CircleX;
  return (
    <span
      className={`inline-flex items-center gap-1 ${availability.available ? "text-income" : "text-expense"}`}
    >
      <Icon className="size-3.5" aria-hidden /> {availability.message}
    </span>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const { state, formProps, pending, fieldError, formError } = useFormAction(registerAction);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saved, setSaved] = useState(false);
  const availability = useUsernameAvailability(username);

  if (state?.ok) {
    return (
      <div className="grid gap-4">
        <div>
          <h1 className="text-h1-sm">Save your recovery codes</h1>
          <p className="mt-1 text-body-sm text-fg-muted">
            There&apos;s no email on Oink. If you forget your password, one of these codes is the
            only way back in. Each code works once.
          </p>
        </div>
        <RecoveryCodesList
          codes={state.data.recoveryCodes}
          username={username.trim().toLowerCase()}
        />
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface-2 p-3 text-body-sm">
          <input
            type="checkbox"
            checked={saved}
            onChange={(e) => {
              setSaved(e.target.checked);
            }}
            className="mt-0.5 size-5 shrink-0 accent-(--accent)"
          />
          I saved my recovery codes somewhere safe.
        </label>
        <Button
          size="lg"
          disabled={!saved}
          onClick={() => {
            router.replace("/");
            router.refresh();
          }}
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-h1-sm">Create your account</h1>
      <p className="mt-1 mb-6 text-body-sm text-fg-muted">Just a username and password. Oink!</p>
      <form {...formProps} className="grid gap-4" noValidate>
        {formError && <FormAlert>{formError}</FormAlert>}
        <Field
          id="username"
          label="Username"
          error={fieldError("username")}
          hint={<UsernameHint availability={availability} />}
        >
          <Input
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            required
            autoFocus
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
            }}
          />
        </Field>
        <Field
          id="password"
          label="Password"
          error={fieldError("password")}
          hint={<PasswordStrength password={password} />}
        >
          <PasswordInput
            name="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
        </Field>
        <Field id="confirmPassword" label="Confirm password" error={fieldError("confirmPassword")}>
          <PasswordInput name="confirmPassword" autoComplete="new-password" required />
        </Field>
        <SubmitButton pending={pending} pendingLabel="Creating…" size="lg" className="w-full">
          Create account
        </SubmitButton>
      </form>
    </>
  );
}
