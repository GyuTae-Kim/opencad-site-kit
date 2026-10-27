import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { checkI18n } from '../i18n/check-i18n.mjs';
import { localizeHtml, siteLocalization } from '../i18n/localization-plugin.mjs';
import { serviceWorker, templateSource } from '../pwa/sw-plugin.mjs';
import { appFingerprint } from '../seo/app-fingerprint.mjs';
import { checkSeo } from '../seo/check-seo.mjs';
import { defineSite } from '../seo/site-metadata.mjs';
import { siteMetadata } from '../seo/site-plugin.mjs';
import { updateContentDates } from '../seo/update-content-dates.mjs';
import { buildFixtureApp, createFixtureApp, indexHtml, kitRoot, manifest, metadata, readTree, removeFixtureApp } from './fixture';

const cli = (dir: string, ...args: string[]) => spawnSync(process.execPath, [join(kitRoot, 'bin/opencad-site.mjs'), ...args], { cwd: dir, encoding: 'utf8' });
const json = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

describe('an app whose manifest and its link live in public/ and index.html', () => {
  let dir: string;
  let dist: string;
  const siteFor = () => defineSite({ metadata, history: json(join(dir, 'site/content-history.json')), manifest: { source: join(dir, 'public/manifest.webmanifest') } });
  const plugins = () => {
    const site = siteFor();
    return [siteLocalization(site), siteMetadata(site), serviceWorker({ source: templateSource(join(dir, 'tools/sw-template.js')) })];
  };
  beforeAll(async () => {
    dir = createFixtureApp('html-links');
    await import(join(dir, 'site/i18n.mjs'));
    dist = await buildFixtureApp(dir, plugins());
  });
  afterAll(() => removeFixtureApp(dir));

  it('writes five language pages, their manifests, the sitemap and the service worker', () => {
    const files = [...readTree(dist).keys()];
    for (const file of ['index.html', 'en/index.html', 'ja/index.html', 'zh-CN/index.html', 'de/index.html', 'manifest.webmanifest', 'en/manifest.webmanifest',
      'de/manifest.webmanifest', 'sitemap.xml', '.nojekyll', 'sw.js', 'icon-192.png']) expect(files, file).toContain(file);
    expect(files.some(file => /^assets\/.+\.js$/.test(file))).toBe(true);
    // 한국어 앱 정보는 public/이 그대로 복사한다
    expect(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8')).toBe(JSON.stringify(manifest, null, 2) + '\n');
    const en = json(join(dist, 'en/manifest.webmanifest'));
    expect(en).toMatchObject({ name: 'OpenCAD Test Viewer', short_name: 'Test Viewer', description: 'Test app manifest description', lang: 'en', start_url: './', scope: '../' });
    expect(en.icons[0].src).toBe('../icon-192.png');
    expect(en.share_target.action).toBe('./share-target');
  });

  it('localizes the pages, the manifest link and the home-screen title', () => {
    const html = readFileSync(join(dist, 'en/index.html'), 'utf8');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('<head>\n    <base href="../">');
    expect(html).toContain('<h1>OpenCAD Test Viewer</h1>');
    expect(html).toContain('title="Source code"');
    expect(html).toContain('href="./en/manifest.webmanifest"');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Test Viewer"');
    expect(html).toContain('<link rel="canonical" href="https://gyutae-kim.github.io/opencad-step/en/">');
    expect(html).toContain('<nav data-static-languages aria-label="Language">');
    expect(html).toContain('href="https://gyutae-kim.github.io/en/opencad"');
    expect(html).toContain('<a href="https://gyutae-kim.github.io/opencad-step/de/" lang="de" hreflang="de">Deutsch</a>');
    const ko = readFileSync(join(dist, 'index.html'), 'utf8');
    expect(ko).toContain('<!-- localized-metadata:start --><title>OpenCAD 시험 뷰어 | 합성 앱</title>');
    expect(ko).not.toContain('<base href');
  });

  it('precaches the app shell with a content version, but not maps, the sitemap or the sharing image', () => {
    const sw = readFileSync(join(dist, 'sw.js'), 'utf8');
    const version = sw.match(/const VERSION = "([0-9a-f]+)";/)?.[1];
    expect(version).toHaveLength(16);
    expect(sw).toContain('const STATIC = null;');
    const precache: string[] = JSON.parse(sw.match(/const PRECACHE = (\[.*\]);/)![1]!);
    for (const url of ['./', 'en/', 'de/', 'manifest.webmanifest', 'en/manifest.webmanifest', 'icon-192.png', 'favicon.svg']) expect(precache).toContain(url);
    expect(precache.some(url => /\.map$|sitemap|og-opencad|\.nojekyll|sw\.js/.test(url))).toBe(false);
    const assets: string[] = JSON.parse(sw.match(/const ASSETS = (\[.*\]);/)![1]!);
    expect(assets.length).toBeGreaterThan(0);
    expect(assets.every(file => /^assets\/.+\.(?:m?js|css)$/.test(file))).toBe(true);
  });

  it('bundles the translator through the package exports like an installed dependency', () => {
    const tree = readTree(dist);
    const js = [...tree].filter(([file]) => /^assets\/.+\.js$/.test(file)).map(([, bytes]) => bytes.toString()).join('\n');
    expect(js).toContain('https://gyutae-kim.github.io/opencad-step/');
    expect(js).toContain('configureI18n: metadata.url is required.');
  });

  it('passes the shared i18n check, and the SEO check after the content date is recorded', async () => {
    expect(checkI18n({ root: dist })).toMatch(/^i18n check passed: .* offline pages and 17 catalog messages\.$/);
    expect(() => checkSeo({ metadata, history: json(join(dir, 'site/content-history.json')), root: dist })).toThrow(/content changed/);
    const historyFile = join(dir, 'site/content-history.json');
    expect(updateContentDates({ pageUrl: metadata.url, at: '2026-02-01T00:00:00Z', historyFile, root: dist })).toBe('Application content date: 2026-02-01T00:00:00Z. Rebuild before publishing.');
    expect(json(historyFile)).toEqual({ lastmod: '2026-02-01T00:00:00Z', fingerprint: appFingerprint(metadata.url, dist) });
    dist = await buildFixtureApp(dir, plugins());
    expect(checkSeo({ metadata, history: json(historyFile), root: dist })).toMatch(/^SEO check passed/);
    expect(readFileSync(join(dist, 'sitemap.xml'), 'utf8')).toContain('<lastmod>2026-02-01T00:00:00Z</lastmod>');
    expect(updateContentDates({ pageUrl: metadata.url, at: '2026-03-01T00:00:00Z', historyFile, root: dist })).toBe('Content unchanged; lastmod retained.');
  });

  it('runs the same checks from the command line in the app folder', () => {
    for (const command of ['check-seo', 'check-i18n', 'test-seo']) {
      const run = cli(dir, command);
      expect(run.status, `${command}\n${run.stdout}\n${run.stderr}`).toBe(0);
    }
    expect(cli(dir, 'check-seo').stdout).toMatch(/SEO check passed/);
    expect(cli(dir, 'check-i18n').stdout).toMatch(/i18n check passed/);
    expect(cli(dir, 'update-content-dates', '--at', '2026-04-01T00:00:00Z').stdout).toMatch(/Content unchanged/);
    const missing = cli(dir, 'update-content-dates');
    expect(missing.status).not.toBe(0);
    expect(missing.stderr).toMatch(/--at YYYY-MM-DDTHH:mm:ssZ/);
    expect(cli(dir).status).toBe(0);
    expect(cli(dir, 'nonsense').status).toBe(1);
  });

  it('fails the i18n check when a language page keeps Korean or a manifest leaves the app', () => {
    const page = join(dist, 'ja/index.html');
    const original = readFileSync(page, 'utf8');
    try {
      writeFileSync(page, original.replace('</main>', '<p>번역 안 된 글</p></main>'));
      expect(() => checkI18n({ root: dist })).toThrow(/ja: untranslated static introduction/);
      writeFileSync(page, original.replace('href="./ja/manifest.webmanifest"', 'href="/manifest.webmanifest"'));
      expect(() => checkI18n({ root: dist })).toThrow(/outside the app/);
    } finally { writeFileSync(page, original); }
  });
});

describe('an app whose manifest is built from a source outside public/ and linked from the metadata', () => {
  let dir: string;
  let dist: string;
  beforeAll(async () => {
    dir = createFixtureApp('metadata-links');
    await import(join(dir, 'site/i18n.mjs'));
    // 앱 정보 원본은 site/에, 링크·홈 화면 이름은 검색 정보 자리에 — index.html에는 없다
    const { share_target: _s, file_handlers: _f, ...plain } = manifest;
    writeFileSync(join(dir, 'site/manifest.webmanifest'), JSON.stringify(plain));
    writeFileSync(join(dir, 'public/manifest.webmanifest'), '{}');
    writeFileSync(join(dir, 'index.html'), indexHtml.replace('    <link rel="manifest" href="./manifest.webmanifest" />\n', '').replace('    <meta name="apple-mobile-web-app-title" content="시험 뷰어" />\n', ''));
    const site = defineSite({ metadata, history: json(join(dir, 'site/content-history.json')), manifest: {
      source: join(dir, 'site/manifest.webmanifest'), emitDefault: true, links: 'metadata',
      extend: (m) => ({ ...m, share_target: manifest.share_target, file_handlers: manifest.file_handlers }),
    } });
    dist = await buildFixtureApp(dir, [siteLocalization(site), siteMetadata(site, { nojekyll: false }), serviceWorker({ source: templateSource(join(dir, 'tools/sw-template.js')), version: { length: 12, separator: '\0', terminator: '' } })]);
  });
  afterAll(() => removeFixtureApp(dir));

  it('writes every manifest (Korean too) from the source with the extension, and links each page to its own', () => {
    expect(json(join(dist, 'manifest.webmanifest'))).toEqual({ ...manifest, share_target: manifest.share_target, file_handlers: manifest.file_handlers });
    expect(Object.keys(json(join(dist, 'ja/manifest.webmanifest'))).slice(-2)).toEqual(['share_target', 'file_handlers']);
    const ko = readFileSync(join(dist, 'index.html'), 'utf8');
    expect(ko).toContain('<link rel="manifest" href="./manifest.webmanifest">');
    expect(ko).toContain('<meta name="apple-mobile-web-app-title" content="시험 뷰어">');
    const de = readFileSync(join(dist, 'de/index.html'), 'utf8');
    expect(de).toContain('<link rel="manifest" href="./de/manifest.webmanifest">');
    expect(de).toContain('<meta name="apple-mobile-web-app-title" content="Testbetrachter">');
    expect(existsSync(join(dist, '.nojekyll'))).toBe(false);
    expect(readFileSync(join(dist, 'sw.js'), 'utf8')).toMatch(/const VERSION = "[0-9a-f]{12}";/);
    expect(checkI18n({ root: dist })).toMatch(/^i18n check passed/);
  });
});

describe('plugins without a build', () => {
  const site = defineSite({ metadata, history: { lastmod: '2026-01-01T00:00:00Z', fingerprint: 'x' }, manifest: { source: '/not-read-in-these-tests.webmanifest' } });
  it('needs exactly one metadata marker', () => {
    const plugin = siteMetadata(site) as unknown as { transformIndexHtml: { handler(html: string): string } };
    expect(() => plugin.transformIndexHtml.handler('<head></head>')).toThrow(/one shared metadata marker/);
    expect(() => plugin.transformIndexHtml.handler('<!-- site-metadata --><!-- site-metadata -->')).toThrow(/one shared metadata marker/);
    expect(plugin.transformIndexHtml.handler('<head><!-- site-metadata --></head>')).toMatch(/^<head><!-- localized-metadata:start --><title>/);
  });
  it('serves the sitemap and the language manifests from the development server', () => {
    const handlers: ((req: { url?: string }, res: unknown, next: () => void) => void)[] = [];
    const plugin = siteMetadata({ ...site, webManifest: (language = 'ko') => ({ ...manifest, lang: language }) }) as unknown as { configureServer(server: unknown): void };
    plugin.configureServer({ middlewares: { use: (fn: (typeof handlers)[number]) => handlers.push(fn) } });
    const request = (url: string) => {
      const out: { type?: string; body?: string; next: boolean } = { next: false };
      handlers[0]!({ url }, { setHeader: (_: string, value: string) => (out.type = value), end: (body: string) => (out.body = body) }, () => (out.next = true));
      return out;
    };
    expect(request('/sitemap.xml').type).toBe('application/xml; charset=utf-8');
    expect(request('/opencad-step/sitemap.xml?x=1').body).toContain('<urlset');
    expect(JSON.parse(request('/en/manifest.webmanifest').body!).lang).toBe('en');
    expect(request('/manifest.webmanifest').next).toBe(true);
    expect(request('/other').next).toBe(true);
  });
  it('localizes HTML for one language without a build', () => {
    const html = localizeHtml('<html lang="ko"><head><!-- localized-metadata:start -->old<!-- localized-metadata:end --></head><body><main><p>열기</p></main></body></html>', 'ja', site);
    expect(html).toContain('<html lang="ja"');
    expect(html).toContain('<p>開く</p>');
    expect(html).toContain('<title>OpenCAD テストビューア | 合成アプリ</title>');
    expect(html).not.toContain('old');
  });
});
