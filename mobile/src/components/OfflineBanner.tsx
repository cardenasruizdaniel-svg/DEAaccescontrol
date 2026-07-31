import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOfflineStore } from "../stores/offlineStore";
import { useTheme } from "../theme/ThemeContext";

export default function OfflineBanner() {
  const { theme } = useTheme();
  const { isOnline, pendingCount, isSyncing, syncPending } = useOfflineStore();
  const pendingLocationCount = 0;
  const [expanded, setExpanded] = useState(false);
  const slideAnim = useState(new Animated.Value(-60))[0];

  const totalPending = pendingCount + pendingLocationCount;
  const showBanner = !isOnline || totalPending > 0 || isSyncing;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: showBanner ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [showBanner]);

  if (!showBanner) return null;

  const s = styles(theme);

  return (
    <Animated.View style={[s.banner, { transform: [{ translateY: slideAnim }], backgroundColor: !isOnline ? theme.colors.danger + "15" : theme.colors.warning + "15" }]}>
      <TouchableOpacity style={s.bannerContent} onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={s.bannerLeft}>
          <Ionicons
            name={!isOnline ? "cloud-offline" : isSyncing ? "sync" : "cloud-upload"}
            size={18}
            color={!isOnline ? theme.colors.danger : theme.colors.warning}
          />
          <Text style={[s.bannerText, { color: !isOnline ? theme.colors.danger : theme.colors.text }]}>
            {!isOnline
              ? `Sin conexion${totalPending > 0 ? ` — ${totalPending} pendientes` : ""}`
              : isSyncing
              ? "Sincronizando..."
              : `${totalPending} registros pendientes`}
          </Text>
        </View>
        <View style={s.bannerRight}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : !isOnline ? null : (
            <TouchableOpacity onPress={() => syncPending()} style={s.syncBtn}>
              <Ionicons name="sync" size={14} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={16} color={theme.colors.textMuted} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={s.expandedContent}>
          {pendingCount > 0 && (
            <View style={s.expandedRow}>
              <Ionicons name="finger-print" size={14} color={theme.colors.textMuted} />
              <Text style={[s.expandedText, { color: theme.colors.textSecondary }]}>
                Registros de acceso: {pendingCount}
              </Text>
            </View>
          )}
          {pendingLocationCount > 0 && (
            <View style={s.expandedRow}>
              <Ionicons name="location" size={14} color={theme.colors.textMuted} />
              <Text style={[s.expandedText, { color: theme.colors.textSecondary }]}>
                Ubicaciones: {pendingLocationCount}
              </Text>
            </View>
          )}
          {!isOnline && (
            <Text style={[s.expandedHint, { color: theme.colors.textMuted }]}>
              Los registros se enviaran cuando haya conexion
            </Text>
          )}
          {isOnline && !isSyncing && totalPending > 0 && (
            <TouchableOpacity style={[s.syncAllBtn, { backgroundColor: theme.colors.primary }]} onPress={() => syncPending()}>
              <Ionicons name="sync" size={14} color="#fff" />
              <Text style={s.syncAllBtnText}>Sincronizar ahora</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
}

function styles(t: any) {
  return StyleSheet.create({
    banner: { marginHorizontal: 16, marginTop: 8, borderRadius: 12, overflow: "hidden" },
    bannerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
    bannerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    bannerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    bannerText: { fontSize: 13, fontWeight: "500", flex: 1 },
    syncBtn: { width: 28, height: 28, borderRadius: 14, justifyContent: "center", alignItems: "center", backgroundColor: t.colors.primary + "15" },
    expandedContent: { paddingHorizontal: 14, paddingBottom: 12 },
    expandedRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    expandedText: { fontSize: 13 },
    expandedHint: { fontSize: 12, marginTop: 4, fontStyle: "italic" },
    syncAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 10, marginTop: 8 },
    syncAllBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    syncedBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginHorizontal: 16, marginTop: 8, paddingVertical: 8, borderRadius: 10 },
    syncedText: { fontSize: 13, fontWeight: "500" },
  });
}
