import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Plan } from './types';

const CHANNEL = 'reminders';
const isNative = Platform.OS !== 'web';

if (isNative) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const MESSAGES = {
  check: { title: 'Dotty misses you!', body: 'Time for a check-up together.' },
  meal: { title: 'Dotty is hungry!', body: 'Check-up first, then let’s eat together.' },
  bedtime: { title: 'Goodnight check-up', body: 'One last check-up before Dotty falls asleep.' },
} as const;

/**
 * Schedules the plan's reminders as repeating local notifications. They live on the device, so they still
 * fire with no connection. Local notifications work in Expo Go; remote push would need a development build.
 */
export async function scheduleReminders(plan: Plan | null): Promise<void> {
  if (!isNative) return;
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Check-up reminders',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const r of plan?.reminders ?? []) {
      const [hour, minute] = r.time.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: MESSAGES[r.kind],
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: CHANNEL,
        },
      });
    }
  } catch (e) {
    console.warn('Could not schedule reminders', e);
  }
}
