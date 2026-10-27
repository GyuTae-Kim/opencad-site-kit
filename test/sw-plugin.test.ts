import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_VERSION, defaultPrecacheable, fillTemplate, fingerprint, lazyFiles, listFiles, pageUrl, serviceWorker, serviceWorkerValues, templateSource } from '../pwa/sw-plugin.mjs';
import { kitRoot } from './fixture';

const files = ['.nojekyll', 'assets/app-1.js', 'assets/app-1.js.map', 'assets/locale-en-2.js', 'assets/style-3.css', 'de/index.html', 'en/index.html', 'en/manifest.webmanifest',
  'fonts/a.ttf', 'icon-192.png', 'index.html', 'manifest.webmanifest', 'og-opencad.jpg', 'robots.txt', 'sitemap.xml', 'sw.js'];
const read = (file: string) => 'bytes of ' + file;
const sha = (...parts: string[]) => { const h = createHash('sha256'); for (const part of parts) h.update(part); return h.digest('hex'); };

describe('precache list and version', () => {
  it('leaves out maps, the worker, the sitemap, robots.txt, .nojekyll and the sharing image by default; pages become directory addresses', () => {
    expect(files.filter(defaultPrecacheable)).toEqual(['assets/app-1.js', 'assets/locale-en-2.js', 'assets/style-3.css', 'de/index.html', 'en/index.html', 'en/manifest.webmanifest', 'fonts/a.ttf', 'icon-192.png', 'index.html', 'manifest.webmanifest']);
    expect(['index.html', 'en/index.html', 'a/b/index.html', 'icon.png'].map(pageUrl)).toEqual(['./', 'en/', 'a/b/', 'icon.png']);
  });

  it('names the version from file names and contents, with the separators and length chosen', () => {
    const entries = [{ file: 'index.html', url: './' }, { file: 'a.js', url: 'a.js' }];
    expect(fingerprint(entries, read)).toBe(sha('index.html', '\0', read('index.html'), '\0', 'a.js', '\0', read('a.js'), '\0').slice(0, 16));
    expect(fingerprint(entries, read, { length: 12, separator: '', terminator: '' })).toBe(sha('index.html', read('index.html'), 'a.js', read('a.js')).slice(0, 12));
    expect(fingerprint(entries, read, { length: 12, separator: '\0', terminator: '' })).toBe(sha('index.html', '\0', read('index.html'), 'a.js', '\0', read('a.js')).slice(0, 12));
    expect(fingerprint(entries, read, { key: 'url', separator: '\0', terminator: '' })).toBe(sha('./', '\0', read('index.html'), 'a.js', '\0', read('a.js')).slice(0, 16));
    expect(DEFAULT_VERSION).toEqual({ length: 16, key: 'file', separator: '\0', terminator: '\0' });
  });

  it('keeps file order unless sorted by address, and versions static folders apart without precaching them', () => {
    const plain = serviceWorkerValues(files, read);
    expect(plain.precache).toEqual(['assets/app-1.js', 'assets/locale-en-2.js', 'assets/style-3.css', 'de/', 'en/', 'en/manifest.webmanifest', 'fonts/a.ttf', 'icon-192.png', './', 'manifest.webmanifest']);
    expect(plain.staticVersion).toBeNull();
    expect(plain.assets).toEqual(['assets/app-1.js', 'assets/locale-en-2.js', 'assets/style-3.css']);
    const sorted = serviceWorkerValues(files, read, { sortUrls: true, staticDirs: ['fonts/'] });
    expect(sorted.precache).toEqual(['./', 'assets/app-1.js', 'assets/locale-en-2.js', 'assets/style-3.css', 'de/', 'en/', 'en/manifest.webmanifest', 'icon-192.png', 'manifest.webmanifest']);
    expect(sorted.files[0]).toBe('index.html');
    expect(sorted.staticVersion).toBe(fingerprint([{ file: 'fonts/a.ttf', url: 'fonts/a.ttf' }], read));
    // 지문은 미리 담는 파일만: 담지 않는 파일이 바뀌어도 판은 같다
    expect(serviceWorkerValues(files, (f) => (f === 'sitemap.xml' ? 'changed' : read(f))).version).toBe(plain.version);
    expect(serviceWorkerValues(files, (f) => (f === 'en/index.html' ? 'changed' : read(f))).version).not.toBe(plain.version);
  });

  it('skips lazily loaded chunks when the precache rule asks for them', () => {
    const bundle = {
      a: { type: 'chunk' as const, fileName: 'assets/locale-en-2.js', facadeModuleId: '/app/site/locales/en.json', moduleIds: ['/app/site/locales/en.json'] },
      b: { type: 'chunk' as const, fileName: 'assets/pdf-4.js', facadeModuleId: '/app/src/pdf.ts', moduleIds: ['/app/node_modules/pdf-lib/x.js'] },
      c: { type: 'asset' as const, fileName: 'assets/pdf.worker-5.mjs', originalFileNames: [] },
      d: { type: 'asset' as const, fileName: 'assets/cmap-6.bin', originalFileNames: ['node_modules/pdf-lib/cmap.bin'] },
      e: { type: 'chunk' as const, fileName: 'assets/app-1.js', facadeModuleId: '/app/src/main.ts', modules: { '/app/src/main.ts': {} } },
      f: { type: 'asset' as const, fileName: 'sitemap.xml' },
    };
    const lazy = lazyFiles(bundle, { facade: [/[\\/]site[\\/]locales[\\/][\w-]+\.json$/], modules: [/[\\/]node_modules[\\/]pdf-lib[\\/]/], assetOrigins: [/pdf-lib/], assetNames: [/(?:^|\/)pdf\.worker/] });
    expect([...lazy].sort()).toEqual(['assets/cmap-6.bin', 'assets/locale-en-2.js', 'assets/pdf-4.js', 'assets/pdf.worker-5.mjs']);
    expect(lazyFiles(bundle).size).toBe(0);
    const values = serviceWorkerValues(files, read, { lazy, precache: (path, { lazy }) => defaultPrecacheable(path) && !lazy.has(path) });
    expect(values.precache).not.toContain('assets/locale-en-2.js');
    expect(values.assets).toContain('assets/locale-en-2.js');
  });
});

