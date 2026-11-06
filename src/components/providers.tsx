"use client";

import { LazyMotion } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/toaster";

const loadMotion = () => import("@/lib/motion-features").then((r) => r.default);

export function Providers({
  children,
  nonce,
}: {
  children: ReactNode;
  nonce?: string | undefined;
}) {
  return (
    <ThemeProvider
      {...(nonce ? { nonce } : {})}
      attribute="class"
      defaultTheme="dark"
      themes={["dark", "light"]}
      enableSystem
      disableTransitionOnChange
    >
      <LazyMotion features={loadMotion} strict>
        {children}
      </LazyMotion>
      <Toaster />
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
