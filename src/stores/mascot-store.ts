import { create } from "zustand";

import type { Mood } from "@/modules/mascot/domain/mood";

type Message = { id: number; text: string };

type MascotState = {
  mood: Mood;
  message: Message | null;
  setMood: (mood: Mood) => void;
  say: (text: string) => void;
};

let nextId = 0;

export const useMascotStore = create<MascotState>()((set) => ({
  mood: "happy",
  message: null,
  setMood: (mood) => {
    set({ mood });
  },
  say: (text) => {
    nextId += 1;
    set({ message: { id: nextId, text } });
  },
}));
