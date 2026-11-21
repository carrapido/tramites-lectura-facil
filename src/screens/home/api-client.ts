import { z } from 'zod';

import { apiUrl } from '@/screens/api-url';

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
