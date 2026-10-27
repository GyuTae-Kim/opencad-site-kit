import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { compareDist, formatComparison, normalizeAssetNames } from '../seo/compare-dist.mjs';
import { kitRoot } from './fixture';

const root = mkdtempSync(join(kitRoot, '.runtime', 'compare-dist-'));
const write = (path: string, text: string) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('compare two builds', () => {
  it('matches asset names by their stem, and reports only real content changes', () => {
    expect(normalizeAssetNames('<script src="./assets/index-AbC1_x-9.js"></script> assets/i18n-QwErTy12.css')).toBe('<script src="./assets/index-#.js"></script> assets/i18n-#.css');
    write('before/index.html', '<script src="./assets/index-AAAAAAAA.js"></script>\n');
    write('after/index.html', '<script src="./assets/index-BBBBBBBB.js"></script>\n');
    write('before/assets/index-AAAAAAAA.js', 'console.log(1)');
    write('after/assets/index-BBBBBBBB.js', 'console.log(2)');
    write('before/sw.js', 'const VERSION = "aaa";\nconst A = ["assets/index-AAAAAAAA.js"];\n');
    write('after/sw.js', 'const VERSION = "bbb";\nconst A = ["assets/index-BBBBBBBB.js"];\n');
    write('before/en/manifest.webmanifest', '{}');
    write('after/en/manifest.webmanifest', '{}');
    write('before/old.txt', 'x');
    write('after/new.txt', 'y');
    const rows = compareDist(join(root, 'before'), join(root, 'after'));
    expect(rows).toEqual([
      { file: 'assets/index-#.js', status: 'changed', line: 1, before: 'console.log(1)', after: 'console.log(2)' },
      { file: 'en/manifest.webmanifest', status: 'same' },
      { file: 'index.html', status: 'same-but-asset-names' },
      { file: 'new.txt', status: 'added' },
      { file: 'old.txt', status: 'removed' },
      { file: 'sw.js', status: 'changed', line: 1, before: 'const VERSION = "aaa";', after: 'const VERSION = "bbb";' },
    ]);
    expect(formatComparison(rows).split('\n')[0]).toBe('same 1, same but asset names 1, changed 2, added 1, removed 1');
    const cli = (...args: string[]) => spawnSync(process.execPath, [join(kitRoot, 'bin/opencad-site.mjs'), 'compare-dist', ...args], { cwd: root, encoding: 'utf8' });
    expect(cli('before', 'after').status).toBe(0);
    expect(cli('before', 'after', '--fail-on-change').status).toBe(1);
    expect(cli('before', 'before', '--fail-on-change').status).toBe(0);
  });
});
