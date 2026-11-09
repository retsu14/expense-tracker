export type ProviderKind = "webllm" | "ollama";

export type Speed = "fastest" | "fast" | "balanced" | "smart";

export type WebllmModel = {
  id: string;
  label: string;
  downloadMB: number;
  vramMB: number;
  vramF32MB: number;
  speed: Speed;
  note: string;
  forPhone: boolean;
};

export type OllamaModel = {
  name: string;
  label: string;
  sizeGB: number;
  ramGB: number;
  speed: Speed;
  note: string;
  recommended?: boolean;
};

// display names are tiers on purpose; ids stay internal
export const WEBLLM_MODELS: WebllmModel[] = [
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Fast · 1B",
    downloadMB: 700,
    vramMB: 880,
    vramF32MB: 1130,
    speed: "fast",
    note: "Quick replies. Best for most phones.",
    forPhone: true,
  },
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Balanced · 1.5B",
    downloadMB: 900,
    vramMB: 1630,
    vramF32MB: 1890,
    speed: "balanced",
    note: "Smarter answers. Best for computers.",
    forPhone: false,
  },
  {
    id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
    label: "Tiny · 0.5B",
    downloadMB: 290,
    vramMB: 945,
    vramF32MB: 1060,
    speed: "fastest",
    note: "Smallest download. Good for quick entry.",
    forPhone: true,
  },
  {
    id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",
    label: "Smart · 3B",
    downloadMB: 1800,
    vramMB: 2505,
    vramF32MB: 2894,
    speed: "smart",
    note: "Best answers. Needs a strong computer.",
    forPhone: false,
  },
];

export const OLLAMA_MODELS: OllamaModel[] = [
  {
    name: "qwen2.5:3b",
    label: "Balanced · 3B",
    sizeGB: 1.9,
    ramGB: 4,
    speed: "balanced",
    note: "Best for most computers.",
    recommended: true,
  },
  {
    name: "qwen2.5:1.5b",
    label: "Fast · 1.5B",
    sizeGB: 1.0,
    ramGB: 2,
    speed: "fast",
    note: "Quickest replies on older laptops.",
  },
  {
    name: "qwen2.5:7b",
    label: "Smart · 7B",
    sizeGB: 4.7,
    ramGB: 8,
    speed: "smart",
    note: "Best answers. Needs 8 GB+ RAM.",
  },
];

export const LEGACY_WEBLLM = [
  "gemma-2-2b-it",
  "Phi-3.5-mini-instruct",
  "SmolLM2-360M-Instruct",
].flatMap((base) => [`${base}-q4f16_1-MLC`, `${base}-q4f32_1-MLC`]);

export const ollamaLabel = (name: string) =>
  OLLAMA_MODELS.find((m) => m.name === name || `${m.name}:latest` === name)?.label ?? name;

export const webllmId = (m: WebllmModel, f16: boolean) =>
  f16 ? m.id : m.id.replace("q4f16_1", "q4f32_1");

export const findWebllm = (id: string | null) =>
  id ? WEBLLM_MODELS.find((m) => m.id === id || webllmId(m, false) === id) : undefined;

export const SPEED_LABEL: Record<Speed, string> = {
  fastest: "Fastest",
  fast: "Fast",
  balanced: "Balanced",
  smart: "Slower",
};

export function recommendedWebllm(isPhone: boolean, deviceMemoryGB: number | null) {
  if (deviceMemoryGB !== null && deviceMemoryGB <= 3) return WEBLLM_MODELS[2] ?? WEBLLM_MODELS[0];
  return WEBLLM_MODELS.find((m) => m.forPhone === isPhone) ?? WEBLLM_MODELS[0];
}

export const DEFAULT_OLLAMA_URL = "http://localhost:11434";

export function normalizeOllamaUrl(input: string): string | null {
  const raw = input.trim() || DEFAULT_OLLAMA_URL;
  try {
    const url = new URL(raw.includes("://") ? raw : `http://${raw}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export const isValidOllamaName = (name: string) =>
  /^[a-z0-9][a-z0-9._\-/]{0,79}(:[a-z0-9._-]{1,40})?$/i.test(name.trim());

export function formatBytes(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

export function friendlyProgress(text: string, progress: number) {
  const pct = `${String(Math.round(progress * 100))}%`;
  if (/fetch|download/i.test(text)) return `Downloading… ${pct}`;
  if (/cache|load|shader|init/i.test(text)) return `Getting ready… ${pct}`;
  return `Starting… ${pct}`;
}
