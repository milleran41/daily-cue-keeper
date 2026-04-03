import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chimeup.app',
  appName: 'ChimeUp',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#6366f1',
      sound: 'default',
    }
  }
};

export default config;
