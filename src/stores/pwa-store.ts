import { create } from "zustand";

import type { QueuedTransaction } from "@/lib/offline-queue";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type PwaState = {
  online: boolean;
  pending: QueuedTransaction[];
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
  setOnline: (online: boolean) => void;
  setPending: (pending: QueuedTransaction[]) => void;
  setInstallEvent: (e: BeforeInstallPromptEvent | null) => void;
  setInstalled: (installed: boolean) => void;
};

export const usePwaStore = create<PwaState>()((set) => ({
  online: true,
  pending: [],
  installEvent: null,
  installed: false,
  setOnline: (online) => {
    set({ online });
  },
  setPending: (pending) => {
    set({ pending });
  },
  setInstallEvent: (installEvent) => {
    set({ installEvent });
  },
  setInstalled: (installed) => {
    set({ installed });
  },
}));
