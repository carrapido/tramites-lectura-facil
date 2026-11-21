import Constants from 'expo-constants';

/** In Expo Go the API routes live on the laptop dev server: the same host that serves the bundle. */
export function apiUrl(path: string): string {
  // https://docs.expo.dev/versions/v58.0.0/sdk/constants/
  const host = Constants.expoConfig?.hostUri ?? 'localhost:8081';
  return `http://${host}${path}`;
}
