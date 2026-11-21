import { setNotificationHandler, type NotificationBehavior } from 'expo-notifications';

/**
 * Without a handler, a reminder that fires while the app is open is not shown.
 * Fields from node_modules/expo-notifications/build/Notifications.types.d.ts:661-674 (SDK 58);
 * `shouldShowAlert` is deprecated there. https://docs.expo.dev/versions/v58.0.0/sdk/notifications/#setnotificationhandlerhandler
 */
const SHOW_IN_FOREGROUND: NotificationBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
};

let registered = false;

/** Call once at app start; later calls do nothing. */
export function registerReminderHandler(): void {
  if (registered) return;
  registered = true;
  setNotificationHandler({ handleNotification: showInForeground });
}

async function showInForeground(): Promise<NotificationBehavior> {
  return SHOW_IN_FOREGROUND;
}
