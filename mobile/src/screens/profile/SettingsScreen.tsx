import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { useAuthStore } from "../../stores/authStore";
import OfflineBanner from "../../components/OfflineBanner";
import { biometricService } from "../../services/biometrics";
import SecureStore from "../../services/storage";

export default function SettingsScreen({ navigation }: any) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuthStore();
  const [autoLock, setAutoLock] = useState(true);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    (async () => {
      const savedAutoLock = await SecureStore.getItemAsync("dla_settings_autolock");
      if (savedAutoLock !== null) setAutoLock(savedAutoLock === "true");
      const savedNotifications = await SecureStore.getItemAsync("dla_settings_notifications");
      if (savedNotifications !== null) setNotifications(savedNotifications === "true");
    })();
  }, []);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [biometricLoading, setBiometricLoading] = useState(true);

  useEffect(() => {
    loadBiometricStatus();
  }, []);

  const loadBiometricStatus = async () => {
    setBiometricLoading(true);
    const available = await biometricService.isHardwareAvailable();
    const type = await biometricService.getBiometricType();
    const enrolled = await biometricService.isEnrolled();
    const enabled = await biometricService.isBiometricEnabled();
    setBiometricAvailable(available && enrolled);
    setBiometricType(type);
    setBiometricEnabled(enabled);
    setBiometricLoading(false);
  };

  const toggleBiometric = async (value: boolean) => {
    if (!biometricAvailable) {
      Alert.alert("No disponible", "Su dispositivo no tiene biomtria configurada. Configure Face ID o huella dactilar en la configuracion del sistema.");
      return;
    }

    if (value) {
      const result = await biometricService.authenticate("Verifique su identidad para activar biomtria");
      if (result.success) {
        await biometricService.setBiometricEnabled(true);
        setBiometricEnabled(true);
        Alert.alert("Activada", "La autenticacion biomtrica ha sido activada.");
      } else {
        Alert.alert("Error", result.error || "No se pudo verificar su identidad");
      }
    } else {
      const result = await biometricService.authenticate("Verifique su identidad para desactivar biomtria");
      if (result.success) {
        await biometricService.setBiometricEnabled(false);
        setBiometricEnabled(false);
        Alert.alert("Desactivada", "La autenticacion biomtrica ha sido desactivada.");
      } else {
        Alert.alert("Error", result.error || "No se pudo verificar su identidad");
      }
    }
  };

  const biometricLabel = biometricType === "face" ? "Face ID" : biometricType === "fingerprint" ? "Huella Dactilar" : "Biomtria";

  const s = styles(theme);

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={s.title}>Configuracion</Text>
        <View style={{ width: 40 }} />
      </View>

      <OfflineBanner />

      <View style={[s.section, { backgroundColor: theme.colors.surface }]}>        
        <Text style={[s.sectionTitle, { color: theme.colors.textSecondary }]}>Apariencia</Text>
        <View style={[s.row, { borderBottomColor: theme.colors.borderLight }]}>
          <View style={s.rowInfo}>
            <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={theme.colors.primary} />
            <Text style={[s.rowLabel, { color: theme.colors.text }]}>Modo Oscuro</Text>
          </View>
          <Switch value={isDark} onValueChange={toggleTheme} trackColor={{ true: theme.colors.primary, false: theme.colors.disabled }} />
        </View>
      </View>

      <View style={[s.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[s.sectionTitle, { color: theme.colors.textSecondary }]}>Seguridad</Text>
        <View style={[s.row, { borderBottomColor: theme.colors.borderLight }]}>
          <View style={s.rowInfo}>
            <Ionicons name="lock-closed" size={20} color={theme.colors.primary} />
            <Text style={[s.rowLabel, { color: theme.colors.text }]}>Bloqueo Automatico</Text>
          </View>
          <Switch value={autoLock} onValueChange={(v) => { setAutoLock(v); SecureStore.setItemAsync("dla_settings_autolock", String(v)); }} trackColor={{ true: theme.colors.primary, false: theme.colors.disabled }} />
        </View>
        <View style={[s.row, { borderBottomColor: theme.colors.borderLight }]}>
          <View style={s.rowInfo}>
            <Ionicons name="notifications" size={20} color={theme.colors.primary} />
            <Text style={[s.rowLabel, { color: theme.colors.text }]}>Notificaciones</Text>
          </View>
          <Switch value={notifications} onValueChange={(v) => { setNotifications(v); SecureStore.setItemAsync("dla_settings_notifications", String(v)); }} trackColor={{ true: theme.colors.primary, false: theme.colors.disabled }} />
        </View>
      </View>

      <View style={[s.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[s.sectionTitle, { color: theme.colors.textSecondary }]}>Cuenta</Text>
        <TouchableOpacity style={[s.row, { borderBottomColor: theme.colors.borderLight }]} onPress={() => Alert.alert("Proximamente", "Funcion en desarrollo")}>
          <View style={s.rowInfo}>
            <Ionicons name="key" size={20} color={theme.colors.primary} />
            <Text style={[s.rowLabel, { color: theme.colors.text }]}>Cambiar Contrasena</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
        </TouchableOpacity>

        <View style={[s.row, { borderBottomColor: theme.colors.borderLight }]}>
          <View style={s.rowInfo}>
            <Ionicons name="finger-print" size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[s.rowLabel, { color: theme.colors.text }]}>{biometricLabel}</Text>
              {biometricType && (
                <Text style={[s.rowHint, { color: theme.colors.textMuted }]}>
                  {biometricAvailable ? `Disponible en este dispositivo` : "No configurado en el sistema"}
                </Text>
              )}
            </View>
          </View>
          {biometricLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              disabled={!biometricAvailable}
              trackColor={{ true: theme.colors.primary, false: theme.colors.disabled }}
            />
          )}
        </View>
      </View>

      <View style={[s.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[s.sectionTitle, { color: theme.colors.textSecondary }]}>Acerca de</Text>
        <View style={[s.row, { borderBottomColor: theme.colors.borderLight }]}>
          <View style={s.rowInfo}>
            <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
            <Text style={[s.rowLabel, { color: theme.colors.text }]}>Version</Text>
          </View>
          <Text style={[s.rowValue, { color: theme.colors.textSecondary }]}>1.0.0</Text>
        </View>
        <View style={[s.row, { borderBottomColor: theme.colors.borderLight }]}>
          <View style={s.rowInfo}>
            <Ionicons name="build" size={20} color={theme.colors.primary} />
            <Text style={[s.rowLabel, { color: theme.colors.text }]}>Build</Text>
          </View>
          <Text style={[s.rowValue, { color: theme.colors.textSecondary }]}>2026.07</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    title: { fontSize: 18, fontWeight: "bold", color: t.colors.text },
    section: { marginHorizontal: 20, borderRadius: 16, padding: 4, marginBottom: 16 },
    sectionTitle: { fontSize: 12, fontWeight: "600", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: "uppercase" },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1 },
    rowInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: "500" },
    rowHint: { fontSize: 12, marginTop: 2 },
    rowValue: { fontSize: 14 },
  });
}
