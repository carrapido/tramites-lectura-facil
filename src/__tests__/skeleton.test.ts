/**
 * @jest-environment node
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { GET as health } from '@/app/api/health+api';

const ROOT = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function importsOf(source: string): string[] {
  const pattern = /(?:from\s+|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]/g;
  return [...source.matchAll(pattern)].map((match) => match[1]);
}

const FORBIDDEN_IN_DOMAIN = [/^@google\//, /^expo/, /^react-native/, /(^@\/server|\/server\/|^\.\.\/server)/];

describe('S2: src/tramites/ stays free of frameworks and adapters', () => {
  it('imports nothing from @google/*, expo*, react-native or src/server/', () => {
    const domainFiles = listSourceFiles(join(ROOT, 'src', 'tramites'));
    expect(domainFiles.length).toBeGreaterThan(0);

    const violations = domainFiles.flatMap((file) =>
      importsOf(readFileSync(file, 'utf8'))
        .filter((specifier) => FORBIDDEN_IN_DOMAIN.some((rule) => rule.test(specifier)))
        .map((specifier) => `${relative(ROOT, file)} -> ${specifier}`),
    );

    expect(violations).toEqual([]);
  });
});

describe('S3: Google configuration never reaches the app bundle', () => {
  it('lists the Google variables in .env.example', () => {
    const example = read('.env.example');
    expect(example).toMatch(/^GOOGLE_CLOUD_PROJECT=/m);
    expect(example).toMatch(/^GOOGLE_CLOUD_LOCATION=/m);
  });

  it('git-ignores .env*.local', () => {
    expect(read('.gitignore')).toMatch(/^\.env\*\.local$/m);
  });

  it('never exposes Google configuration through EXPO_PUBLIC_', () => {
    const sources = [...listSourceFiles(join(ROOT, 'src')), join(ROOT, '.env.example')];
    const leaks = sources.filter((file) => /EXPO_PUBLIC_\w*(GOOGLE|GCP|GEMINI|VERTEX)/i.test(readFileSync(file, 'utf8')));
    expect(leaks).toEqual([]);
  });
});

describe('S4: GET /api/health', () => {
  it('returns 200 with { ok: true }', async () => {
    const response = health();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});

describe('S5: README network fallback', () => {
  it('documents the tunnel and the hotspot', () => {
    const readme = read('README.md');
    expect(readme).toContain('npx expo start --tunnel');
    expect(readme.toLowerCase()).toContain('hotspot');
  });
});

describe('Layout: src/app holds routes only', () => {
  it('has no tests or helpers inside src/app', () => {
    expect(existsSync(join(ROOT, 'src', 'app', '__tests__'))).toBe(false);
  });
});
