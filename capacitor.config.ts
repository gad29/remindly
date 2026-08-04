import type { CapacitorConfig } from '@capacitor/cli'

const appUrl = process.env.REMINDLY_APP_URL || 'https://remindly.ghsystems.work'

const config: CapacitorConfig = {
  appId: 'app.remindly.mobile',
  appName: 'Remindly',
  webDir: 'web-app/dist',
  server: { url: appUrl, cleartext: appUrl.startsWith('http://') },
  android: { allowMixedContent: false },
  ios: { contentInset: 'automatic' }
}

export default config
