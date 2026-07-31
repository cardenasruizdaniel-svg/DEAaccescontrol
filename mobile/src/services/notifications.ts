import { Platform } from "react-native";
import SecureStore from "./storage";
import api from "./api";

const isWeb = Platform.OS === "web";

let Notifications: any = null;
let Device: any = null;

if (!isWeb) {
  try { Notifications = require("expo-notifications"); } catch {}
  try { Device = require("expo-device"); } catch {}
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (isWeb || !Notifications) return null;
  if (!Device?.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "DLA Access",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#1a56db",
    });
    await Notifications.setNotificationChannelAsync("shifts", {
      name: "Turnos",
      importance: Notifications.AndroidImportance.HIGH,
      description: "Notificaciones de turnos y programación",
    });
    await Notifications.setNotificationChannelAsync("payroll", {
      name: "Nómina",
      importance: Notifications.AndroidImportance.DEFAULT,
      description: "Notificaciones de nómina y pagos",
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;
  await SecureStore.setItemAsync("push_token", pushToken);

  try {
    await api.post("/notifications/register", { token: pushToken });
  } catch {}

  return pushToken;
}

export async function scheduleShiftReminder(shiftName: string, startTime: string, shiftDate: string) {
  if (isWeb || !Notifications) return;
  const [hours, minutes] = startTime.split(":").map(Number);
  const trigger = new Date(shiftDate + "T00:00:00");
  trigger.setHours(hours - 1, minutes, 0, 0);

  if (trigger <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Turno próximo",
      body: `Su turno "${shiftName}" inicia en 1 hora (${startTime})`,
      data: { type: "shift_reminder" },
    },
    trigger: { date: trigger },
  });
}

export async function cancelAllNotifications() {
  if (isWeb || !Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function addNotificationListener(handler: (notification: any) => void) {
  if (isWeb || !Notifications) return { remove() {} };
  return Notifications.addNotificationReceivedListener(handler);
}

export function addResponseListener(handler: (response: any) => void) {
  if (isWeb || !Notifications) return { remove() {} };
  return Notifications.addNotificationResponseReceivedListener(handler);
}
