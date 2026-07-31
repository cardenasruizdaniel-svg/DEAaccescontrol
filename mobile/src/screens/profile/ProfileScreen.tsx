import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput, Modal, Image, Switch, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../theme/ThemeContext";
import { biometricService } from "../../services/biometrics";
import { useToast } from "../../hooks/useToast";
import OfflineBanner from "../../components/OfflineBanner";
import api from "../../services/api";

export default function ProfileScreen({ navigation }: any) {
  const { user, employeeId, logout, changePassword } = useAuthStore();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [employee, setEmployee] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loadingBio, setLoadingBio] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    api.get("/mobile/me/employee").then((r) => setEmployee(r.data)).catch(() => {}).finally(() => setLoadingProfile(false));
  }, []);

  useEffect(() => {
    biometricService.isBiometricEnabled().then(setBiometricEnabled).finally(() => setLoadingBio(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [empRes] = await Promise.all([
        api.get("/mobile/me/employee"),
      ]);
      setEmployee(empRes.data);
    } catch {}
    setRefreshing(false);
  }, []);

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Está seguro que desea cerrar sesión?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Cerrar Sesión", style: "destructive", onPress: logout },
    ]);
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      showToast("Todos los campos son obligatorios", "error");
      return;
    }
    if (newPw.length < 8) {
      showToast("La nueva contraseña debe tener al menos 8 caracteres", "error");
      return;
    }
    if (newPw !== confirmPw) {
      showToast("Las contraseñas no coinciden", "error");
      return;
    }
    setChangingPw(true);
    try {
      await changePassword(currentPw, newPw);
      showToast("Contraseña actualizada correctamente", "success");
      setShowPasswordModal(false);
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e: any) {
      showToast(e?.response?.data?.detail || "No se pudo cambiar la contraseña", "error");
    }
    setChangingPw(false);
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await biometricService.authenticate("Active ingreso biométrico");
      if (!result.success) {
        Alert.alert("Error", "No se pudo verificar su identidad biométrica");
        return;
      }
    }
    await biometricService.setBiometricEnabled(value);
    setBiometricEnabled(value);
  };

  const s = styles(theme);
  const fullName = employee ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim() : user?.full_name || "Empleado";
  const docStr = employee?.document_type && employee?.document_number
    ? `${employee.document_type}: ${employee.document_number}`
    : employee?.code || "N/A";

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <View style={s.header}>
        <Text style={s.title}>Mi Perfil</Text>
      </View>

      <OfflineBanner />

      {loadingProfile ? (
        <View style={s.skeletonContainer}>
          <View style={[s.skeletonAvatar, { backgroundColor: theme.colors.surface }]} />
          <View style={[s.skeletonLine, { backgroundColor: theme.colors.surface, width: 200, marginTop: 16 }]} />
          <View style={[s.skeletonLine, { backgroundColor: theme.colors.surface, width: 160, marginTop: 8 }]} />
          <View style={[s.skeletonCard, { backgroundColor: theme.colors.surface }]} />
        </View>
      ) : (
        <>
      <View style={s.avatarSection}>
        <View style={[s.avatar, employee?.photo_url ? { overflow: "hidden" } : { backgroundColor: theme.colors.primary }]}>
          {employee?.photo_url ? (
            <Image source={{ uri: employee.photo_url }} style={{ width: 80, height: 80 }} />
          ) : (
            <Text style={s.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <Text style={[s.profileName, { color: theme.colors.text }]}>{fullName}</Text>
        <Text style={[s.profileEmail, { color: theme.colors.textSecondary }]}>{user?.email}</Text>
      </View>

      <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
        <ProfileRow theme={theme} icon="person-outline" label="Nombre completo" value={fullName} />
        <ProfileRow theme={theme} icon="card-outline" label="Documento" value={docStr} />
        <ProfileRow theme={theme} icon="mail-outline" label="Email" value={employee?.email || user?.email} />
        <ProfileRow theme={theme} icon="call-outline" label="Teléfono" value={employee?.phone || employee?.mobile || "N/A"} />
        <ProfileRow theme={theme} icon="home-outline" label="Dirección" value={employee?.address || "N/A"} />
        <ProfileRow theme={theme} icon="business-outline" label="Ciudad" value={employee?.city || "N/A"} />
        <ProfileRow theme={theme} icon="calendar-outline" label="Fecha ingreso" value={employee?.hire_date || "N/A"} />
        <ProfileRow theme={theme} icon="medkit-outline" label="EPS" value={employee?.eps || "N/A"} />
        <ProfileRow theme={theme} icon="shield-checkmark-outline" label="ARL" value={employee?.arl || "N/A"} />
      </View>

      <View style={[s.card, { backgroundColor: theme.colors.surface }]}>
        <View style={[miStyles.row, { borderBottomColor: theme.colors.borderLight }]}>
          <Ionicons name="finger-print-outline" size={20} color={theme.colors.primary} />
          <Text style={[miStyles.label, { color: theme.colors.text }]}>Ingreso biométrico</Text>
          {loadingBio ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometric}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + "60" }}
              thumbColor={biometricEnabled ? theme.colors.primary : theme.colors.textMuted}
            />
          )}
        </View>
        <MenuItem theme={theme} icon="key-outline" label="Cambiar Contraseña" onPress={() => setShowPasswordModal(true)} />
        <MenuItem theme={theme} icon="settings-outline" label="Configuración" onPress={() => navigation.navigate("Settings")} />
        <MenuItem theme={theme} icon="document-text-outline" label="Historial de Asistencia" onPress={() => navigation.navigate("History")} />
        <MenuItem theme={theme} icon="help-circle-outline" label="Ayuda y Soporte" onPress={() => Alert.alert("Soporte", "Contacte soporte@dlaredes.com.co")} />
      </View>

      <TouchableOpacity style={[s.logoutBtn, { backgroundColor: theme.colors.danger + "12" }]} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
        <Text style={[s.logoutText, { color: theme.colors.danger }]}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <Text style={[s.version, { color: theme.colors.textMuted }]}>DLA Access Enterprise v1.0.0</Text>
        </>
      )}

      <Modal visible={showPasswordModal} transparent animationType="fade" onRequestClose={() => setShowPasswordModal(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalContent, { backgroundColor: theme.colors.background }]}>
            <Text style={[s.modalTitle, { color: theme.colors.text }]}>Cambiar Contraseña</Text>
            <TextInput
              style={[s.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Contraseña actual"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              value={currentPw}
              onChangeText={setCurrentPw}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Nueva contraseña (mín. 8 caracteres)"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.colors.surface, color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Confirmar nueva contraseña"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              value={confirmPw}
              onChangeText={setConfirmPw}
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.colors.surfaceVariant }]} onPress={() => setShowPasswordModal(false)}>
                <Text style={[s.modalBtnText, { color: theme.colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: theme.colors.primary }]} onPress={handleChangePassword} disabled={changingPw}>
                {changingPw ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[s.modalBtnText, { color: "#fff" }]}>Cambiar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function ProfileRow({ theme, icon, label, value }: any) {
  return (
    <View style={[prStyles.row, { borderBottomColor: theme.colors.borderLight }]}>
      <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
      <View style={prStyles.content}>
        <Text style={[prStyles.label, { color: theme.colors.textMuted }]}>{label}</Text>
        <Text style={[prStyles.value, { color: theme.colors.text }]}>{value || "N/A"}</Text>
      </View>
    </View>
  );
}

const prStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  content: { flex: 1 },
  label: { fontSize: 12, marginBottom: 2 },
  value: { fontSize: 15, fontWeight: "500" },
});

function MenuItem({ theme, icon, label, onPress }: any) {
  return (
    <TouchableOpacity style={[miStyles.row, { borderBottomColor: theme.colors.borderLight }]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
      <Text style={[miStyles.label, { color: theme.colors.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
}

const miStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  label: { flex: 1, fontSize: 15, fontWeight: "500" },
});

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    content: { paddingBottom: 40 },
    header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
    title: { fontSize: 24, fontWeight: "bold", color: t.colors.text },
    skeletonContainer: { alignItems: "center", paddingTop: 24 },
    skeletonAvatar: { width: 80, height: 80, borderRadius: 24 },
    skeletonLine: { height: 14, borderRadius: 7 },
    skeletonCard: { height: 200, borderRadius: 16, marginTop: 24, marginHorizontal: 20, width: "100%" },
    avatarSection: { alignItems: "center", marginBottom: 24 },
    avatar: { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 12 },
    avatarText: { color: "#fff", fontSize: 32, fontWeight: "bold" },
    profileName: { fontSize: 20, fontWeight: "bold", color: t.colors.text },
    profileEmail: { fontSize: 14, color: t.colors.textSecondary, marginTop: 2 },
    card: { marginHorizontal: 20, borderRadius: 16, padding: 16, marginBottom: 16 },
    logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, marginHorizontal: 20, borderRadius: 12, marginBottom: 16 },
    logoutText: { fontSize: 16, fontWeight: "600" },
    version: { textAlign: "center", fontSize: 12, color: t.colors.textMuted },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 32 },
    modalContent: { borderRadius: 20, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20, textAlign: "center" },
    input: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 15, borderWidth: 1, marginBottom: 12 },
    modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
    modalBtn: { flex: 1, height: 48, borderRadius: 12, justifyContent: "center", alignItems: "center" },
    modalBtnText: { fontSize: 15, fontWeight: "600" },
  });
}
