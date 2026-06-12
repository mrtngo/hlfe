import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'xyz.rayotrade.app',
  appName: 'Rayo',
  webDir: 'out',
  // NOTE: `server.url` makes Capacitor load the app from a remote URL instead
  // of the bundled `out/` directory. Enable this ONLY for local development —
  // production / TestFlight builds must run against the static bundle.
  // Toggle via env: `CAPACITOR_DEV_SERVER=http://192.168.x.y:3000 npm run cap:sync`.
  ...(process.env.CAPACITOR_DEV_SERVER
    ? {
        server: {
          url: process.env.CAPACITOR_DEV_SERVER,
          cleartext: process.env.CAPACITOR_DEV_SERVER.startsWith('http://'),
        },
      }
    : {}),
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'rayo',
  },
  plugins: {
    SplashScreen: {
      // We dismiss programmatically from CapacitorInit once React has
      // painted, so the native splash stays up until then. A long upper
      // bound prevents flicker on cold launches.
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: '#000000',
      // No spinner — splash artwork already has the brand mark.
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
      overlaysWebView: false,
    },
    PushNotifications: {
      // Banner + sound + badge when a push arrives while the app is foreground.
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
