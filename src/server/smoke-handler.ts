import { CredentialsUnavailableError } from '@/tramites/errors';
import { runSmoke, type SmokeDependencies } from '@/tramites/smoke';

/** https://cloud.google.com/docs/authentication/provide-credentials-adc */
const ADC_LOGIN_COMMAND = 'gcloud auth application-default login';

export async function handleSmoke(compose: () => SmokeDependencies): Promise<Response> {
  const dependencies = composeOrNull(compose);
  if (!dependencies) return Response.json({ ok: false, reason: 'config-missing' }, { status: 500 });

  try {
    const result = await runSmoke(dependencies);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return failureResponse(error);
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

function failureResponse(error: unknown): Response {
  if (error instanceof CredentialsUnavailableError) {
    return Response.json({ ok: false, reason: 'adc-missing', fix: ADC_LOGIN_COMMAND }, { status: 503 });
  }
  console.error('[smoke] Google call failed', error);
  return Response.json({ ok: false, reason: 'upstream-failed' }, { status: 502 });
}
