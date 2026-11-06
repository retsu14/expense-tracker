import Link from "next/link";

import { PigMark } from "@/components/pig/pig-mark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <PigMark className="size-24" />
      <p className="font-brand text-display-sm">404</p>
      <h1 className="text-h2">This page wandered off</h1>
      <p className="max-w-sm text-body-sm text-fg-muted">
        Oink sniffed everywhere but couldn&apos;t find it.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
