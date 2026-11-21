/** The laptop has no Application Default Credentials for Google calls. */
export class CredentialsUnavailableError extends Error {
  constructor() {
    super('Google Application Default Credentials are not available');
    this.name = 'CredentialsUnavailableError';
  }
}
