import { create } from "zustand";

interface UIState {
  theme: "light" | "dark";
  notificationsEnabled: boolean;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  setNotifications: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: (localStorage.getItem("dla_theme") as "light" | "dark") || "light",
  notificationsEnabled: localStorage.getItem("dla_notifications") !== "false",
  setTheme: (theme) => {
    localStorage.setItem("dla_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("dla_theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return { theme: next };
    }),
  setNotifications: (enabled) => {
    localStorage.setItem("dla_notifications", String(enabled));
    set({ notificationsEnabled: enabled });
  },
}));
