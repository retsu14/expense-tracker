import type { InitProgressReport, MLCEngineInterface } from "@mlc-ai/web-llm";

import type { AssistantProvider, GenerateOptions } from "../domain/prompts";

export type LoadProgress = { progress: number; text: string };

type Loading = { model: string; promise: Promise<void>; cancel: () => void };

let worker: Worker | null = null;
let engine: MLCEngineInterface | null = null;
let current: string | null = null;
let loading: Loading | null = null;
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<(p: LoadProgress) => void>();

const lib = () => import("@mlc-ai/web-llm");

// smaller KV cache: faster load, less memory, plenty for short money chats
const CHAT_OPTS = { context_window_size: 2048 };

export class LoadCancelled extends Error {
  constructor() {
    super("Download cancelled");
  }
}

type GpuAdapter = { features: { has(name: string): boolean } };

export async function webgpuStatus(): Promise<{
  state: "ok" | "unsupported" | "no-adapter";
  f16: boolean;
}> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<GpuAdapter | null> } })
    .gpu;
  if (!gpu) return { state: "unsupported", f16: false };
  try {
    const adapter = await gpu.requestAdapter();
    return adapter
      ? { state: "ok", f16: adapter.features.has("shader-f16") }
      : { state: "no-adapter", f16: false };
  } catch {
    return { state: "no-adapter", f16: false };
  }
}

export async function isModelCached(model: string) {
  try {
    const { hasModelInCache } = await lib();
    return await hasModelInCache(model);
  } catch {
    return false;
  }
}

export const isModelLoaded = (model: string) => current === model && engine !== null;
export const loadingModel = () => loading?.model ?? null;

function teardown() {
  worker?.terminate();
  worker = null;
  engine = null;
  current = null;
}

export function loadModel(model: string, onProgress?: (p: LoadProgress) => void): Promise<void> {
  if (isModelLoaded(model)) return Promise.resolve();
  if (loading && loading.model !== model) loading.cancel();
  if (onProgress) listeners.add(onProgress);
  const detach = () => {
    if (onProgress) listeners.delete(onProgress);
  };
  if (loading?.model === model) return loading.promise.finally(detach);

  let reject: (e: Error) => void = () => undefined;
  const cancelled = new Promise<never>((_, r) => {
    reject = r;
  });
  const report = (r: InitProgressReport) => {
    for (const l of listeners) l({ progress: r.progress, text: r.text });
  };
  const work = (async () => {
    const { CreateWebWorkerMLCEngine } = await lib();
    if (engine) {
      engine.setInitProgressCallback(report);
      await engine.reload(model, CHAT_OPTS);
    } else {
      worker = new Worker(new URL("./webllm.worker.ts", import.meta.url), { type: "module" });
      engine = await CreateWebWorkerMLCEngine(
        worker,
        model,
        { initProgressCallback: report },
        CHAT_OPTS,
      );
    }
    current = model;
  })();
  const promise = Promise.race([work, cancelled]).catch((e: unknown) => {
    teardown();
    throw e instanceof Error ? e : new Error(String(e));
  });
  const entry: Loading = {
    model,
    promise,
    cancel: () => {
      reject(new LoadCancelled());
    },
  };
  loading = entry;
  void promise
    .finally(() => {
      if (loading === entry) loading = null;
      detach();
    })
    .catch(() => undefined);
  return promise;
}

export async function keepOnDevice() {
  try {
    return (await navigator.storage.persisted()) || (await navigator.storage.persist());
  } catch {
    return false;
  }
}

export async function storageInfo() {
  try {
    const [estimate, persisted] = await Promise.all([
      navigator.storage.estimate(),
      navigator.storage.persisted(),
    ]);
    return { used: estimate.usage ?? 0, quota: estimate.quota ?? 0, persisted };
  } catch {
    return null;
  }
}

export function cancelLoad() {
  loading?.cancel();
}

export async function removeModel(model: string) {
  if (loading?.model === model) loading.cancel();
  if (current === model) teardown();
  const { deleteModelAllInfoInCache } = await lib();
  await deleteModelAllInfoInCache(model);
}

export function webllmProvider(
  model: string,
  onProgress?: (p: LoadProgress) => void,
): AssistantProvider {
  return {
    generate(messages, opts: GenerateOptions = {}) {
      const run = async () => {
        await loadModel(model, onProgress);
        const e = engine;
        if (!e) throw new Error("Model is not loaded");
        const stop = () => {
          e.interruptGenerate();
        };
        if (opts.signal?.aborted) return "";
        opts.signal?.addEventListener("abort", stop);
        try {
          const base = {
            messages,
            stream: true as const,
            temperature: opts.temperature ?? 0.6,
            max_tokens: opts.maxTokens ?? 512,
            repetition_penalty: opts.json ? 1 : 1.15,
          };
          const stream = await e.chat.completions
            .create(opts.json ? { ...base, response_format: { type: "json_object" } } : base)
            .catch(() => e.chat.completions.create(base));
          let out = "";
          for await (const chunk of stream) {
            const t = chunk.choices[0]?.delta.content ?? "";
            if (!t) continue;
            out += t;
            opts.onText?.(out);
          }
          return out;
        } finally {
          opts.signal?.removeEventListener("abort", stop);
        }
      };
      const next = queue.then(run, run);
      queue = next.catch(() => undefined);
      return next;
    },
  };
}
