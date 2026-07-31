import { create } from "zustand";
import SecureStore from "../services/storage";
import api from "../services/api";
import { User } from "../types";

interface AuthState {
  user: User | null;
  employeeId: string | null;
  companyId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEnrolled: boolean;
  isFirstLogin: boolean;
  forcePasswordChange: boolean;
  login: (email: string, password: string) => Promise<void>;
  completeFirstLogin: (data: { full_name?: string; phone?: string; biometric_enrolled?: boolean }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setEnrolled: (v: boolean) => void;
  setEmployeeId: (id: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  employeeId: null,
  companyId: null,
  isAuthenticated: false,
  isLoading: true,
  isEnrolled: false,
  isFirstLogin: false,
  forcePasswordChange: false,

  login: async (email: string, password: string) => {
    const res = await api.post("/auth/login?platform=mobile", { email, password });
    const { access_token, refresh_token, user, first_login, force_password_change } = res.data;
    await SecureStore.setItemAsync("access_token", access_token);
    await SecureStore.setItemAsync("refresh_token", refresh_token);
    if (user?.company_id) {
      await SecureStore.setItemAsync("company_id", user.company_id);
    }
    set({
      user, isAuthenticated: true,
      companyId: user?.company_id ?? get().companyId,
      isFirstLogin: first_login === true,
      forcePasswordChange: force_password_change === true,
    });
  },

  completeFirstLogin: async (data) => {
    await api.post("/auth/complete-first-login", data);
    set({ isFirstLogin: false });
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    await api.post("/auth/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    set({ forcePasswordChange: false });
  },

  logout: async () => {
    try { await api.post("/auth/logout"); } catch {}
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, isAuthenticated: false, employeeId: null, isFirstLogin: false, forcePasswordChange: false });
  },

  loadUser: async () => {
    try {
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) { set({ isLoading: false }); return; }
      const res = await api.get("/auth/me");
      const user = res.data as User;
      const companyId = await SecureStore.getItemAsync("company_id");
      set({ user, isAuthenticated: true, companyId: user.company_id ?? companyId, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setEnrolled: (v: boolean) => set({ isEnrolled: v }),
  setEmployeeId: (id: string) => set({ employeeId: id }),
}));
