import { z } from 'zod';

import { toEasyReadCards, type EasyReadDependencies } from '@/tramites/easy-read';

import { composeOrNull } from './compose-or-null';
import { configMissingResponse, googleFailureResponse } from './failure-response';
import { declaresOversizedBody, invalidRequestResponse, jsonOrNull } from './request-body';

/** Seven short facts fit in a few kilobytes; 64 KB leaves ample room. */
const MAX_REQUEST_BYTES = 64 * 1024;

const unit = z.number().min(0).max(1);

/** The fact shape returned by POST /api/read (objective 3). */
const fact = z.object({
  kind: z.string().min(1),
  text: z.string().min(1),
  sourceQuote: z.string().min(1),
  box: z.object({ x: unit, y: unit, width: unit, height: unit }).optional(),
});

const easyReadRequest = z.object({ facts: z.array(fact).min(1).max(7) });

/** POST /api/easy-read: traceable facts in, plain Spanish and Maya cards out (S1-S5). */
export async function handleEasyRead(request: Request, compose: () => EasyReadDependencies): Promise<Response> {
  if (declaresOversizedBody(request, MAX_REQUEST_BYTES)) return invalidRequestResponse();
  const body = easyReadRequest.safeParse(await jsonOrNull(request));
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
