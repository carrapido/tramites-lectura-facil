import { Stack } from 'expo-router';

import { registerReminderHandler } from '@/screens/plan/notification-handler';

// Once at module load, so a reminder that fires while the app is open is shown (L5).
registerReminderHandler();

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
