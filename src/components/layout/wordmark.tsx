import Link from "next/link";

import { PigMark } from "@/components/pig/pig-mark";
import { cn } from "@/lib/utils";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Oink home"
      className={cn("inline-flex items-center gap-2 rounded-md", className)}
    >
      <PigMark className="size-8" />
      <span className="font-brand text-h2 font-semibold tracking-tight">Oink</span>
    </Link>
  );
}
