"use client";

import { useMemo } from "react";

import { findWebllm, OLLAMA_MODELS } from "@/modules/assistant/domain/models";
import type { AssistantProvider } from "@/modules/assistant/domain/prompts";
import { ollamaProvider } from "@/modules/assistant/infrastructure/ollama";
import { webllmProvider } from "@/modules/assistant/infrastructure/webllm";
import { useMounted } from "@/lib/use-mounted";
import { useAssistantStore } from "@/stores/assistant-store";

export function useAssistant() {
  const mounted = useMounted();
  const enabled = useAssistantStore((s) => s.enabled);
  const kind = useAssistantStore((s) => s.provider);
  const webllmModel = useAssistantStore((s) => s.webllmModel);
  const ollamaUrl = useAssistantStore((s) => s.ollamaUrl);
  const ollamaModel = useAssistantStore((s) => s.ollamaModel);
  const loading = useAssistantStore((s) => s.loading);
  const setLoading = useAssistantStore((s) => s.setLoading);

  const model = kind === "webllm" ? webllmModel : ollamaModel;
  const ready = mounted && enabled && model !== null;

  const provider = useMemo<AssistantProvider | null>(() => {
    if (!ready || !model) return null;
    if (kind === "ollama") return ollamaProvider(ollamaUrl, model);
    const inner = webllmProvider(model, (p) => {
      setLoading(p.progress >= 1 ? null : p);
    });
    return {
      generate: (messages, opts) =>
        inner.generate(messages, opts).finally(() => {
          setLoading(null);
        }),
    };
  }, [ready, kind, model, ollamaUrl, setLoading]);

  const label =
    kind === "webllm"
      ? (findWebllm(model)?.label ?? model)
      : (OLLAMA_MODELS.find((m) => m.name === model)?.label ?? model);

  return { mounted, ready, provider, kind, model, label, loading };
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
