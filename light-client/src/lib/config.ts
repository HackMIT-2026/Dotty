import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 8000;

/**
 * Where the Dotty API lives when nothing is configured:
 *  - EXPO_PUBLIC_API_URL if set (deployed server),
 *  - web: the same host the page was served from,
 *  - Expo Go: the laptop that is running Metro (same Wi-Fi), which is where the API runs during dev.
 */
export function defaultApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `http://${window.location.hostname}:${API_PORT}`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:${API_PORT}`;
}

export const SYNC_INTERVAL_MS = 15_000;
export const REQUEST_TIMEOUT_MS = 8_000;
