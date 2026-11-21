import { z } from 'zod';

import { apiUrl } from '@/screens/api-url';

/** Failures the app has a message for; anything else from the server becomes bad-response. */
export type ClientFailure = 'invalid-request' | 'adc-missing' | 'config-missing' | 'timeout' | 'unreachable' | 'bad-response';

export type TransportFailure = { ok: false; reason: Extract<ClientFailure, 'timeout' | 'unreachable' | 'bad-response'> };

/** Any reason the UI has no message for, such as upstream-failed, becomes bad-response. */
export const serverReason = z.enum(['invalid-request', 'adc-missing', 'config-missing', 'bad-response']).catch('bad-response');

/**
 * POSTs JSON to a laptop API route and validates the answer with `schema`.
 * Aborts after `deadlineMs`; a network error is unreachable, an unexpected body bad-response.
 */
export async function postJson<T>(path: string, body: unknown, schema: z.ZodType<T>, deadlineMs: number): Promise<T | TransportFailure> {
  // https://developer.mozilla.org/en-US/docs/Web/API/AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  try {
    return await request(path, body, schema, controller.signal);
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(path: string, body: unknown, schema: z.ZodType<T>, signal: AbortSignal): Promise<T | TransportFailure> {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const parsed = schema.safeParse(parseJsonOrNull(await response.text()));
  return parsed.success ? parsed.data : { ok: false, reason: 'bad-response' };
}

function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
