/** Replay mode has no recording for this request; the server never invents an answer (S5). */
export class NotRecordedError extends Error {
  constructor(what: string) {
    super(`No demo recording for ${what}`);
    this.name = 'NotRecordedError';
  }
}
