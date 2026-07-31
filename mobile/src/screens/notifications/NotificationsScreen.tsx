import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import OfflineBanner from "../../components/OfflineBanner";
import api from "../../services/api";

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await api.get("/notifications", { params: { page_size: 50 } });
      setNotifications(res.data.items || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {}
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const typeColorMap: Record<string, string> = {
    shift: "primary",
    payroll: "success",
    system: "info",
    alert: "warning",
  };

  const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    shift: "calendar",
    payroll: "wallet",
    system: "information-circle",
    alert: "alert-circle",
  };

  const s = styles(theme);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Notificaciones</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={[s.markAll, { color: theme.colors.primary }]}>Leer todas</Text>
          </TouchableOpacity>
        )}
        {unreadCount === 0 && <View style={{ width: 60 }} />}
      </View>

      <OfflineBanner />

      {unreadCount > 0 && (
        <View style={[s.unreadBanner, { backgroundColor: theme.colors.primary + "12" }]}>
          <Text style={[s.unreadText, { color: theme.colors.primary }]}>{unreadCount} sin leer</Text>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color={theme.colors.textMuted} />
          <Text style={[s.emptyText, { color: theme.colors.textMuted }]}>No hay notificaciones</Text>
        </View>
      ) : (
        notifications.map((n) => (
          <TouchableOpacity
            key={n.id}
            style={[s.card, { backgroundColor: n.is_read ? theme.colors.surface : theme.colors.primary + "08" }]}
            onPress={() => markAsRead(n.id)}
            activeOpacity={0.7}
          >
            <View style={[s.iconBox, { backgroundColor: ((theme.colors[typeColorMap[n.type] as keyof typeof theme.colors] || theme.colors.info) as string) + "15" }]}>
              <Ionicons
                name={typeIcons[n.type] || "notifications"}
                size={20}
                color={(theme.colors[typeColorMap[n.type] as keyof typeof theme.colors] as string) || theme.colors.info}
              />
            </View>
            <View style={s.cardContent}>
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>{n.title}</Text>
                {!n.is_read && <View style={[s.dot, { backgroundColor: theme.colors.primary }]} />}
              </View>
              <Text style={[s.cardBody, { color: theme.colors.textSecondary }]} numberOfLines={2}>{n.body}</Text>
              <Text style={[s.cardTime, { color: theme.colors.textMuted }]}>{formatTime(n.created_at)}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return d.toLocaleDateString();
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontWeight: "bold", color: t.colors.text },
    markAll: { fontSize: 14, fontWeight: "600" },
    unreadBanner: { marginHorizontal: 20, borderRadius: 10, padding: 10, marginBottom: 12, alignItems: "center" },
    unreadText: { fontSize: 13, fontWeight: "600" },
    emptyContainer: { alignItems: "center", paddingTop: 80 },
    emptyText: { fontSize: 14, marginTop: 12 },
    card: { flexDirection: "row", marginHorizontal: 20, borderRadius: 14, padding: 14, marginBottom: 8 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
    cardContent: { flex: 1 },
    cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
    cardTitle: { fontSize: 15, fontWeight: "600", flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
    cardBody: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
    cardTime: { fontSize: 11 },
  });
}
