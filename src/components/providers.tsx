"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      themes={["dark", "light"]}
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster />
      <ServiceWorkerRegister />
    </ThemeProvider>
  );
}
