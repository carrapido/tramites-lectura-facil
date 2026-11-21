/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(__dirname, '..');

function listAppSources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === '__tests__' || name === 'server') return [];
    if (statSync(path).isDirectory()) return listAppSources(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

function filesMatching(pattern: RegExp): string[] {
  return listAppSources(SRC)
    .filter((path) => pattern.test(readFileSync(path, 'utf8')))
    .map((path) => relative(SRC, path));
}

describe('oral-first guards', () => {
  it('has no text input anywhere (S4)', () => {
    expect(filesMatching(/\bTextInput\b/)).toEqual([]);
  });

  it('never turns off system font scaling (S6)', () => {
    expect(filesMatching(/allowFontScaling\s*=\s*\{\s*false\s*\}|allowFontScaling:\s*false/)).toEqual([]);
  });

  it('pins the scanned sources so the guards are not empty', () => {
    expect(listAppSources(SRC).map((path) => relative(SRC, path))).toEqual(
      expect.arrayContaining(['screens/read/read-screen.tsx', 'components/action-button.tsx']),
    );
  });
});
