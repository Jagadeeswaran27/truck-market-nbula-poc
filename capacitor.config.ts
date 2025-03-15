import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.truckmarket.app',
  appName: 'TruckMarket',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Geolocation: {
      permissions: {
        ios: {
          whenInUse: true,
          always: false
        },
        android: {
          coarseLocation: true,
          fineLocation: true
        }
      }
    }
  }
};

export default config;