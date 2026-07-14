import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize } from "@capacitor/keyboard";

const config: CapacitorConfig = {
  appId: "com.calmwallet.app",
  appName: "Calm Wallet",
  webDir: "native-www",
  server: {
    url: "https://calm-wallet.vercel.app",
    cleartext: false,
    allowNavigation: ["calm-wallet.vercel.app"],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.Body,
    },
  },
};

export default config;
