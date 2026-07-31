import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/authStore";
import { useOfflineStore } from "../stores/offlineStore";
import { useTheme, ThemeProvider } from "../theme/ThemeContext";
import api from "../services/api";
import { registerForPushNotifications } from "../services/notifications";
import { ToastProvider } from "../hooks/useToast";

import LoginScreen from "../screens/auth/LoginScreen";
import FirstLoginScreen from "../screens/auth/FirstLoginScreen";
import EnrollmentScreen from "../screens/auth/EnrollmentScreen";
import DashboardScreen from "../screens/dashboard/DashboardScreen";
import ScheduleScreen from "../screens/schedule/ScheduleScreen";
import ShiftDetailScreen from "../screens/schedule/ShiftDetailScreen";
import AccessScreen from "../screens/access/AccessScreen";
import ShiftSessionScreen from "../screens/shift_session/ShiftSessionScreen";
import VisitDetailScreen from "../screens/access/VisitDetailScreen";
import GeolocationScreen from "../screens/geolocation/GeolocationScreen";
import PayrollScreen from "../screens/payroll/PayrollScreen";
import PayrollDetailScreen from "../screens/payroll/PayrollDetailScreen";
import HistoryScreen from "../screens/history/HistoryScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import SettingsScreen from "../screens/profile/SettingsScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border, height: 88, paddingBottom: 28, paddingTop: 8 },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            Inicio: "home",
            Programación: "calendar",
            Turno: "briefcase",
            Nómina: "wallet",
            Perfil: "person",
          };
          return <Ionicons name={icons[route.name] ?? "ellipse"} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} />
      <Tab.Screen name="Programación" component={ScheduleScreen} />
      <Tab.Screen name="Turno" component={ShiftSessionScreen} />
      <Tab.Screen name="Nómina" component={PayrollScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { theme, isDark } = useTheme();
  const { isAuthenticated, isLoading, user, employeeId, setEmployeeId, setEnrolled, isEnrolled, isFirstLogin, forcePasswordChange } = useAuthStore();
  const { loadUser } = useAuthStore();
  const { loadRecords, startNetworkListener, syncPending, initialize } = useOfflineStore();
  const [needsEnrollment, setNeedsEnrollment] = useState(false);

  useEffect(() => {
    loadUser();
    initialize();
    startNetworkListener();
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    (async () => {
      try {
        const empRes = await api.get("/employees", { params: { company_id: user.company_id, search: user.email, page_size: 1 } });
        if (empRes.data.items?.length > 0) {
          const emp = empRes.data.items[0];
          setEmployeeId(emp.id);
          const enrollRes = await api.get(`/facial-recognition/enrollment-status/${emp.id}`);
          const enrolled = enrollRes.data?.enrolled ?? enrollRes.data?.has_photos ?? false;
          setEnrolled(enrolled);
          setNeedsEnrollment(!enrolled);
        }
      } catch {}
      try { await registerForPushNotifications(); } catch {}
      syncPending();
    })();
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Cargando...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (isFirstLogin || forcePasswordChange) ? (
        <Stack.Screen name="FirstLogin" component={FirstLoginScreen} />
      ) : needsEnrollment ? (
        <Stack.Screen name="Enrollment" component={EnrollmentScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="ShiftDetail" component={ShiftDetailScreen} options={{ presentation: "card" }} />
          <Stack.Screen name="VisitDetail" component={VisitDetailScreen} options={{ presentation: "card" }} />
          <Stack.Screen name="Geolocation" component={GeolocationScreen} options={{ presentation: "card" }} />
          <Stack.Screen name="PayrollDetail" component={PayrollDetailScreen} options={{ presentation: "card" }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ presentation: "card" }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ presentation: "card" }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ presentation: "card" }} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </ToastProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 15 },
});
