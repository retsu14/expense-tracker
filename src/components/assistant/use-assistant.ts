"use client";

import { useCallback, useMemo } from "react";

import { findWebllm, ollamaLabel } from "@/modules/assistant/domain/models";
import type { AssistantProvider } from "@/modules/assistant/domain/prompts";
import { ollamaProvider, warmUpOllama } from "@/modules/assistant/infrastructure/ollama";
import {
  isModelCached,
  isModelLoaded,
  loadModel,
  webllmProvider,
} from "@/modules/assistant/infrastructure/webllm";
import { useMounted } from "@/lib/use-mounted";
import { useAiLoading, useAssistantStore } from "@/stores/assistant-store";

export function useAssistant() {
  const mounted = useMounted();
  const enabled = useAssistantStore((s) => s.enabled);
  const kind = useAssistantStore((s) => s.provider);
  const webllmModel = useAssistantStore((s) => s.webllmModel);
  const ollamaUrl = useAssistantStore((s) => s.ollamaUrl);
  const ollamaModel = useAssistantStore((s) => s.ollamaModel);
  const loading = useAiLoading((s) => s.loading);
  const setLoading = useAiLoading((s) => s.setLoading);

  const model = kind === "webllm" ? webllmModel : ollamaModel;
  const known = kind === "ollama" || findWebllm(model) !== undefined;
  const ready = mounted && enabled && model !== null && known;

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
    kind === "webllm" ? (findWebllm(model)?.label ?? "Local model") : ollamaLabel(model ?? "");

  // load the model before the first question so replies start sooner
  const warmUp = useCallback(() => {
    if (!ready || !model) return;
    if (kind === "ollama") {
      void warmUpOllama(ollamaUrl, model);
      return;
    }
    if (isModelLoaded(model)) return;
    void isModelCached(model).then((cached) => {
      if (!cached) return;
      loadModel(model, (p) => {
        setLoading(p.progress >= 1 ? null : p);
      })
        .catch(() => undefined)
        .finally(() => {
          setLoading(null);
        });
    });
  }, [ready, model, kind, ollamaUrl, setLoading]);

  return { mounted, ready, provider, kind, model, label, loading, warmUp };
}

export const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
