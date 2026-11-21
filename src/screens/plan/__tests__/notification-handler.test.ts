import * as Notifications from 'expo-notifications';

import { registerReminderHandler } from '@/screens/plan/notification-handler';

jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn() }));

const FIRED: Notifications.Notification = {
  date: 0,
  request: {
    identifier: 'tramite-reminder-due-day',
    content: {
      title: 'Recordatorio de su trámite',
      subtitle: null,
      body: 'Hoy vence.',
      categoryIdentifier: null,
      sound: null,
      threadIdentifier: null,
    },
    trigger: null,
  },
};

// No mock clearing between tests: the module's "only once" guard lives for the whole file.
describe('registerReminderHandler (L5 foreground)', () => {
  it('registers a handler that shows a reminder firing while the app is open', async () => {
    registerReminderHandler();

    const [handler] = jest.mocked(Notifications.setNotificationHandler).mock.calls[0] ?? [null];
    expect(await handler?.handleNotification(FIRED)).toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });

  it('registers the handler only once when called twice', () => {
    registerReminderHandler();
    registerReminderHandler();

    expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
  });
});
