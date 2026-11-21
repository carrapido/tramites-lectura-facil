import Constants from 'expo-constants';
import { z } from 'zod';

const healthBody = z.object({ ok: z.literal(true) });
const smokeBody = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), plainSpanish: z.string(), maya: z.string() }),
  z.object({ ok: z.literal(false), reason: z.string(), fix: z.string().optional() }),
]);

export type SmokeBody = z.infer<typeof smokeBody>;

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(apiUrl('/api/health'));
    return healthBody.safeParse(await response.json()).success;
  } catch {
    return false;
  }
}

export async function runSmoke(): Promise<SmokeBody> {
  try {
    const response = await fetch(apiUrl('/api/smoke'));
    return smokeBody.parse(await response.json());
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}

/** In Expo Go the API routes live on the laptop dev server: the same host that serves the bundle. */
function apiUrl(path: string): string {
  // https://docs.expo.dev/versions/v58.0.0/sdk/constants/
  const host = Constants.expoConfig?.hostUri ?? 'localhost:8081';
  return `http://${host}${path}`;
}
