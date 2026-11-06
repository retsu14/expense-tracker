import { create } from "zustand";

type UiState = {
  quickAddOpen: boolean;
  setQuickAddOpen: (open: boolean) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  quickAddOpen: false,
  setQuickAddOpen: (quickAddOpen) => {
    set({ quickAddOpen });
  },
}));
