import { z } from 'zod';

import { apiUrl } from '@/screens/api-url';
import type { EasyReadCard } from '@/tramites/easy-read';
import type { Fact } from '@/tramites/ports';

/** The server writes and translates up to seven facts in a few seconds; 20 s ends a stalled request. */
export const EASY_READ_DEADLINE_MS = 20_000;

export type EasyReadFailure = 'invalid-request' | 'adc-missing' | 'config-missing' | 'timeout' | 'unreachable' | 'bad-response';

export type EasyReadResult = { ok: true; cards: EasyReadCard[] } | { ok: false; reason: EasyReadFailure };

const unit = z.number().min(0).max(1);

const card = z.object({
  kind: z.string(),
  plainSpanish: z.string(),
  maya: z.string().nullable(),
  mayaStatus: z.enum(['machine-unreviewed', 'unavailable']),
  sourceQuote: z.string(),
  box: z.object({ x: unit, y: unit, width: unit, height: unit }).optional(),
});

/** Any reason the UI has no message for, such as upstream-failed, becomes bad-response. */
const serverReason = z.enum(['invalid-request', 'adc-missing', 'config-missing', 'bad-response']).catch('bad-response');

const easyReadBody = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), cards: z.array(card) }),
  z.object({ ok: z.literal(false), reason: serverReason }),
]);

/** Sends the facts to the laptop and returns the easy-read cards or the failure reason (S6). */
export async function fetchEasyRead(facts: Fact[], deadlineMs = EASY_READ_DEADLINE_MS): Promise<EasyReadResult> {
  // https://developer.mozilla.org/en-US/docs/Web/API/AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  try {
    return await requestCards(facts, controller.signal);
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

async function requestCards(facts: Fact[], signal: AbortSignal): Promise<EasyReadResult> {
  const response = await fetch(apiUrl('/api/easy-read'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ facts }),
    signal,
  });
  const parsed = easyReadBody.safeParse(parseJsonOrNull(await response.text()));
  return parsed.success ? parsed.data : { ok: false, reason: 'bad-response' };
}

function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
