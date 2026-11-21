import { z } from 'zod';

import { postJson, replayedFlag, serverReason, type ClientFailure } from '@/screens/post-json';
import type { EasyReadCard } from '@/tramites/easy-read';
import type { Fact } from '@/tramites/ports';

/** The server writes and translates up to seven facts in a few seconds; 20 s ends a stalled request. */
export const EASY_READ_DEADLINE_MS = 20_000;

export type EasyReadFailure = ClientFailure;

/** `replayed: true` means a demo recording answered: show REPLAY_LABEL. */
export type EasyReadResult = { ok: true; cards: EasyReadCard[]; replayed?: boolean } | { ok: false; reason: EasyReadFailure };

const unit = z.number().min(0).max(1);

const card = z.object({
  kind: z.string(),
  plainSpanish: z.string(),
  maya: z.string().nullable(),
  mayaStatus: z.enum(['machine-unreviewed', 'unavailable']),
  sourceQuote: z.string(),
  box: z.object({ x: unit, y: unit, width: unit, height: unit }).optional(),
});

const easyReadBody = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), cards: z.array(card), replayed: replayedFlag }),
  z.object({ ok: z.literal(false), reason: serverReason }),
]);

/** Sends the facts to the laptop and returns the easy-read cards or the failure reason (S6). */
export async function fetchEasyRead(facts: Fact[], deadlineMs = EASY_READ_DEADLINE_MS): Promise<EasyReadResult> {
  return postJson('/api/easy-read', { facts }, easyReadBody, deadlineMs);
}
