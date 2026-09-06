import { create } from "zustand";

interface AuthState {
  accessToken: string | null;
  isLoading: boolean;

  setAccessToken: (token: string) => void;
  clearAccessToken: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  isLoading: true,

  setAccessToken: (token) => {
    set({ accessToken: token });
  },

  clearAccessToken: () => {
    set({ accessToken: null });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },
}));
