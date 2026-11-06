import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type Settings = {
  sound: boolean;
  haptics: boolean;
  hideAmounts: boolean;
};

type SettingsState = Settings & {
  update: (patch: Partial<Settings>) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sound: false,
      haptics: true,
      hideAmounts: false,
      update: (patch) => {
        set(patch);
      },
    }),
    { name: "oink-settings", storage: createJSONStorage(() => localStorage), version: 1 },
  ),
);
