import { create } from 'zustand';
import type { User } from '../types';
import { MOCK_USERS } from '../data/constants';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
}

const STORAGE_KEY = 'ip_platform_auth';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (username: string, _password: string) => {
    set({ isLoading: true, error: null });
    await new Promise((resolve) => setTimeout(resolve, 600));

    const user = MOCK_USERS.find((u) => u.username === username);
    if (user) {
      set({ user, isLoading: false });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return true;
    }

    set({ isLoading: false, error: '用户名或密码错误' });
    return false;
  },

  logout: () => {
    set({ user: null });
    localStorage.removeItem(STORAGE_KEY);
  },

  checkAuth: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as User;
        set({ user });
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  },
}));
