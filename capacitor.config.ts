import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hlfe.app',
  appName: 'HLFE',
  webDir: 'out',
  server: {
    // Use localhost during development
    // Comment this out for production builds
    // url: 'http://localhost:3000',
    // cleartext: true
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'HLFE'
  }
};

export default config;
