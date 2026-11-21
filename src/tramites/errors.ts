/** The laptop has no Application Default Credentials for Google calls. */
export class CredentialsUnavailableError extends Error {
  constructor() {
    super('Google Application Default Credentials are not available');
    this.name = 'CredentialsUnavailableError';
  }
}

/** The photo cannot be read, or nothing in it could be traced to a literal quote. */
export class UnreadableNoticeError extends Error {
  constructor() {
    super('The notice photo is unreadable');
    this.name = 'UnreadableNoticeError';
  }
}
