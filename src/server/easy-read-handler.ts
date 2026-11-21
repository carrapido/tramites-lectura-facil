import { toEasyReadCards, type EasyReadDependencies } from '@/tramites/easy-read';

import { composeOrNull } from './compose-or-null';
import { factsRequestSchema } from './fact-schema';
import { configMissingResponse, googleFailureResponse } from './failure-response';
import { declaresOversizedBody, invalidRequestResponse, jsonOrNull } from './request-body';

/** Seven short facts fit in a few kilobytes; 64 KB leaves ample room. */
const MAX_REQUEST_BYTES = 64 * 1024;

/** POST /api/easy-read: traceable facts in, plain Spanish and Maya cards out (S1-S5). */
export async function handleEasyRead(request: Request, compose: () => EasyReadDependencies): Promise<Response> {
  if (declaresOversizedBody(request, MAX_REQUEST_BYTES)) return invalidRequestResponse();
  const body = factsRequestSchema.safeParse(await jsonOrNull(request));
  if (!body.success) return invalidRequestResponse();

  const dependencies = composeOrNull(compose, 'easy-read');
  if (!dependencies) return configMissingResponse();

  try {
    const cards = await toEasyReadCards(body.data.facts, dependencies);
    return Response.json({ ok: true, cards });
  } catch (error) {
    return googleFailureResponse(error, 'easy-read');
  }
}
