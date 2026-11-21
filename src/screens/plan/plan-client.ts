import { z } from 'zod';

import { postJson, replayedFlag, serverReason, type ClientFailure } from '@/screens/post-json';
import type { Category } from '@/tramites/category';
import type { Plan } from '@/tramites/plan';
import type { Fact } from '@/tramites/ports';

/** One Gemini function-calling turn takes a few seconds; 30 s ends a stalled request. */
export const PLAN_DEADLINE_MS = 30_000;

export type PlanFailure = ClientFailure;

/** `replayed: true` means a demo recording answered: show REPLAY_LABEL. */
export type PlanResult = { ok: true; plan: Plan; replayed?: boolean } | { ok: false; reason: PlanFailure };

const plan = z.object({
  checklist: z.array(z.object({ text: z.string(), sourceQuote: z.string() })),
  reminder: z
    .object({ dueDate: z.string(), title: z.string(), place: z.string().optional(), sourceQuote: z.string() })
    .nullable(),
});

const planBody = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), plan, replayed: replayedFlag }),
  z.object({ ok: z.literal(false), reason: serverReason }),
]);

/**
 * Asks the laptop for a checklist and reminder proposal; nothing is scheduled here (S7).
 * The paper's category shapes the proposal (context-categories S5); without it the laptop uses "otro".
 * The older `fetchPlan(facts, deadlineMs)` shape still works.
 */
export function fetchPlan(facts: Fact[], deadlineMs?: number): Promise<PlanResult>;
export function fetchPlan(facts: Fact[], category?: Category, deadlineMs?: number): Promise<PlanResult>;
export async function fetchPlan(
  facts: Fact[],
  categoryOrDeadline?: Category | number,
  deadlineMs = PLAN_DEADLINE_MS,
): Promise<PlanResult> {
  if (typeof categoryOrDeadline === 'number') return postJson('/api/plan', { facts }, planBody, categoryOrDeadline);
  return postJson('/api/plan', planRequest(facts, categoryOrDeadline), planBody, deadlineMs);
}

function planRequest(facts: Fact[], category: Category | undefined): { facts: Fact[]; category?: Category } {
  return category ? { facts, category } : { facts };
}
