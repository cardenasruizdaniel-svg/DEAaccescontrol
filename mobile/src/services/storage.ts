import { Platform } from "react-native";

const isWeb = Platform.OS === "web";

const webStorage = {
  async getItem(key: string): Promise<string | null> {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  },
  async deleteItem(key: string): Promise<void> {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  },
};

let nativeStorage: typeof webStorage | null = null;
if (!isWeb) {
  try {
    nativeStorage = require("expo-secure-store");
  } catch {
    nativeStorage = webStorage;
  }
}

const storage = isWeb ? webStorage : nativeStorage || webStorage;

export const SecureStore = {
  getItemAsync: storage.getItem,
  setItemAsync: storage.setItem,
  deleteItemAsync: storage.deleteItem,
};

export default SecureStore;
