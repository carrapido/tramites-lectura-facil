import { proposePlan, type PlanDependencies } from '@/tramites/plan';

import { composeOrNull } from './compose-or-null';
import { replayedField } from './demo-mode';
import { planRequestSchema } from './fact-schema';
import { configMissingResponse, googleFailureResponse } from './failure-response';
import { declaresOversizedBody, invalidRequestResponse, jsonOrNull } from './request-body';

/** Seven short facts fit in a few kilobytes; 64 KB leaves ample room. */
const MAX_REQUEST_BYTES = 64 * 1024;

/** POST /api/plan: traceable facts and the paper's category in, a traceable checklist and reminder out (S1-S3). Nothing is scheduled here. */
export async function handlePlan(request: Request, compose: () => PlanDependencies, replayed = false): Promise<Response> {
  if (declaresOversizedBody(request, MAX_REQUEST_BYTES)) return invalidRequestResponse();
  const body = planRequestSchema.safeParse(await jsonOrNull(request));
  if (!body.success) return invalidRequestResponse();

  const dependencies = composeOrNull(compose, 'plan');
  if (!dependencies) return configMissingResponse();

  try {
    const plan = await proposePlan(body.data.facts, dependencies, body.data.category);
    return Response.json({ ok: true, plan, ...replayedField(replayed) });
  } catch (error) {
    return googleFailureResponse(error, 'plan');
  }
}
