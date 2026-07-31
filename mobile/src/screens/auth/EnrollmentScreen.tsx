import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, Image, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useTheme } from "../../theme/ThemeContext";
import api from "../../services/api";

let Camera: any = null;
let CameraType: any = null;
let ImagePicker: any = null;
if (Platform.OS !== "web") {
  try { Camera = require("expo-camera").Camera; CameraType = require("expo-camera").CameraType; } catch {}
  try { ImagePicker = require("expo-image-picker"); } catch {}
}

type Step = "intro" | "capture" | "preview" | "processing" | "done";

export default function EnrollmentScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>("intro");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [cameraRef, setCameraRef] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const { employeeId, setEnrolled } = useAuthStore();
  const { theme } = useTheme();

  useEffect(() => {
    if (Platform.OS === "web" || !Camera) { setHasPermission(false); return; }
    Camera.requestCameraPermissionsAsync().then((res: any) => {
      setHasPermission(res.granted);
    });
  }, []);

  const takePicture = async () => {
    if (!cameraRef) return;
    setStep("processing");
    try {
      const photo = await cameraRef.takePictureAsync({ base64: true, quality: 0.8 });
      setPhotoUri(photo.uri);
      setPhotoBase64(photo.base64);
      setStep("preview");
    } catch {
      Alert.alert("Error", "No se pudo capturar la imagen");
      setStep("capture");
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Se necesita acceso a la galería");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      setPhotoBase64(result.assets[0].base64 || null);
      setStep("preview");
    }
  };

  const confirmAndRegister = async () => {
    if (!photoBase64 || !employeeId) return;
    setStep("processing");
    try {
      await api.post("/facial-recognition/register", {
        employee_id: employeeId,
        photo_base64: photoBase64,
      });
      setEnrolled(true);
      setStep("done");
      setTimeout(() => navigation.replace("Main"), 2000);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "No se pudo registrar la fotografía biométrica");
      setStep("preview");
    }
  };

  const retake = () => {
    setPhotoUri(null);
    setPhotoBase64(null);
    setStep("capture");
  };

  const s = styles(theme);

  if (hasPermission === null) {
    return <View style={s.container}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }
  if (!hasPermission) {
    return (
      <View style={s.container}>
        <View style={s.centerContent}>
          <Ionicons name="camera-outline" size={64} color={theme.colors.textMuted} />
          <Text style={s.permTitle}>Permiso de cámara requerido</Text>
          <Text style={s.permText}>DLA Access necesita acceso a la cámara para el enrolamiento biométrico facial.</Text>
          <TouchableOpacity style={s.button} onPress={async () => {
            if (Platform.OS === "web" || !Camera) {
              Alert.alert("No disponible", "La cámara no está disponible en esta plataforma");
              return;
            }
            const res = await Camera.requestCameraPermissionsAsync();
            setHasPermission(res.granted);
          }}>
            <Text style={s.buttonText}>Conceder Permiso</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      {step === "intro" && (
        <View style={s.centerContent}>
          <View style={s.introIcon}>
            <Ionicons name="scan-outline" size={48} color={theme.colors.primary} />
          </View>
          <Text style={s.title}>Enrolamiento Biométrico</Text>
          <Text style={s.subtitle}>
            Para acceder a la aplicación, necesitamos registrar su fotografía como referencia biométrica.
          </Text>
          <View style={s.checklist}>
            {["Rostro visible y frontal", "Buena iluminación", "Una sola persona", "Sin accesorios que cubran el rostro"].map((item, i) => (
              <View key={i} style={s.checkItem}>
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                <Text style={s.checkText}>{item}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={s.button} onPress={() => setStep("capture")} activeOpacity={0.8}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={s.buttonText}>Capturar Fotografía</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === "capture" && (
        <View style={s.cameraContainer}>
          <Camera
            style={s.camera}
            ref={(ref: any) => setCameraRef(ref)}
            type={CameraType.front}
          >
            <View style={s.cameraOverlay}>
              <View style={s.faceCircle} />
              <Text style={s.cameraHint}>Alinee su rostro dentro del óvalo</Text>
            </View>
            <View style={s.cameraBottom}>
              <TouchableOpacity style={s.captureBtn} onPress={takePicture} activeOpacity={0.7}>
                <View style={s.captureBtnInner} />
              </TouchableOpacity>
            </View>
          </Camera>
        </View>
      )}

      {step === "preview" && photoUri && (
        <View style={s.centerContent}>
          <Image source={{ uri: photoUri }} style={s.previewImage} />
          <Text style={s.title}>Verificar Fotografía</Text>
          <Text style={s.subtitle}>Verifique que la imagen sea nítida y su rostro sea claramente visible.</Text>
          <View style={s.previewActions}>
            <TouchableOpacity style={s.secondaryButton} onPress={retake}>
              <Ionicons name="refresh" size={18} color={theme.colors.primary} />
              <Text style={s.secondaryButtonText}>Tomar de Nuevo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.button} onPress={confirmAndRegister}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.buttonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === "processing" && (
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[s.title, { marginTop: 16 }]}>Procesando...</Text>
          <Text style={s.subtitle}>Verificando calidad de imagen y registrando biométrico</Text>
        </View>
      )}

      {step === "done" && (
        <View style={s.centerContent}>
          <View style={s.doneIcon}>
            <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
          </View>
          <Text style={s.title}>Enrolamiento Exitoso</Text>
          <Text style={s.subtitle}>Su fotografía biométrica ha sido registrada correctamente.</Text>
        </View>
      )}
    </View>
  );
}

function styles(t: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.colors.background },
    centerContent: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
    introIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: t.colors.surfaceVariant, justifyContent: "center", alignItems: "center", marginBottom: 24 },
    title: { fontSize: 22, fontWeight: "bold", color: t.colors.text, textAlign: "center", marginBottom: 8 },
    subtitle: { fontSize: 14, color: t.colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 16 },
    checklist: { alignSelf: "stretch", marginBottom: 32 },
    checkItem: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10, marginLeft: 16 },
    checkText: { fontSize: 14, color: t.colors.textSecondary },
    button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, backgroundColor: t.colors.primary, borderRadius: 12, paddingHorizontal: 32 },
    buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
    secondaryButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: 50, backgroundColor: "transparent", borderRadius: 12, borderWidth: 1.5, borderColor: t.colors.primary, paddingHorizontal: 24 },
    secondaryButtonText: { color: t.colors.primary, fontSize: 15, fontWeight: "600" },
    cameraContainer: { flex: 1 },
    camera: { flex: 1, justifyContent: "space-between" },
    cameraOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
    faceCircle: { width: 200, height: 260, borderRadius: 100, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)", borderStyle: "dashed" },
    cameraHint: { color: "#fff", fontSize: 14, marginTop: 20, textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    cameraBottom: { alignItems: "center", paddingBottom: 48 },
    captureBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: "#fff", justifyContent: "center", alignItems: "center" },
    captureBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff" },
    previewImage: { width: 200, height: 260, borderRadius: 16, marginBottom: 16 },
    previewActions: { flexDirection: "row", gap: 12 },
    doneIcon: { marginBottom: 16 },
    permTitle: { fontSize: 18, fontWeight: "bold", color: t.colors.text, marginTop: 16, marginBottom: 8 },
    permText: { fontSize: 14, color: t.colors.textSecondary, textAlign: "center", lineHeight: 20, marginBottom: 24, paddingHorizontal: 16 },
  });
}
