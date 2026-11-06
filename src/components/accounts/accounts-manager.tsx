"use client";

import { Archive, ArchiveRestore, Pencil, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormAlert } from "@/components/forms/form-alert";
import { Amount } from "@/components/ledger/amount";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { centavosToInput } from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPES,
  type AccountType,
  type AccountWithBalance,
} from "@/modules/ledger/domain/account";
import { CATEGORY_COLORS } from "@/modules/ledger/domain/category";
import {
  archiveAccountAction,
  createAccountAction,
  updateAccountAction,
} from "@/modules/ledger/presentation/actions";

type Editing = { mode: "new" } | { mode: "edit"; account: AccountWithBalance } | null;

export function AccountsManager({ accounts }: { accounts: AccountWithBalance[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [pending, startTransition] = useTransition();
  const active = accounts.filter((a) => !a.archived);
  const archived = accounts.filter((a) => a.archived);
  const netWorth = active.reduce((sum, a) => sum + a.balance, 0);

  const toggleArchive = (a: AccountWithBalance) => {
    startTransition(async () => {
      const res = await archiveAccountAction(a.id, !a.archived);
      if (res.ok) toast.success(a.archived ? `${a.name} restored` : `${a.name} archived`);
      else toast.error(res.error.message);
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6">
      <Card className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-body-sm text-fg-muted">Total across wallets</p>
          <Amount value={netWorth} className="mt-1 block text-display-sm md:text-display" />
        </div>
        <Button
          onClick={() => {
            setEditing({ mode: "new" });
          }}
        >
          <Plus aria-hidden />
          Add wallet
        </Button>
      </Card>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            pending={pending}
            onEdit={() => {
              setEditing({ mode: "edit", account: a });
            }}
            onArchive={() => {
              toggleArchive(a);
            }}
          />
        ))}
      </ul>

      {archived.length > 0 && (
        <section className="grid grid-cols-1 gap-3">
          <h2 className="text-h3 text-fg-muted">Archived</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {archived.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                pending={pending}
                onEdit={() => {
                  setEditing({ mode: "edit", account: a });
                }}
                onArchive={() => {
                  toggleArchive(a);
                }}
              />
            ))}
          </ul>
        </section>
      )}

      <ResponsiveModal
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title={editing?.mode === "edit" ? "Edit wallet" : "Add wallet"}
      >
        {editing && (
          <AccountForm
            account={editing.mode === "edit" ? editing.account : null}
            onDone={() => {
              setEditing(null);
            }}
          />
        )}
      </ResponsiveModal>
    </div>
  );
}

function AccountCard({
  account: a,
  pending,
  onEdit,
  onArchive,
}: {
  account: AccountWithBalance;
  pending: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-surface p-4",
        a.archived && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="size-3 rounded-full" style={{ background: a.color }} aria-hidden />
          <div>
            <p className="font-semibold">{a.name}</p>
            <p className="text-caption font-normal text-fg-muted">{ACCOUNT_TYPE_LABEL[a.type]}</p>
          </div>
        </div>
        <div className="flex">
          <Button variant="ghost" size="icon" aria-label={`Edit ${a.name}`} onClick={onEdit}>
            <Pencil aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={a.archived ? `Restore ${a.name}` : `Archive ${a.name}`}
            onClick={onArchive}
            disabled={pending}
          >
            {a.archived ? <ArchiveRestore aria-hidden /> : <Archive aria-hidden />}
          </Button>
        </div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <Amount value={a.balance} className={cn("text-h2", a.balance < 0 && "text-expense")} />
        <Link
          href={`/activity?acct=${a.id}`}
          className="inline-flex items-center gap-1 rounded-sm text-body-sm text-fg-muted hover:text-fg"
        >
          <ReceiptText className="size-4" aria-hidden />
          Activity
        </Link>
      </div>
    </li>
  );
}

function AccountForm({
  account,
  onDone,
}: {
  account: AccountWithBalance | null;
  onDone: () => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "ewallet");
  const [opening, setOpening] = useState(account ? centavosToInput(account.openingBalance) : "");
  const [color, setColor] = useState(account?.color ?? CATEGORY_COLORS[3]);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setFormError(null);
    startTransition(async () => {
      const input = { name, type, openingBalance: opening || "0", color };
      const res = account
        ? await updateAccountAction(account.id, input)
        : await createAccountAction(input);
      if (!res.ok) {
        setErrors(res.error.fieldErrors ?? {});
        if (!res.error.fieldErrors) setFormError(res.error.message);
        return;
      }
      toast.success(account ? "Wallet updated" : "Wallet added");
      onDone();
    });
  };

  return (
    <form
      className="grid grid-cols-1 gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      noValidate
    >
      {formError && <FormAlert>{formError}</FormAlert>}
      <div className="grid grid-cols-1 gap-1.5">
        <Label htmlFor="acct-name">Name</Label>
        <Input
          id="acct-name"
          value={name}
          maxLength={30}
          autoFocus
          aria-invalid={errors.name ? true : undefined}
          onChange={(e) => {
            setName(e.target.value);
          }}
        />
        {errors.name && <p className="text-body-sm text-expense">{errors.name[0]}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid grid-cols-1 gap-1.5">
          <Label htmlFor="acct-type">Type</Label>
          <NativeSelect
            id="acct-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value as AccountType);
            }}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABEL[t]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          <Label htmlFor="acct-opening">Starting balance</Label>
          <Input
            id="acct-opening"
            inputMode="decimal"
            placeholder="0"
            value={opening}
            aria-invalid={errors.openingBalance ? true : undefined}
            onChange={(e) => {
              setOpening(e.target.value);
            }}
            className="tabular"
          />
        </div>
      </div>
      {errors.openingBalance && (
        <p className="-mt-2 text-body-sm text-expense">{errors.openingBalance[0]}</p>
      )}
      <fieldset>
        <legend className="mb-2 text-body-sm font-medium">Color</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={color === c}
              onClick={() => {
                setColor(c);
              }}
              className={cn(
                "size-10 cursor-pointer rounded-full border-2",
                color === c ? "border-fg" : "border-transparent",
              )}
              style={{ background: c }}
            />
          ))}
        </div>
      </fieldset>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : account ? "Save changes" : "Add wallet"}
      </Button>
    </form>
  );
}
