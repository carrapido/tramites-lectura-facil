import { createHash } from 'node:crypto';

/** Lowercase hex SHA-256 of a UTF-8 text. https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptocreatehashalgorithm-options */
export function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
