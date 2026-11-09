"use client";

import { LockKeyhole } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Switch } from "@/components/ui/switch";
import { clearPin, hasPin, isValidPin, setPin, verifyPin } from "@/lib/app-lock";

let version = 0;
const listeners = new Set<() => void>();
const bump = () => {
  version++;
  for (const l of listeners) l();
};

export function AppLockSettings({ userId }: { userId: string }) {
  const enabled = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => `${version}:${String(hasPin(userId))}`,
    () => "0:false",
  ).endsWith("true");
  const [mode, setMode] = useState<"set" | "disable" | null>(null);
  const [pin, setPinValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setMode(null);
    setPinValue("");
    setConfirm("");
    setError(null);
  };

  const submit = async () => {
    if (mode === "set") {
      if (!isValidPin(pin)) {
        setError("Use 4 to 6 digits.");
        return;
      }
      if (pin !== confirm) {
        setError("PINs don't match.");
        return;
      }
      await setPin(userId, pin);
      toast.success("App lock is on 🔒");
    } else {
      if (!(await verifyPin(userId, pin))) {
        setError("Wrong PIN.");
        return;
      }
      clearPin(userId);
      toast.success("App lock is off");
    }
    bump();
    close();
  };

  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-md bg-surface-2">
          <LockKeyhole className="size-5" aria-hidden />
        </span>
        <div>
          <Label htmlFor="app-lock">App lock</Label>
          <p className="text-caption font-normal text-fg-muted">Require a PIN on this device.</p>
        </div>
      </div>
      <Switch
        id="app-lock"
        checked={enabled}
        onCheckedChange={(on) => {
          setMode(on ? "set" : "disable");
        }}
      />
      <ResponsiveModal
        open={mode !== null}
        onOpenChange={(o) => {
          if (!o) close();
        }}
        title={mode === "set" ? "Set a PIN" : "Turn off app lock"}
        description={
          mode === "set"
            ? "4 to 6 digits. Stored only on this device."
            : "Enter your PIN to confirm."
        }
      >
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="pin-1">PIN</Label>
            <Input
              id="pin-1"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              value={pin}
              onChange={(e) => {
                setPinValue(digits(e.target.value));
              }}
              className="tracking-[0.5em]"
            />
          </div>
          {mode === "set" && (
            <div className="grid gap-1.5">
              <Label htmlFor="pin-2">Confirm PIN</Label>
              <Input
                id="pin-2"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={confirm}
                onChange={(e) => {
                  setConfirm(digits(e.target.value));
                }}
                className="tracking-[0.5em]"
              />
            </div>
          )}
          {error && <p className="text-body-sm text-expense">{error}</p>}
          <Button type="submit">{mode === "set" ? "Turn on" : "Turn off"}</Button>
        </form>
      </ResponsiveModal>
    </div>
  );
}
