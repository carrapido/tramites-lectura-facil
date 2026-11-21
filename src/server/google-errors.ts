import { CredentialsUnavailableError } from '@/tramites/errors';

/** google-auth-library throws this message when no ADC file or metadata server exists. */
const ADC_MISSING_PATTERN = /could not load the default credentials/i;

export async function withCredentialMapping<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (error instanceof Error && ADC_MISSING_PATTERN.test(error.message)) throw new CredentialsUnavailableError();
    throw error;
  }
}
