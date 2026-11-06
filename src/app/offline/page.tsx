import type { Metadata } from "next";

import { OfflineView } from "@/components/pwa/offline-view";

export const metadata: Metadata = { title: "Offline" };
export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 pt-safe pb-safe text-center">
      <OfflineView />
    </main>
  );
}
