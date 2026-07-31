import { create } from "zustand";
import type { User } from "@/types";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("dla_token"),
  user: (() => {
    try {
      const u = localStorage.getItem("dla_user");
      return u ? JSON.parse(u) : null;
    } catch { return null; }
  })(),
  isAuthenticated: !!localStorage.getItem("dla_token"),
  isLoading: false,
  login: (token, user) => {
    localStorage.setItem("dla_token", token);
    localStorage.setItem("dla_user", JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("dla_token");
    localStorage.removeItem("dla_user");
    set({ token: null, user: null, isAuthenticated: false });
  },
  setUser: (user) => {
    localStorage.setItem("dla_user", JSON.stringify(user));
    set({ user });
  },
  setLoading: (isLoading) => set({ isLoading }),
}));
