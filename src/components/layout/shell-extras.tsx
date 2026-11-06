"use client";

import dynamic from "next/dynamic";

export const LazyAppLock = dynamic(
  () => import("@/components/pwa/app-lock").then((m) => m.AppLock),
  {
    ssr: false,
  },
);

export const LazyInstallPrompt = dynamic(
  () => import("@/components/pwa/install-prompt").then((m) => m.InstallPrompt),
  { ssr: false },
);
