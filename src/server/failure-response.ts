import { CredentialsUnavailableError } from '@/tramites/errors';

/** https://cloud.google.com/docs/authentication/provide-credentials-adc */
const ADC_LOGIN_COMMAND = 'gcloud auth application-default login';

/** Maps a failed Google call to 503 adc-missing or 502 upstream-failed. */
export function googleFailureResponse(error: unknown, route: string): Response {
  if (error instanceof CredentialsUnavailableError) {
    return Response.json({ ok: false, reason: 'adc-missing', fix: ADC_LOGIN_COMMAND }, { status: 503 });
  }
  console.error(`[${route}] Google call failed`, error);
  return Response.json({ ok: false, reason: 'upstream-failed' }, { status: 502 });
}
