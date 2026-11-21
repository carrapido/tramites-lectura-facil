import { runSmoke, type SmokeDependencies } from '@/tramites/smoke';

import { googleFailureResponse } from './failure-response';

export async function handleSmoke(compose: () => SmokeDependencies): Promise<Response> {
  const dependencies = composeOrNull(compose);
  if (!dependencies) return Response.json({ ok: false, reason: 'config-missing' }, { status: 500 });

  try {
    const result = await runSmoke(dependencies);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return googleFailureResponse(error, 'smoke');
  }
}

function composeOrNull(compose: () => SmokeDependencies): SmokeDependencies | null {
  try {
    return compose();
  } catch (error) {
    console.error('[smoke] composition failed', error);
    return null;
  }
}
