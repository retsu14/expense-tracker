"use client";

import { ArrowUp, Brain, Eraser, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Pig } from "@/components/pig/pig";
import { PigMark } from "@/components/pig/pig-mark";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { chatSystemPrompt, MAX_HISTORY } from "@/modules/assistant/domain/prompts";
import { ruleTips, snapshotToText } from "@/modules/assistant/domain/snapshot";
import { cn } from "@/lib/utils";
import { useAssistantStore } from "@/stores/assistant-store";

import { BrainLoading, getSnapshot, RichText, TipsList, useSnapshot } from "./shared";
import { isAbort, useAssistant } from "./use-assistant";

const SUGGESTIONS = [
  "How am I doing this month?",
  "Where can I cut back?",
  "Can I afford a ₱2,000 purchase this week?",
  "Am I on track for my goals?",
  "Which bills are coming up?",
];

export function AssistantChat({ userId, pigName }: { userId: string; pigName: string }) {
  const { mounted, ready, provider, label, loading } = useAssistant();
  const messages = useAssistantStore((s) => s.messages);
  const { ensureOwner, push, patchMessage, clearChat } = useAssistantStore.getState();
  const { snapshot, error } = useSnapshot();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureOwner(userId);
  }, [ensureOwner, userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );

  if (!mounted) return <Skeleton className="h-96 w-full" />;

  if (!ready || !provider)
    return (
      <div className="grid max-w-2xl gap-4">
        <Card className="flex flex-col items-center gap-3 text-center">
          <div className="h-32 pt-2">
            <Pig size={110} mood="sleeping" interactive={false} name={pigName} />
          </div>
          <h2 className="text-h3">Give {pigName} a brain</h2>
          <p className="max-w-md text-body-sm text-fg-muted">
            Turn on the optional AI to chat about your money. It runs privately on your device, so
            your data never leaves it.
          </p>
          <Button asChild>
            <Link href="/settings#ai">
              <Brain aria-hidden /> Set up AI
            </Link>
          </Button>
        </Card>
        <Card>
          <h2 className="mb-3 text-h3">Tips from {pigName}</h2>
          {snapshot ? (
            <TipsList tips={ruleTips(snapshot)} />
          ) : error ? (
            <p className="text-body-sm text-fg-muted">Couldn&apos;t load tips. Try again later.</p>
          ) : (
            <Skeleton className="h-24 w-full" />
          )}
        </Card>
      </div>
    );

  const send = async (text: string) => {
    const question = text.trim().slice(0, 500);
    if (!question || busy) return;
    setInput("");
    setBusy(true);
    const history = useAssistantStore
      .getState()
      .messages.filter((m) => !m.error && m.content)
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content }));
    push({ id: crypto.randomUUID(), role: "user", content: question });
    const id = crypto.randomUUID();
    push({ id, role: "assistant", content: "" });
    const ctrl = new AbortController();
    abort.current = ctrl;
    try {
      const snap = await getSnapshot();
      const out = await provider.generate(
        [
          { role: "system", content: chatSystemPrompt(pigName, snapshotToText(snap)) },
          ...history,
          { role: "user", content: question },
        ],
        {
          signal: ctrl.signal,
          onText: (full) => {
            patchMessage(id, { content: full });
          },
        },
      );
      patchMessage(id, { content: out.trim() || (ctrl.signal.aborted ? "(stopped)" : "…") });
    } catch (e) {
      const current = useAssistantStore.getState().messages.find((m) => m.id === id)?.content;
      if (isAbort(e) || ctrl.signal.aborted)
        patchMessage(id, { content: current?.trim() ? current : "(stopped)" });
      else
        patchMessage(id, {
          error: true,
          content: `Oops, my brain hiccuped. ${e instanceof Error ? e.message.slice(0, 160) : ""}`,
        });
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-caption text-fg-muted">Using {label} · private, on your device</p>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => {
              clearChat();
            }}
          >
            <Eraser aria-hidden /> Clear chat
          </Button>
        )}
      </div>

      {loading && <BrainLoading progress={loading.progress} text={loading.text} />}

      <div className="grid gap-4" aria-live="polite" aria-busy={busy}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="h-32 pt-2">
              <Pig size={110} mood="happy" name={pigName} />
            </div>
            <h2 className="text-h3">Hi! Ask me anything about your money.</h2>
            <p className="text-body-sm text-fg-muted">
              I only see totals and summaries, never your passwords or full history.
            </p>
          </div>
        ) : (
          messages.map((m) =>
            m.role === "user" ? (
              <div
                key={m.id}
                className="max-w-[85%] justify-self-end rounded-xl rounded-br-sm bg-accent px-4 py-2.5 whitespace-pre-wrap text-accent-fg"
              >
                {m.content}
              </div>
            ) : (
              <div key={m.id} className="flex max-w-[90%] gap-2">
                <PigMark className="mt-1 size-7 shrink-0" />
                <div
                  className={cn(
                    "rounded-xl rounded-tl-sm border border-border bg-surface px-4 py-2.5",
                    m.error && "border-expense/40 text-fg-muted",
                  )}
                >
                  {m.content ? (
                    <RichText text={m.content} />
                  ) : (
                    <span className="flex gap-1 py-2" aria-label="Thinking">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-1.5 animate-bounce rounded-full bg-fg-muted"
                          style={{ animationDelay: `${String(i * 150)}ms` }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ),
          )
        )}
        <div ref={endRef} />
      </div>

      {!busy && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="shrink-0 cursor-pointer rounded-full border border-border px-3 py-1.5 text-body-sm transition-colors duration-120 hover:bg-surface-2"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="sticky bottom-24 flex items-end gap-2 rounded-xl border border-border bg-surface p-2 shadow-sm md:bottom-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="ask" className="sr-only">
          Ask {pigName}
        </label>
        <textarea
          id="ask"
          rows={1}
          value={input}
          maxLength={500}
          placeholder={`Ask ${pigName}…`}
          onChange={(e) => {
            setInput(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void send(input);
            }
          }}
          className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none bg-transparent px-2 py-2.5 text-body outline-none placeholder:text-fg-muted"
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Stop"
            onClick={() => abort.current?.abort()}
          >
            <Square aria-hidden />
          </Button>
        ) : (
          <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim()}>
            <ArrowUp aria-hidden />
          </Button>
        )}
      </form>
    </div>
  );
}
