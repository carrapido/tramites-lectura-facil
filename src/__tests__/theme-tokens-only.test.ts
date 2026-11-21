/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { theme } from '@/theme';

const SRC = join(__dirname, '..');

function listAppSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === '__tests__' || name === 'server') return [];
    if (statSync(path).isDirectory()) return listAppSources(path);
    return /\.tsx?$/.test(name) && name !== 'theme.ts' ? [path] : [];
  });
}

describe('border widths come from theme.ts (review of PR #2, fix 2)', () => {
  it('defines a hairline and a strong border token', () => {
    expect(theme.border.hairline).toBe(1);
    expect(theme.border.strong).toBe(2);
  });

  it('has no hard-coded borderWidth number in app sources', () => {
    const offenders = listAppSources(SRC)
      .filter((path) => /borderWidth:\s*\d/.test(readFileSync(path, 'utf8')))
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });
});
