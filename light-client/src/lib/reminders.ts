import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { friendlyTime } from './tasks';
import type { CareTask } from './types';

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

/**
 * Schedules the doctor's care-plan tasks as repeating local notifications, in the child's wording. They live on
 * the device, so they fire with no connection. Local notifications work in Expo Go; remote push needs a dev build.
 */
export async function scheduleReminders(tasks: CareTask[]): Promise<void> {
  if (!isNative) return;
  try {
    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Care plan reminders',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const task of tasks) {
      if (!task.time || task.active === false) continue;
      const [hour, minute] = task.time.split(':').map(Number);
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Dotty is waiting!', body: `${task.quest_title} — ${friendlyTime(task.time)}.` },
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
