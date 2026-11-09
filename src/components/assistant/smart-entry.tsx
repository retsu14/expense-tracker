"use client";

import { Loader2, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type EntryContext,
  type EntryDraft,
  parseEntry,
} from "@/modules/assistant/domain/entry-parser";
import {
  ENTRY_SCHEMA,
  entryPrompt,
  mergeDrafts,
  parseAiEntry,
} from "@/modules/assistant/domain/prompts";

import { useAssistant } from "./use-assistant";

export function SmartEntry({
  context,
  onApply,
}: {
  context: EntryContext;
  onApply: (draft: EntryDraft) => void;
}) {
  const { ready, provider, loading, warmUp } = useAssistant();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const fill = async () => {
    const input = text.trim();
    if (!input || busy) return;
    let draft = parseEntry(input, context);
    const complete =
      draft.amount !== null &&
      (draft.kind === "transfer" ? draft.toAccountId !== null : draft.categoryId !== null);
    if (provider && !complete) {
      setBusy(true);
      try {
        const raw = await provider.generate(
          [
            { role: "system", content: "You turn short notes into JSON. Reply with JSON only." },
            { role: "user", content: entryPrompt(input, context) },
          ],
          {
            json: ENTRY_SCHEMA,
            temperature: 0,
            maxTokens: 120,
            signal: AbortSignal.timeout(30_000),
          },
        );
        draft = mergeDrafts(draft, parseAiEntry(raw, context));
      } catch {
        /* rule-based draft still applies */
      } finally {
        setBusy(false);
      }
    }
    onApply(draft);
    setHint(
      draft.amount ? "Filled in. Check it, then save." : "Filled in. Add the amount, then save.",
    );
    setText("");
  };

  return (
    <div className="grid gap-1.5">
      <label htmlFor="qa-smart" className="text-body-sm font-medium">
        Type it
      </label>
      <div className="flex gap-2">
        <Input
          id="qa-smart"
          value={text}
          maxLength={200}
          placeholder="e.g. lunch 150 gcash yesterday"
          autoComplete="off"
          enterKeyHint="go"
          aria-describedby="qa-smart-hint"
          onFocus={warmUp}
          onChange={(e) => {
            setText(e.target.value);
            setHint(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void fill();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!text.trim() || busy}
          onClick={() => void fill()}
          aria-label={ready ? "Fill with AI" : "Fill form"}
        >
          {busy ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : ready ? (
            <Sparkles aria-hidden />
          ) : (
            <WandSparkles aria-hidden />
          )}
          Fill
        </Button>
      </div>
      <p id="qa-smart-hint" className="min-h-4 text-caption text-fg-muted" aria-live="polite">
        {busy && loading
          ? `Waking up the brain… ${String(Math.round(loading.progress * 100))}%`
          : busy
            ? "Thinking…"
            : hint}
      </p>
    </div>
  );
}
