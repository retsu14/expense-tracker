"use client";

import { Delete } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Pig } from "@/components/pig/pig";
import { clearPin, markUnlocked, needsUnlock, verifyPin } from "@/lib/app-lock";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/modules/identity/presentation/actions";

const MAX_TRIES = 5;
const COOLDOWN_MS = 30_000;
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export function AppLock({ userId }: { userId: string }) {
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const tries = useRef(0);
  const blockedUntil = useRef(0);
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    const check = () => {
      if (needsUnlock(userId)) setLocked(true);
    };
    check();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        markUnlocked();
      } else if (hiddenAt.current !== null) {
        check();
        hiddenAt.current = null;
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [userId]);

  const submit = useCallback(
    async (value: string) => {
      if (Date.now() < blockedUntil.current) {
        setError("Too many tries. Wait a moment.");
        setPin("");
        return;
      }
      setChecking(true);
      const ok = await verifyPin(userId, value);
      setChecking(false);
      if (ok) {
        tries.current = 0;
        markUnlocked();
        setLocked(false);
        setPin("");
        setError(null);
        return;
      }
      tries.current++;
      if (tries.current >= MAX_TRIES) {
        blockedUntil.current = Date.now() + COOLDOWN_MS;
        tries.current = 0;
        setError("Too many tries. Try again in 30 seconds.");
      } else setError("Wrong PIN");
      setPin("");
    },
    [userId],
  );

  const press = (k: string) => {
    if (checking) return;
    setError(null);
    if (k === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    const next = (pin + k).slice(0, 6);
    setPin(next);
    if (next.length >= 4) {
      void verifyPin(userId, next).then((ok) => {
        if (ok || next.length === 6) void submit(next);
      });
    }
  };

  useEffect(() => {
    if (!locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("del");
      else if (e.key === "Enter" && pin.length >= 4) void submit(pin);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  });

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Oink is locked"
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-bg px-6 pt-safe pb-safe"
    >
      <div className="h-28">
        <Pig size={110} coverEyes interactive={false} />
      </div>
      <div className="text-center">
        <h1 className="text-h2">Enter your PIN</h1>
        <p
          className={cn("mt-1 min-h-5 text-body-sm", error ? "text-expense" : "text-fg-muted")}
          aria-live="assertive"
        >
          {error ?? "Oink is keeping your money private."}
        </p>
      </div>
      <div className="flex gap-3" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border-2 border-fg-muted transition-colors",
              i < pin.length && "border-accent bg-accent",
              i >= 4 && i >= pin.length && "opacity-40",
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={k}
              type="button"
              aria-label={k === "del" ? "Delete digit" : k}
              onClick={() => {
                press(k);
              }}
              className="flex size-18 cursor-pointer items-center justify-center rounded-full bg-surface text-h2 transition-transform duration-120 active:scale-95"
            >
              {k === "del" ? <Delete className="size-6" aria-hidden /> : k}
            </button>
          ),
        )}
      </div>
      <form
        action={logoutAction}
        onSubmit={() => {
          clearPin(userId);
        }}
      >
        <button
          type="submit"
          className="cursor-pointer text-body-sm text-fg-muted underline underline-offset-4"
        >
          Forgot PIN? Sign out
        </button>
      </form>
    </div>
  );
}
