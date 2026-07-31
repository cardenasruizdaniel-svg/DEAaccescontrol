import { create } from "zustand";
import api from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  employeeId: string | null;
  companyId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstLogin: boolean;
  forcePasswordChange: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setEmployeeId: (id: string) => void;
}

function getStoredCompanyId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("company_id");
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  employeeId: null,
  companyId: getStoredCompanyId(),
  isAuthenticated: false,
  isLoading: true,
  isFirstLogin: false,
  forcePasswordChange: false,

  login: async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { access_token, refresh_token, user, first_login, force_password_change } = res.data;
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    if (user?.company_id) {
      localStorage.setItem("company_id", user.company_id);
      set({ companyId: user.company_id });
    }
    set({
      user, isAuthenticated: true,
      isFirstLogin: first_login === true,
      forcePasswordChange: force_password_change === true,
    });
  },

  logout: async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("company_id");
    set({ user: null, isAuthenticated: false, employeeId: null });
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) { set({ isLoading: false }); return; }
      const res = await api.get("/auth/me");
      const data = res.data;
      if (data?.company_id) {
        localStorage.setItem("company_id", data.company_id);
        set({ companyId: data.company_id });
      }
      set({
        user: data,
        isAuthenticated: true,
        isLoading: false,
        employeeId: data.employee_id || data.id,
      });
    } catch {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      set({ isLoading: false });
    }
  },

  setEmployeeId: (id: string) => set({ employeeId: id }),
}));