describe('worker source', () => {
  it('fills each placeholder once, safely even with $ in file names', () => {
    const template = "const V = '__VERSION__'; const S = '__STATIC__'; const P = __PRECACHE__; const A = __ASSETS__; // __ASSETS__";
    expect(fillTemplate(template, { version: 'abc', staticVersion: null, precache: ['./', "a$'b.png"], assets: ['assets/$&.js'] }))
      .toBe(`const V = "abc"; const S = null; const P = ["./","a$'b.png"]; const A = ["assets/$&.js"]; // __ASSETS__`);
  });

  it('builds sw.js at the end of the build from the app source', () => {
    const root = mkdtempSync(join(kitRoot, '.runtime', 'sw-plugin-'));
    try {
      mkdirSync(join(root, 'dist/assets'), { recursive: true });
      for (const file of ['index.html', 'assets/app-1.js', 'assets/app-1.js.map', 'sitemap.xml']) writeFileSync(join(root, 'dist', file), read(file));
      writeFileSync(join(root, 'template.js'), "const VERSION = '__VERSION__';\nconst PRECACHE = __PRECACHE__;\n");
      const plugin = serviceWorker({ source: templateSource(join(root, 'template.js')), version: { length: 8 } }) as unknown as { configResolved(c: unknown): void; generateBundle(o: unknown, b: unknown): void; closeBundle(): void; apply: string; enforce: string };
      expect(plugin.apply).toBe('build');
      expect(plugin.enforce).toBe('post');
      plugin.configResolved({ root, build: { outDir: 'dist' } });
      plugin.generateBundle({}, {});
      plugin.closeBundle();
      expect(listFiles(join(root, 'dist'))).toContain('sw.js');
      const values = serviceWorkerValues(['assets/app-1.js', 'assets/app-1.js.map', 'index.html', 'sitemap.xml'], read, { version: { length: 8 } });
      expect(readFileSync(join(root, 'dist/sw.js'), 'utf8')).toBe(`const VERSION = "${values.version}";\nconst PRECACHE = ["assets/app-1.js","./"];\n`);
      expect(() => serviceWorker({} as never)).toThrow(/source/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
