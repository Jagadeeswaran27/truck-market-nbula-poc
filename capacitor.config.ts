import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.truckmarket.app",
  appName: "TruckMarket",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    Geolocation: {
      androidBackgroundPermission: true,
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
