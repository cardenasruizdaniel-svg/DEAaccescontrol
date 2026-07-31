import { Platform } from "react-native";
if (Platform.OS !== "web") {
  import("react-native-reanimated");
}
import { registerRootComponent } from "expo";
import App from "./App";
registerRootComponent(App);
