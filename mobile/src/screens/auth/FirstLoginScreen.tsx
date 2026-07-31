import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, useColorScheme, KeyboardAvoidingView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";

const COLORS = {
  light: { bg: "#F8FAFC", card: "#FFFFFF", text: "#0F172A", muted: "#64748B", border: "#E2E8F0", primary: "#2563EB", success: "#16A34A" },
  dark: { bg: "#0F172A", card: "#1E293B", text: "#F8FAFC", muted: "#94A3B8", border: "#334155", primary: "#3B82F6", success: "#22C55E" },
};

export default function FirstLoginScreen() {
  const scheme = useColorScheme() || "light";
  const c = COLORS[scheme];
  const { completeFirstLogin, changePassword, forcePasswordChange } = useAuthStore();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [step, setStep] = useState<"welcome" | "password" | "profile">(
    forcePasswordChange ? "password" : "welcome"
  );
  const [loading, setLoading] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) {
      Alert.alert("Error", "Complete todos los campos de contrasena");
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert("Error", "Las contrasenas no coinciden");
      return;
    }
    if (newPw.length < 8) {
      Alert.alert("Error", "La contrasena debe tener al menos 8 caracteres");
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPw, newPw);
      setStep("profile");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Error al cambiar contrasena");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    setLoading(true);
    try {
      await completeFirstLogin({
        full_name: fullName || undefined,
        phone: phone || undefined,
      });
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Error al completar perfil");
    } finally {
      setLoading(false);
    }
  };

  const s = styles(c);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView style={s.container} contentContainerStyle={s.content}>
        {step === "welcome" && (
          <View style={s.card}>
            <View style={s.iconContainer}>
              <Ionicons name="hand-left-outline" size={48} color={c.primary} />
            </View>
            <Text style={s.title}>Bienvenido a DLA Access</Text>
            <Text style={s.subtitle}>
              Esta es tu primera vez en la plataforma. Por favor completa tu perfil para continuar.
            </Text>
            <TouchableOpacity style={s.button} onPress={() => setStep("profile")}>
              <Text style={s.buttonText}>Completar Perfil</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === "password" && (
          <View style={s.card}>
            <View style={s.iconContainer}>
              <Ionicons name="lock-closed-outline" size={48} color={c.primary} />
            </View>
            <Text style={s.title}>Cambiar Contrasena</Text>
            <Text style={s.subtitle}>
              {forcePasswordChange
                ? "Tu contrasena temporal debe ser cambiada antes de continuar."
                : "Actualiza tu contrasena para mayor seguridad."}
            </Text>

            <View style={s.field}>
              <Text style={s.label}>Contrasena Actual</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  value={currentPw}
                  onChangeText={setCurrentPw}
                  secureTextEntry={!showCurrentPw}
                  placeholder="Ingrese contrasena actual"
                  placeholderTextColor={c.muted}
                />
                <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)} style={s.eyeBtn}>
                  <Ionicons name={showCurrentPw ? "eye-off" : "eye"} size={20} color={c.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Nueva Contrasena</Text>
              <View style={s.inputRow}>
                <TextInput
                  style={s.input}
                  value={newPw}
                  onChangeText={setNewPw}
                  secureTextEntry={!showNewPw}
                  placeholder="Minimo 8 caracteres"
                  placeholderTextColor={c.muted}
                />
                <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)} style={s.eyeBtn}>
                  <Ionicons name={showNewPw ? "eye-off" : "eye"} size={20} color={c.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Confirmar Nueva Contrasena</Text>
              <TextInput
                style={s.input}
                value={confirmPw}
                onChangeText={setConfirmPw}
                secureTextEntry
                placeholder="Repita la nueva contrasena"
                placeholderTextColor={c.muted}
              />
            </View>

            <TouchableOpacity style={s.button} onPress={handleChangePassword} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.buttonText}>Cambiar Contrasena</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step === "profile" && (
          <View style={s.card}>
            <View style={s.iconContainer}>
              <Ionicons name="person-outline" size={48} color={c.primary} />
            </View>
            <Text style={s.title}>Tu Perfil</Text>
            <Text style={s.subtitle}>Confirma o actualiza tu informacion personal.</Text>

            <View style={s.field}>
              <Text style={s.label}>Nombre Completo</Text>
              <TextInput
                style={s.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nombre y apellidos"
                placeholderTextColor={c.muted}
              />
            </View>

            <View style={s.field}>
              <Text style={s.label}>Telefono</Text>
              <TextInput
                style={s.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+57 300 123 4567"
                placeholderTextColor={c.muted}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity style={s.button} onPress={handleCompleteProfile} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.buttonText}>Completar y Continuar</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (c: typeof COLORS.light) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 20, paddingTop: 60, alignItems: "center" },
    card: {
      backgroundColor: c.card, borderRadius: 16, padding: 24, width: "100%", maxWidth: 400,
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    },
    iconContainer: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: `${c.primary}15`,
      alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16,
    },
    title: { fontSize: 22, fontWeight: "700", color: c.text, textAlign: "center", marginBottom: 8 },
    subtitle: { fontSize: 14, color: c.muted, textAlign: "center", marginBottom: 24, lineHeight: 20 },
    field: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: "600", color: c.text, marginBottom: 6 },
    input: {
      backgroundColor: c.bg, borderWidth: 1, borderColor: c.border, borderRadius: 10,
      paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: c.text,
    },
    inputRow: { flexDirection: "row", alignItems: "center" },
    eyeBtn: { position: "absolute", right: 12, padding: 4 },
    button: {
      backgroundColor: c.primary, borderRadius: 12, paddingVertical: 14,
      alignItems: "center", marginTop: 8,
    },
    buttonText: { color: "#FFF", fontSize: 16, fontWeight: "600" },
  });
