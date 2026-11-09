"use client";

import { RotateCw } from "lucide-react";

import { Pig } from "@/components/pig/pig";
import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/use-mounted";

export function OfflineView() {
  const mounted = useMounted();
  return (
    <div className="grid max-w-sm justify-items-center gap-4">
      <div className="h-40">
        {mounted && <Pig mood="sleeping" size={150} interactive={false} />}
      </div>
      <h1 className="text-h1-sm">You&apos;re offline</h1>
      <p className="text-body-sm text-fg-muted">
        Entries you log now will sync when you&apos;re back online.
      </p>
      <Button
        onClick={() => {
          location.reload();
        }}
      >
        <RotateCw aria-hidden />
        Try again
      </Button>
    </div>
  );
}
