/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

const ROOT = join(__dirname, '..', '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return listSourceFiles(path);
    return /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : [];
  });
}

const packageScripts = z.object({ scripts: z.record(z.string(), z.string()) });

describe('S5: demo variables stay on the server', () => {
  it('never reads a demo variable through EXPO_PUBLIC_', () => {
    const sources = [...listSourceFiles(join(ROOT, 'src')), ...listSourceFiles(join(ROOT, 'scripts'))];
    // Built from parts so this test file does not match itself.
    const publicDemo = new RegExp(['EXPO', 'PUBLIC', 'DEMO'].join('_'));
    const leaks = sources.filter((file) => publicDemo.test(readFileSync(file, 'utf8')));
    expect(leaks).toEqual([]);
  });
});

describe('S4: recordings are committed', () => {
  it('does not git-ignore fixtures/demo and keeps .cache/ ignored', () => {
    const gitignore = read('.gitignore');
    expect(gitignore).not.toMatch(/^\/?fixtures/m);
    expect(gitignore).toMatch(/^\.cache\/$/m);
  });
});

describe('S6: npm scripts for the demo', () => {
  it('records, replays and warms up', () => {
    const { scripts } = packageScripts.parse(JSON.parse(read('package.json')));
    expect(scripts['demo:record']).toBe('DEMO_RECORD=1 expo start');
    expect(scripts['demo:replay']).toBe('DEMO_REPLAY=1 expo start');
    expect(scripts['demo:warmup']).toMatch(/^node (--[\w=-]+ )*scripts\/demo-warmup\.ts$/);
  });
});

describe('README demo mode', () => {
  it('documents record, replay, warm-up, the label and not-recorded', () => {
    const readme = read('README.md');
    expect(readme).toContain('## Demo mode');
    for (const text of ['npm run demo:record', 'npm run demo:replay', 'npm run demo:warmup', 'Respuesta grabada', 'not-recorded', 'X-Demo-Replay']) {
      expect(readme).toContain(text);
    }
  });
});
