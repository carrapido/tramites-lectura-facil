import { z } from 'zod';

import { postJson, serverReason, type ClientFailure } from '@/screens/post-json';
import type { Plan } from '@/tramites/plan';
import type { Fact } from '@/tramites/ports';

/** One Gemini function-calling turn takes a few seconds; 30 s ends a stalled request. */
export const PLAN_DEADLINE_MS = 30_000;

export type PlanFailure = ClientFailure;

export type PlanResult = { ok: true; plan: Plan } | { ok: false; reason: PlanFailure };

const plan = z.object({
  checklist: z.array(z.object({ text: z.string(), sourceQuote: z.string() })),
  reminder: z
    .object({ dueDate: z.string(), title: z.string(), place: z.string().optional(), sourceQuote: z.string() })
    .nullable(),
});

const planBody = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), plan }),
  z.object({ ok: z.literal(false), reason: serverReason }),
]);

/** Asks the laptop for a checklist and reminder proposal; nothing is scheduled here (S7). */
export async function fetchPlan(facts: Fact[], deadlineMs = PLAN_DEADLINE_MS): Promise<PlanResult> {
  return postJson('/api/plan', { facts }, planBody, deadlineMs);
}
