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
  recommended?: boolean;
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

export const WEBLLM_MODELS: WebllmModel[] = [
  {
    id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    label: "Qwen 2.5 · 1.5B",
    downloadMB: 1000,
    vramMB: 1630,
    vramF32MB: 1890,
    speed: "balanced",
    note: "Best all-rounder for chat and quick entry.",
    recommended: true,
  },
  {
    id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    label: "Llama 3.2 · 1B",
    downloadMB: 700,
    vramMB: 880,
    vramF32MB: 1130,
    speed: "fast",
    note: "Light and quick. Good for phones.",
  },
  {
    id: "gemma-2-2b-it-q4f16_1-MLC",
    label: "Gemma 2 · 2B",
    downloadMB: 1400,
    vramMB: 1900,
    vramF32MB: 2510,
    speed: "balanced",
    note: "Friendly writing style.",
  },
  {
    id: "Phi-3.5-mini-instruct-q4f16_1-MLC",
    label: "Phi 3.5 mini · 3.8B",
    downloadMB: 2200,
    vramMB: 3670,
    vramF32MB: 5480,
    speed: "smart",
    note: "Smartest, needs a strong GPU.",
  },
  {
    id: "SmolLM2-360M-Instruct-q4f16_1-MLC",
    label: "SmolLM2 · 360M",
    downloadMB: 270,
    vramMB: 380,
    vramF32MB: 580,
    speed: "fastest",
    note: "Tiny and fast. Fine for quick entry, weak at chat.",
  },
];

export const OLLAMA_MODELS: OllamaModel[] = [
  {
    name: "qwen2.5:3b",
    label: "Qwen 2.5 · 3B",
    sizeGB: 1.9,
    ramGB: 4,
    speed: "fast",
    note: "Best balance for most laptops.",
    recommended: true,
  },
  {
    name: "llama3.2:3b",
    label: "Llama 3.2 · 3B",
    sizeGB: 2.0,
    ramGB: 4,
    speed: "fast",
    note: "Quick and capable.",
  },
  {
    name: "phi4-mini",
    label: "Phi-4 mini · 3.8B",
    sizeGB: 2.5,
    ramGB: 5,
    speed: "balanced",
    note: "Good at numbers and reasoning.",
  },
  {
    name: "gemma3:4b",
    label: "Gemma 3 · 4B",
    sizeGB: 3.3,
    ramGB: 6,
    speed: "balanced",
    note: "Warm, natural writing.",
  },
  {
    name: "mistral:7b",
    label: "Mistral · 7B",
    sizeGB: 4.1,
    ramGB: 8,
    speed: "smart",
    note: "Strongest, needs 8 GB+ RAM.",
  },
];

export const webllmId = (m: WebllmModel, f16: boolean) =>
  f16 ? m.id : m.id.replace("q4f16_1", "q4f32_1");

export const findWebllm = (id: string | null) =>
  id ? WEBLLM_MODELS.find((m) => m.id === id || webllmId(m, false) === id) : undefined;

export const SPEED_LABEL: Record<Speed, string> = {
  fastest: "Fastest",
  fast: "Fast",
  balanced: "Balanced",
  smart: "Smartest",
};

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
