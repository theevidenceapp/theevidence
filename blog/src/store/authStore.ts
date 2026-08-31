import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  token: string | null;
  isInitialized: boolean;

  setToken: (token: string | null) => void;
  setInitialized: (value: boolean) => void;

  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isInitialized: false,

  setToken: (token) => set({ token }),

  setInitialized: (value) =>
    set({
      isInitialized: value,
    }),

  clear: () =>
    set({
      token: null,
    }),
}));
