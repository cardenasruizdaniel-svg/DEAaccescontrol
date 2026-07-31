import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../theme/ThemeContext";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Ingrese correo y contraseña");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Credenciales inválidas";
      Alert.alert("Error de acceso", typeof msg === "string" ? msg : "Credenciales inválidas");
    }
    setLoading(false);
  };

  const s = styles(theme);

  return (
    <KeyboardAvoidingView style={[s.container]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={s.logoContainer}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>DA</Text>
          </View>
          <Text style={s.appName}>DLA Access Enterprise</Text>
          <Text style={s.appSubtitle}>DLA Redes y Seguridad</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>Iniciar Sesión</Text>
          <Text style={s.cardSubtitle}>Ingrese sus credenciales para continuar</Text>

          <Text style={s.label}>Correo electrónico</Text>
          <View style={s.inputContainer}>
            <Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="correo@empresa.com"
              placeholderTextColor={theme.colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <Text style={s.label}>Contraseña</Text>
          <View style={s.inputContainer}>
            <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} style={s.inputIcon} />
            <TextInput
              style={s.input}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={s.eyeBtn}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[s.button, loading && s.buttonDisabled]} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={s.buttonText}>Iniciar Sesión</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={s.footer}>© {new Date().getFullYear()} DLA Redes y Seguridad S.A.S.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
    logoContainer: { alignItems: "center", marginBottom: 32 },
    logoBox: { width: 72, height: 72, borderRadius: 18, backgroundColor: t.colors.primary, justifyContent: "center", alignItems: "center", marginBottom: 16 },
    logoText: { color: "#fff", fontSize: 28, fontWeight: "bold" },
    appName: { fontSize: 22, fontWeight: "bold", color: t.colors.text },
    appSubtitle: { fontSize: 13, color: t.colors.textSecondary, marginTop: 4 },
    card: { backgroundColor: t.colors.surface, borderRadius: 16, padding: 28, marginBottom: 24, shadowColor: t.colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: t.dark ? 0.3 : 0.08, shadowRadius: 8, elevation: 4 },
    cardTitle: { fontSize: 20, fontWeight: "bold", color: t.colors.text, marginBottom: 4 },
    cardSubtitle: { fontSize: 13, color: t.colors.textSecondary, marginBottom: 20 },
    label: { fontSize: 13, fontWeight: "600", color: t.colors.textSecondary, marginBottom: 6, marginLeft: 2 },
    inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: t.colors.input, borderWidth: 1, borderColor: t.colors.inputBorder, borderRadius: 10, marginBottom: 16, height: 48 },
    inputIcon: { marginLeft: 14, marginRight: 8 },
    input: { flex: 1, fontSize: 15, color: t.colors.text, height: "100%" },
    eyeBtn: { paddingRight: 14, paddingVertical: 10 },
    button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, backgroundColor: t.colors.primary, borderRadius: 12, marginTop: 8 },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    footer: { textAlign: "center", fontSize: 11, color: t.colors.textMuted },
  });
}
