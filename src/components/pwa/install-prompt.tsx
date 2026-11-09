"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { PigMark } from "@/components/pig/pig-mark";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { usePwaStore } from "@/stores/pwa-store";

const DISMISS_KEY = "oink-install-dismissed";
const VISITS_KEY = "oink-visits";
const SNOOZE_MS = 14 * 86_400_000;

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function useInstall() {
  const installEvent = usePwaStore((s) => s.installEvent);
  const installed = usePwaStore((s) => s.installed);
  const setInstallEvent = usePwaStore((s) => s.setInstallEvent);
  const [iosHelp, setIosHelp] = useState(false);

  const canInstall =
    !installed && (installEvent !== null || (typeof navigator !== "undefined" && isIos()));

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      await installEvent.userChoice;
      setInstallEvent(null);
    } else if (isIos()) setIosHelp(true);
  };

  return { canInstall, installed, install, iosHelp, setIosHelp };
}

export function IosInstallHelp({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title="Add Oink to your Home Screen">
      <ol className="grid gap-4 text-body-sm">
        <li className="flex items-center gap-3">
          <Share className="size-6 shrink-0" aria-hidden />
          Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
        </li>
        <li className="flex items-center gap-3">
          <SquarePlus className="size-6 shrink-0" aria-hidden />
          Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.
        </li>
        <li className="flex items-center gap-3">
          <PigMark className="size-6 shrink-0" />
          Open it from your Home Screen.
        </li>
      </ol>
    </ResponsiveModal>
  );
}

export function InstallPrompt() {
  const { canInstall, install, iosHelp, setIosHelp } = useInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const visits = Number(localStorage.getItem(VISITS_KEY) ?? "0") + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      const dismissed = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
      const t = setTimeout(() => {
        setVisible(visits >= 2 && Date.now() - dismissed > SNOOZE_MS);
      }, 4000);
      return () => {
        clearTimeout(t);
      };
    } catch {
      return undefined;
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <>
      {visible && canInstall && (
        <div
          role="dialog"
          aria-label="Install Oink"
          className="fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-lg border border-border bg-surface p-3 shadow-2xl md:bottom-6"
        >
          <PigMark className="size-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Install Oink</p>
            <p className="text-caption font-normal text-fg-muted">Works offline, one tap away.</p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              void install().then(dismiss);
            }}
          >
            <Download aria-hidden />
            Install
          </Button>
          <Button variant="ghost" size="icon" aria-label="Not now" onClick={dismiss}>
            <X aria-hidden />
          </Button>
        </div>
      )}
      <IosInstallHelp open={iosHelp} onOpenChange={setIosHelp} />
    </>
  );
}

export function InstallAppRow() {
  const { canInstall, installed, install, iosHelp, setIosHelp } = useInstall();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-body-sm font-medium">Install app</p>
        <p className="text-caption font-normal text-fg-muted">
          {installed
            ? "Oink is installed on this device. 🐷"
            : canInstall
              ? "Add Oink to your home screen or desktop."
              : "Open Oink in Chrome, Edge or Safari to install it."}
        </p>
      </div>
      {canInstall && (
        <Button variant="secondary" size="sm" onClick={() => void install()}>
          <Download aria-hidden />
          Install
        </Button>
      )}
      <IosInstallHelp open={iosHelp} onOpenChange={setIosHelp} />
    </div>
  );
}
