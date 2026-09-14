import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'EDITOR' | 'READER' | 'RESEARCHER';

interface AuthState {
    accessToken: string | null;
    isLoading: boolean;
    role: UserRole;
    setRole: (value: UserRole) => void;
    setAccessToken: (token: string) => void;
    clearAccessToken: () => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    accessToken: null,
    isLoading: true,
    role: 'READER',
    setRole: (value) => {
        set({ role: value });
    },
    setAccessToken: (token) => {
        set({ accessToken: token });
    },

    clearAccessToken: () => {
        set({ accessToken: null, role: 'READER' });
    },

    setLoading: (loading) => {
        set({ isLoading: loading });
    },
}));
