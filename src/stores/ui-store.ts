import { create } from "zustand";

type UiState = {
  quickAddOpen: boolean;
  passwordFocused: boolean;
  passwordVisible: boolean;
  setQuickAddOpen: (open: boolean) => void;
  setPasswordState: (patch: { focused?: boolean; visible?: boolean }) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  quickAddOpen: false,
  passwordFocused: false,
  passwordVisible: false,
  setQuickAddOpen: (quickAddOpen) => {
    set({ quickAddOpen });
  },
  setPasswordState: ({ focused, visible }) => {
    set((s) => ({
      passwordFocused: focused ?? s.passwordFocused,
      passwordVisible: visible ?? s.passwordVisible,
    }));
  },
}));
