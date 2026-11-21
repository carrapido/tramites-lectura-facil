import { CredentialsUnavailableError } from '@/tramites/errors';

import { NotRecordedError } from './not-recorded-error';

/** https://cloud.google.com/docs/authentication/provide-credentials-adc */
const ADC_LOGIN_COMMAND = 'gcloud auth application-default login';

/** Maps a failed Google call to 503 adc-missing or 502 upstream-failed, and a replay miss to 404 not-recorded (S5). */
export function googleFailureResponse(error: unknown, route: string): Response {
  if (error instanceof NotRecordedError) {
    return Response.json({ ok: false, reason: 'not-recorded' }, { status: 404 });
  }
  if (error instanceof CredentialsUnavailableError) {
    return Response.json({ ok: false, reason: 'adc-missing', fix: ADC_LOGIN_COMMAND }, { status: 503 });
  }
  console.error(`[${route}] Google call failed`, error);
  return Response.json({ ok: false, reason: 'upstream-failed' }, { status: 502 });
}

/** The composition root failed, usually a missing or invalid environment variable. */
export function configMissingResponse(): Response {
  return Response.json({ ok: false, reason: 'config-missing' }, { status: 500 });
}
