"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { PigMark } from "@/components/pig/pig-mark";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { summaryPrompt } from "@/modules/assistant/domain/prompts";
import { ruleTips, snapshotToText } from "@/modules/assistant/domain/snapshot";

import { BrainLoading, getSnapshot, RichText, TipsList, useSnapshot } from "./shared";
import { isAbort, useAssistant } from "./use-assistant";

type Saved = { text: string; at: number };

const storageKey = (userId: string, month: string) => `oink-ai-summary:${userId}:${month}`;

function readSaved(key: string): Saved | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

export function OinkTakeCard({ userId, pigName }: { userId: string; pigName: string }) {
  const { ready, provider, loading, warmUp } = useAssistant();
  const { snapshot, error } = useSnapshot();
  const [generated, setSummary] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const month = snapshot?.today.slice(0, 7) ?? "";

  const stored = useMemo(
    () => (month ? readSaved(storageKey(userId, month)) : null),
    [userId, month],
  );
  const summary = generated ?? stored;

  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );

  useEffect(() => {
    warmUp();
  }, [warmUp]);

  const generate = async () => {
    if (!provider || busy) return;
    setBusy(true);
    setFailed(null);
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const snap = await getSnapshot(true);
      const text = await provider.generate(
        [
          {
            role: "system",
            content: `You are ${pigName}, a cute pig money buddy. Be accurate and brief.`,
          },
          { role: "user", content: summaryPrompt(snapshotToText(snap)) },
        ],
        {
          signal: ctrl.signal,
          temperature: 0.4,
          maxTokens: 180,
          onText: (full) => {
            setSummary({ text: full, at: Date.now() });
          },
        },
      );
      const saved = { text: text.trim(), at: Date.now() };
      setSummary(saved);
      try {
        localStorage.setItem(storageKey(userId, snap.today.slice(0, 7)), JSON.stringify(saved));
      } catch {
        /* storage full */
      }
    } catch (e) {
      if (!isAbort(e))
        setFailed(e instanceof Error ? e.message.slice(0, 140) : "Something went wrong");
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  return (
    <Card className="lg:col-span-12">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <PigMark className="size-6" />
          {pigName}&apos;s take
        </CardTitle>
        {ready && summary && !busy && (
          <Button variant="ghost" size="sm" onClick={() => void generate()}>
            <RefreshCw aria-hidden /> Refresh
          </Button>
        )}
      </CardHeader>
      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div>
          <h3 className="mb-2 eyebrow">Quick tips</h3>
          {snapshot ? (
            <TipsList tips={ruleTips(snapshot)} />
          ) : error ? (
            <p className="text-body-sm text-fg-muted">Couldn&apos;t load tips.</p>
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
        </div>
        <div className="grid content-start gap-3">
          <h3 className="eyebrow">AI check-in</h3>
          {!ready ? (
            <p className="text-body-sm text-fg-muted">
              Turn on AI in{" "}
              <Link href="/settings#ai" className="underline underline-offset-4">
                Settings
              </Link>{" "}
              for a monthly check-in.
            </p>
          ) : (
            <>
              {loading && busy && <BrainLoading progress={loading.progress} text={loading.text} />}
              {summary?.text ? (
                <div className="text-body-sm" aria-live="polite">
                  <RichText text={summary.text} />
                  {!busy && (
                    <p className="mt-2 text-caption text-fg-muted">
                      AI-written. Double-check big decisions.
                    </p>
                  )}
                </div>
              ) : busy ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <Button variant="secondary" onClick={() => void generate()} disabled={!snapshot}>
                  <Sparkles aria-hidden /> Ask {pigName} for a check-in
                </Button>
              )}
              {failed && <p className="text-body-sm text-expense">{failed}</p>}
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
