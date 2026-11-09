import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { DEFAULT_OLLAMA_URL, type ProviderKind } from "@/modules/assistant/domain/models";

export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
};

type Prefs = {
  enabled: boolean;
  provider: ProviderKind;
  webllmModel: string | null;
  ollamaUrl: string;
  ollamaModel: string | null;
};

type AssistantState = Prefs & {
  owner: string | null;
  messages: StoredMessage[];
  update: (patch: Partial<Prefs>) => void;
  ensureOwner: (userId: string) => void;
  push: (message: StoredMessage) => void;
  patchMessage: (id: string, patch: Partial<StoredMessage>) => void;
  clearChat: () => void;
};

const MAX_MESSAGES = 40;

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      enabled: false,
      provider: "webllm",
      webllmModel: null,
      ollamaUrl: DEFAULT_OLLAMA_URL,
      ollamaModel: null,
      owner: null,
      messages: [],
      update: (patch) => {
        set(patch);
      },
      ensureOwner: (userId) => {
        if (get().owner !== userId) set({ owner: userId, messages: [] });
      },
      push: (message) => {
        set((s) => ({ messages: [...s.messages, message].slice(-MAX_MESSAGES) }));
      },
      patchMessage: (id, patch) => {
        set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
      },
      clearChat: () => {
        set({ messages: [] });
      },
    }),
    {
      name: "oink-assistant",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

type Loading = { progress: number; text: string } | null;

// kept out of the persisted store so progress ticks never hit localStorage
export const useAiLoading = create<{ loading: Loading; setLoading: (l: Loading) => void }>()(
  (set) => ({
    loading: null,
    setLoading: (loading) => {
      set({ loading });
    },
  }),
);
