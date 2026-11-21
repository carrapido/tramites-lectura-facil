import { runSmoke, type SmokeDependencies } from '@/tramites/smoke';

import { composeOrNull } from './compose-or-null';
import { configMissingResponse, googleFailureResponse } from './failure-response';

export async function handleSmoke(compose: () => SmokeDependencies): Promise<Response> {
  const dependencies = composeOrNull(compose, 'smoke');
  if (!dependencies) return configMissingResponse();

  try {
    const result = await runSmoke(dependencies);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return googleFailureResponse(error, 'smoke');
  }
}
