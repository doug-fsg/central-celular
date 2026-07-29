import type { CapacitorConfig } from '@capacitor/cli'

const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL

const config: CapacitorConfig = {
  appId: 'com.aprisco.app',
  appName: 'Aprisco',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    ...(devServerUrl
      ? {
          url: devServerUrl,
          cleartext: devServerUrl.startsWith('http://'),
        }
      : {}),
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#f9fafb',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#7928fa',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
}

export default config
