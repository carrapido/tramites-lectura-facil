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

/** The photo shows no text at all; `seen` says what it shows instead, when known (S4 amended from L7). */
export class NoTextFoundError extends Error {
  constructor(readonly seen?: string) {
    super('The photo shows no text');
    this.name = 'NoTextFoundError';
  }
}
