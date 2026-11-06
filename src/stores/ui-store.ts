import { create } from "zustand";

type UiState = {
  quickAddOpen: boolean;
  editTransactionId: string | null;
  passwordFocused: boolean;
  passwordVisible: boolean;
  setQuickAddOpen: (open: boolean) => void;
  openEditTransaction: (id: string) => void;
  setPasswordState: (patch: { focused?: boolean; visible?: boolean }) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  quickAddOpen: false,
  editTransactionId: null,
  passwordFocused: false,
  passwordVisible: false,
  setQuickAddOpen: (quickAddOpen) => {
    set(quickAddOpen ? { quickAddOpen, editTransactionId: null } : { quickAddOpen });
  },
  openEditTransaction: (id) => {
    set({ quickAddOpen: true, editTransactionId: id });
  },
  setPasswordState: ({ focused, visible }) => {
    set((s) => ({
      passwordFocused: focused ?? s.passwordFocused,
      passwordVisible: visible ?? s.passwordVisible,
    }));
  },
}));
