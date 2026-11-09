import type { AssistantProvider, GenerateOptions } from "../domain/prompts";

export type OllamaTag = { name: string; size: number; cloud: boolean };
export type PullProgress = {
  status: string;
  completed?: number | undefined;
  total?: number | undefined;
};

type Event = {
  error?: string;
  status?: string;
  completed?: number;
  total?: number;
  message?: { content?: string };
  done?: boolean;
};

async function* ndjson(res: Response): AsyncGenerator<Event> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");
    for (const line of lines) if (line.trim()) yield JSON.parse(line) as Event;
    if (done) return;
  }
}

async function failure(res: Response) {
  const text = await res.text().catch(() => "");
  try {
    return new Error((JSON.parse(text) as Event).error ?? `Ollama error ${String(res.status)}`);
  } catch {
    return new Error(text || `Ollama error ${String(res.status)}`);
  }
}

export async function ollamaStatus(
  base: string,
  signal?: AbortSignal,
): Promise<{ ok: true; version: string; models: OllamaTag[] } | { ok: false }> {
  try {
    const [v, t] = await Promise.all([
      fetch(`${base}/api/version`, { signal: signal ?? null }),
      fetch(`${base}/api/tags`, { signal: signal ?? null }),
    ]);
    if (!v.ok || !t.ok) return { ok: false };
    const version = ((await v.json()) as { version?: string }).version ?? "";
    const tags = ((await t.json()) as { models?: { name: string; size: number }[] }).models ?? [];
    return {
      ok: true,
      version,
      models: tags
        .map((m) => ({
          name: m.name,
          size: m.size,
          cloud: /[:-]cloud$/.test(m.name) || m.size < 1e6,
        }))
        .sort((a, b) => Number(a.cloud) - Number(b.cloud) || a.name.localeCompare(b.name)),
    };
  } catch {
    return { ok: false };
  }
}

export async function pullModel(
  base: string,
  name: string,
  onProgress: (p: PullProgress) => void,
  signal?: AbortSignal,
) {
  const res = await fetch(`${base}/api/pull`, {
    method: "POST",
    body: JSON.stringify({ model: name, stream: true }),
    signal: signal ?? null,
  });
  if (!res.ok) throw await failure(res);
  for await (const ev of ndjson(res)) {
    if (ev.error) throw new Error(ev.error);
    onProgress({ status: ev.status ?? "", completed: ev.completed, total: ev.total });
  }
}

export async function deleteModel(base: string, name: string) {
  const res = await fetch(`${base}/api/delete`, {
    method: "DELETE",
    body: JSON.stringify({ model: name }),
  });
  if (!res.ok) throw await failure(res);
}

const cpuOnly = new Set<string>();
const GPU_CRASH =
  /CUDA error|ROCm error|llama-server process has terminated|unable to allocate|out of memory/i;

const KEEP_ALIVE = "30m";

export async function warmUpOllama(base: string, model: string) {
  try {
    await fetch(`${base}/api/generate`, {
      method: "POST",
      body: JSON.stringify({ model, keep_alive: KEEP_ALIVE, options: { num_ctx: 2048 } }),
    });
  } catch {
    /* warm-up is best effort */
  }
}

export function ollamaProvider(base: string, model: string): AssistantProvider {
  const key = `${base}|${model}`;
  const run = async (
    messages: Parameters<AssistantProvider["generate"]>[0],
    opts: GenerateOptions,
  ) => {
    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      signal: opts.signal ?? null,
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        keep_alive: KEEP_ALIVE,
        ...(opts.json ? { format: opts.json } : {}),
        options: {
          temperature: opts.temperature ?? 0.6,
          num_predict: opts.maxTokens ?? 320,
          num_ctx: 2048,
          repeat_penalty: opts.json ? 1 : 1.15,
          ...(cpuOnly.has(key) ? { num_gpu: 0 } : {}),
        },
      }),
    });
    if (!res.ok) throw await failure(res);
    let out = "";
    try {
      for await (const ev of ndjson(res)) {
        if (ev.error) throw new Error(ev.error);
        const t = ev.message?.content ?? "";
        if (!t) continue;
        out += t;
        opts.onText?.(out);
      }
    } catch (e) {
      if (opts.signal?.aborted) return out;
      throw e;
    }
    return out;
  };
  return {
    async generate(messages, opts: GenerateOptions = {}) {
      try {
        return await run(messages, opts);
      } catch (e) {
        if (cpuOnly.has(key) || !(e instanceof Error) || !GPU_CRASH.test(e.message)) throw e;
        cpuOnly.add(key);
        return run(messages, opts);
      }
    },
  };
}
