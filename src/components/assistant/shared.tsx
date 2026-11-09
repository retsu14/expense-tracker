"use client";

import { CircleAlert, Lightbulb, PartyPopper } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { friendlyProgress } from "@/modules/assistant/domain/models";
import { renderMarkdownLite, splitBold } from "@/modules/assistant/domain/prompts";
import type { AssistantSnapshot, Tip } from "@/modules/assistant/domain/snapshot";
import { assistantSnapshotAction } from "@/modules/assistant/presentation/actions";
import { cn } from "@/lib/utils";

const TTL = 120_000;
let cache: { at: number; data: AssistantSnapshot } | null = null;

export async function getSnapshot(force = false) {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.data;
  const data = await assistantSnapshotAction();
  cache = { at: Date.now(), data };
  return data;
}

export function useSnapshot() {
  const [snapshot, setSnapshot] = useState<AssistantSnapshot | null>(cache?.data ?? null);
  const [error, setError] = useState(false);
  const load = useCallback(async (force = false) => {
    try {
      const data = await getSnapshot(force);
      setSnapshot(data);
      setError(false);
      return data;
    } catch {
      setError(true);
      return null;
    }
  }, []);
  useEffect(() => {
    let live = true;
    getSnapshot().then(
      (data) => {
        if (live) setSnapshot(data);
      },
      () => {
        if (live) setError(true);
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return { snapshot, error, load };
}

function Inline({ text }: { text: string }) {
  return (
    <>{splitBold(text).map((p, i) => (p.bold ? <strong key={i}>{p.text}</strong> : p.text))}</>
  );
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = renderMarkdownLite(text);
  const blocks: ({ list: string[] } | { p: string })[] = [];
  for (const l of lines) {
    const last = blocks.at(-1);
    if (l.bullet) {
      if (last && "list" in last) last.list.push(l.text);
      else blocks.push({ list: [l.text] });
    } else blocks.push({ p: l.text });
  }
  return (
    <div className={cn("grid gap-2", className)}>
      {blocks.map((b, i) =>
        "list" in b ? (
          <ul key={i} className="grid list-disc gap-1 pl-5">
            {b.list.map((item, j) => (
              <li key={j}>
                <Inline text={item} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Inline text={b.p} />
          </p>
        ),
      )}
    </div>
  );
}

const TIP_ICON = { good: PartyPopper, warn: CircleAlert, info: Lightbulb } as const;
const TIP_COLOR = { good: "text-income", warn: "text-warning", info: "text-fg-muted" } as const;

export function TipsList({ tips }: { tips: Tip[] }) {
  return (
    <ul className="grid gap-3">
      {tips.map((t) => {
        const Icon = TIP_ICON[t.tone];
        return (
          <li key={t.text} className="flex gap-3 text-body-sm">
            <Icon className={cn("mt-0.5 size-4 shrink-0", TIP_COLOR[t.tone])} aria-hidden />
            <span>{t.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function BrainLoading({ progress, text }: { progress: number; text: string }) {
  return (
    <div className="grid gap-1.5 rounded-md bg-surface-2 p-3" role="status">
      <p className="text-body-sm font-medium">Waking up the brain… {Math.round(progress * 100)}%</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-pig transition-[width] duration-300"
          style={{ width: `${String(Math.round(progress * 100))}%` }}
        />
      </div>
      <p className="line-clamp-1 text-caption text-fg-muted">{friendlyProgress(text, progress)}</p>
    </div>
  );
}
