import { z } from 'zod';

/** Server-only. Expo CLI loads .env.local into process.env for API routes. */
const googleEnv = z.object({
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GOOGLE_CLOUD_LOCATION: z.string().min(1),
});

export interface GoogleEnv {
  project: string;
  location: string;
}

export function readGoogleEnv(source: Record<string, string | undefined>): GoogleEnv {
  const env = googleEnv.parse(source);
  return { project: env.GOOGLE_CLOUD_PROJECT, location: env.GOOGLE_CLOUD_LOCATION };
}
