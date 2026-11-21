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

/**
 * User ADC carries no quota project, and Cloud Translation rejects calls without one.
 * google-auth-library reads GOOGLE_CLOUD_QUOTA_PROJECT, so default it to the project
 * instead of asking every teammate for an extra .env.local line; a configured value wins.
 * https://cloud.google.com/docs/authentication/adc-troubleshooting/user-creds
 */
export function defaultQuotaProject(target: Record<string, string | undefined>, project: string): void {
  if (!target.GOOGLE_CLOUD_QUOTA_PROJECT) target.GOOGLE_CLOUD_QUOTA_PROJECT = project;
}
