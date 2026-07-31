import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from "react";
import {
  Animated, Text, StyleSheet, View, TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

function ToastStack({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  const { theme } = useTheme();

  if (toasts.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {toasts.map((t) => (
        <ToastItemView key={t.id} toast={t} theme={theme} onDismiss={() => onDismiss(t.id)} />
      ))}
    </View>
  );
}

function ToastItemView({ toast, theme, onDismiss }: { toast: ToastItem; theme: any; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  const config: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    success: { icon: "checkmark-circle", color: theme.colors.success },
    error: { icon: "alert-circle", color: theme.colors.danger },
    info: { icon: "information-circle", color: theme.colors.info || "#3b82f6" },
    warning: { icon: "warning", color: theme.colors.warning },
  };

  const c = config[toast.type];

  return (
    <Animated.View style={[styles.toast, { backgroundColor: theme.colors.surface, shadowColor: "#000", opacity, transform: [{ translateY }] }]}>
      <Ionicons name={c.icon} size={20} color={c.color} />
      <Text style={[styles.message, { color: theme.colors.text }]} numberOfLines={2}>{toast.message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={16} color={theme.colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: "absolute", top: 60, left: 16, right: 16, zIndex: 9999, gap: 8 },
  toast: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  message: { flex: 1, fontSize: 14, fontWeight: "500" },
});
