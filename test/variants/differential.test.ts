/**
 * 갈래 비교: 네 앱의 원본 사이트 계층(.runtime/variants/<앱> — npm run variants로 앱 저장소의 origin/main에서 꺼낸다)과
 * 이 도구를 docs/ADOPTION.md 설정(test/variants/configs.ts)으로 쓴 것이 같은 입력에서 같은 출력을 내는지 본다.
 * - 빌드: 앱의 index.html·앱 정보·사전·사이트 정보로 작은 앱(앱 코드 대신 한 줄짜리 입구)을 원본 플러그인과 도구 플러그인으로 각각 빌드해
 *   dist가 바이트까지 같은지(HTML·언어 페이지·manifest·sitemap·sw.js·assets)
 * - 확인 도구: 원본 check-i18n이 통과하는 dist에서 도구 checkI18n도 통과하고, 앱 내용 지문이 같고, 도구 checkSeo가 통과하는지
 * - 번역기: 앱 사전의 모든 열쇠·틀(값을 끼운 것)·이은 문장·여러 줄 글에서 translate 결과가 같은지
 *   (DWG는 여러 줄·이은 문장 고침이 없던 갈래라, 다른 곳은 도구 쪽이 한국어를 덜 남긴 곳뿐이고 STEP 갈래 번역기와는 같아야 한다)
 * - OPENCAD_SITE_KIT_DISTS=step:<dist>,dwg:<dist>…를 주면 실제 빌드 결과의 파일 목록으로 sw.js 원본도 견준다(읽기만 한다).
 * .runtime/variants가 없으면(CI) 건너뛴다.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { build, type Plugin, type UserConfig } from 'vite';
import { checkI18n } from '../../i18n/check-i18n.mjs';
import { listFiles, serviceWorkerValues } from '../../pwa/sw-plugin.mjs';
import { appFingerprint } from '../../seo/app-fingerprint.mjs';
import { checkSeo } from '../../seo/check-seo.mjs';
import { kitRoot, readTree } from '../fixture';
import { APPS, kitSetup, swOptions, swSource, type App } from './configs';

const variantsRoot = join(kitRoot, '.runtime', 'variants');
const has = (app: App) => existsSync(join(variantsRoot, app, '.source-sha'));
const LANGUAGES = ['en', 'ja', 'zh-CN', 'de'];
const hangul = (text: string) => (text.match(/[가-힣]/g) ?? []).length;
type Core = typeof import('../../i18n/core.mjs');

/** 원본 빌드와 도구 빌드가 같은 모양으로 쓰는 작은 앱 뿌리(앱 코드 대신 한 줄짜리 입구, 앱 정보 아이콘은 합성 바이트) */
function appRoot(app: App, kind: string): string {
  const variant = join(variantsRoot, app);
  mkdirSync(join(kitRoot, '.runtime', 'tmp'), { recursive: true });
  const root = mkdtempSync(join(kitRoot, '.runtime', 'tmp', `variant-${app}-${kind}-`));
  const write = (path: string, content: string | Uint8Array) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), content); };
  const html = readFileSync(join(variant, 'index.html'), 'utf8');
  write('index.html', html);
  const entry = html.match(/<script type="module" src="\.?\/([^"]+)"><\/script>/)![1]!;
  write(entry, "console.log('opencad-site-kit variant check');\n");
  const manifestFile = existsSync(join(variant, 'public/manifest.webmanifest')) ? 'public/manifest.webmanifest' : 'site/manifest.webmanifest';
  const icons = (JSON.parse(readFileSync(join(variant, manifestFile), 'utf8')).icons as { src: string }[]).map(icon => icon.src);
  for (const file of [...icons, 'apple-touch-icon.png', 'favicon.svg', 'og-opencad.jpg']) write('public/' + file, createHash('sha256').update(file).digest());
  if (existsSync(join(variant, 'public/manifest.webmanifest'))) copyFileSync(join(variant, 'public/manifest.webmanifest'), join(root, 'public/manifest.webmanifest'));
  if (existsSync(join(variant, 'public/.nojekyll'))) write('public/.nojekyll', '');
  for (const file of ['site/metadata.json', 'site/content-history.json', 'site/manifest.webmanifest', 'tools/sw-template.js']) {
    if (!existsSync(join(variant, file))) continue;
    let text = readFileSync(join(variant, file), 'utf8');
    // SKP 원본 틀의 __ASSETS__(미리 담을 목록)는 도구의 자리 이름으로 __PRECACHE__ (ADOPTION.md)
    if (app === 'skp' && file === 'tools/sw-template.js') text = text.replace('const ASSETS = __ASSETS__;', 'const ASSETS = __PRECACHE__;');
    if (kind === 'kit') write(file, text);
  }
  return root;
}

/** 앱처럼 빌드한다: 작업 폴더가 앱 뿌리이고 outDir은 'dist'(원본 플러그인 가운데 작업 폴더 기준으로 dist를 찾는 것이 있다) */
async function buildRoot(root: string, plugins: Plugin[], config: UserConfig): Promise<string> {
  const cwd = process.cwd();
  process.chdir(root);
  try {
    await build({ root, base: config.base ?? './', configFile: false, logLevel: 'silent', plugins, worker: config.worker, build: { ...config.build, outDir: 'dist', emptyOutDir: true } });
  } finally { process.chdir(cwd); }
  return join(root, 'dist');
}

/** 두 dist의 다른 곳(파일 목록·바이트) — 같으면 빈 목록 */
function treeDifferences(a: string, b: string): string[] {
  const left = readTree(a), right = readTree(b), out: string[] = [];
  for (const file of new Set([...left.keys(), ...right.keys()])) {
    const x = left.get(file), y = right.get(file);
    if (!x || !y) { out.push(`${file}: only in ${x ? 'original' : 'kit'}`); continue; }
    if (x.equals(y)) continue;
    const xs = x.toString().split('\n'), ys = y.toString().split('\n');
    const line = xs.findIndex((text, i) => text !== ys[i]);
    out.push(`${file}: line ${line + 1}\n  original: ${xs[line]?.slice(0, 300)}\n  kit:      ${ys[line]?.slice(0, 300)}`);
  }
  return out;
}

/** 사전에서 만든 번역 말뭉치: 열쇠, 틀에 값을 끼운 것, " · "로 이은 것, 줄바꿈으로 이은 것(정규화한 꼴이 겹치지 않게) */
function corpus(catalog: Record<string, string>): string[] {
  const samples = ['A1', '12.5 mm', '가나', 'part.step', '3, 4, 5', 'Bracket · Rev 2'];
  const keys = Object.keys(catalog).filter(key => /[가-힣]/.test(key));
  const filled = keys.map((key, i) => key.replace(/\{\d+\}/g, (_, j) => samples[(i + j) % samples.length]!));
  const items = [...keys, ...filled, ...keys.map(key => key + ' ▾')];
  for (let i = 0; i + 1 < filled.length; i += 3) items.push(filled[i] + ' · ' + filled[i + 1], filled[i] + '\n' + filled[i + 1], filled[i + 1] + ' | ' + keys[i]);
  const seen = new Set<string>();
  return items.filter(item => { const key = item.replace(/\s+/g, ' ').trim(); if (seen.has(key)) return false; seen.add(key); return true; });
}

const missing = APPS.filter(app => !has(app));
if (missing.length) console.info(`[variants] ${missing.join(', ')}: .runtime/variants/<app> not found — run npm run variants to compare.`);

for (const app of APPS) {
  describe.skipIf(!has(app))(`${app}: original site layer vs opencad-site-kit`, () => {
    const variant = join(variantsRoot, app);
    const roots: string[] = [];
    let original: string;
    let kit: string;
    let kitCore: Core;
    let origCore: Core;
    let metadata: { url: string };
    beforeAll(async () => {
      metadata = JSON.parse(readFileSync(join(variant, 'site/metadata.json'), 'utf8'));
      // 원본: 앱의 vite.config.ts 플러그인 그대로(사이트 계층이 아닌 pdf.js 자료 플러그인만 뺀다)
      const config = (await import(join(variant, 'vite.config.ts'))).default as UserConfig;
      const plugins = (config.plugins ?? []).flat().filter((plugin): plugin is Plugin => !!plugin && (plugin as Plugin).name !== 'opencad-pdfjs-assets');
      roots.push(appRoot(app, 'original'));
      original = await buildRoot(roots[0]!, plugins, config);
      // 도구: 같은 사전을 공용 번역기에 넣고 ADOPTION 설정으로
      kitCore = await import('../../i18n/core.mjs');
      for (const language of LANGUAGES) kitCore.registerCatalog(language, JSON.parse(readFileSync(join(variant, `site/locales/${language}.json`), 'utf8')));
      roots.push(appRoot(app, 'kit'));
      const setup = await kitSetup(app, roots[1]!, variant);
      kit = await buildRoot(roots[1]!, setup.plugins, config);
      origCore = await import(join(variant, 'site/i18n.mjs'));
    });
    afterAll(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });

    it('builds a byte-identical dist (pages, language pages, manifests, sitemap, sw.js, assets)', () => {
      const files = [...readTree(kit).keys()];
      for (const file of ['index.html', 'en/index.html', 'de/index.html', 'en/manifest.webmanifest', 'sitemap.xml', 'sw.js']) expect(files, file).toContain(file);
      expect(treeDifferences(original, kit)).toEqual([]);
    });

    it('passes the original i18n check and the shared one on that dist', () => {
      const run = spawnSync(process.execPath, [join(variant, 'tools/check-i18n.mjs')], { cwd: roots[0], encoding: 'utf8' });
      expect(run.status, run.stderr).toBe(0);
      expect(checkI18n({ root: kit })).toMatch(/^i18n check passed/);
    });

    it('computes the same application fingerprint, and the shared SEO check passes with it', () => {
      const run = spawnSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(join(variant, 'tools/app-fingerprint.mjs'))}); console.log(m.appFingerprint());`], { cwd: roots[0], encoding: 'utf8' });
      expect(run.status, run.stderr).toBe(0);
      const fingerprint = appFingerprint(metadata.url, kit);
      expect(fingerprint).toBe(run.stdout.trim());
      const history = JSON.parse(readFileSync(join(variant, 'site/content-history.json'), 'utf8'));
      expect(checkSeo({ metadata: metadata as never, history: { ...history, fingerprint }, root: kit })).toMatch(/^SEO check passed/);
    });

    it('gives the same addresses and translated metadata', () => {
      for (const url of ['https://gyutae-kim.github.io/opencad-step/ja/?sample#view', '/de/index.html', '?lang=zh-CN', 'https://gyutae-kim.github.io/2dcad-viewer/en/', metadata.url])
        expect(kitCore.currentLanguage(url), url).toBe(origCore.currentLanguage(url));
      for (const language of ['ko', ...LANGUAGES]) {
        for (const url of [metadata.url, 'https://gyutae-kim.github.io/opencad', 'https://gyutae-kim.github.io/opencad-nc/?open=a.nc#v', 'https://gyutae-kim.github.io/2dcad-viewer/', 'https://github.com/GyuTae-Kim', './'])
          expect(kitCore.languageUrl(url, language), `${url} ${language}`).toBe(origCore.languageUrl(url, language));
        expect(kitCore.metadataForLanguage(language)).toEqual(origCore.metadataForLanguage(language));
      }
    });

    it(app === 'dwg' ? 'translates the same except where the original left Korean (multi-line and joined-sentence fixes)' : 'translates every catalog message, template and joined sentence the same', async () => {
      // 빌드 때 기억한 것을 비운다(기억은 앞뒤 빈칸을 정규화한 열쇠라, 먼저 옮긴 글의 빈칸이 뒤의 같은 글에 남는다 — 두 쪽이 같은 차례로 옮기게)
      for (const language of LANGUAGES) { origCore.registerCatalog(language, origCore.catalogs[language]!); kitCore.registerCatalog(language, origCore.catalogs[language]!); }
      // DWG는 여러 줄·이은 문장 고침이 있는 STEP 갈래 번역기와도 견준다
      const reference: Core | null = app === 'dwg' && has('step') ? await import(join(variantsRoot, 'step/site/i18n-core.mjs')) : null;
      if (reference) for (const language of LANGUAGES) reference.registerCatalog(language, origCore.catalogs[language]!);
      // 원본 번역기는 정규화한 열쇠로 기억해, 먼저 옮긴 글의 앞뒤 빈칸이 뒤의 같은 글에 남는다(부르는 차례에 따라 빈칸만 다르다).
      // 도구는 글 그대로를 열쇠로 기억해 차례와 상관없다 — 빈칸만 다른 것은 따로 센다.
      const spacingOnly = (a: string, b: string) => a.replace(/\s+/g, '') === b.replace(/\s+/g, '');
      let compared = 0, improved = 0, spacing = 0;
      for (const language of LANGUAGES) {
        for (const text of corpus(origCore.catalogs[language]!)) {
          const ui = app === 'dwg' ? [false, true] : [false];
          for (const uiParameters of ui) {
            const before = origCore.translate(text, language, uiParameters), after = kitCore.translate(text, language, uiParameters);
            compared++;
            if (before === after) continue;
            expect(app, `${language}${uiParameters ? ' ui' : ''}: ${JSON.stringify(text)}\n  original: ${JSON.stringify(before)}\n  kit:      ${JSON.stringify(after)}`).toBe('dwg');
            if (spacingOnly(before, after)) { spacing++; continue; }
            expect(hangul(after), `${language}${uiParameters ? ' ui' : ''}: ${JSON.stringify(text)} → ${JSON.stringify(after)} (original ${JSON.stringify(before)})`).toBeLessThan(hangul(before));
            improved++;
          }
          if (reference) {
            const expected = reference.translate(text, language), actual = kitCore.translate(text, language);
            if (expected !== actual) expect(spacingOnly(expected, actual), `${language}: ${JSON.stringify(text)}\n  STEP branch: ${JSON.stringify(expected)}\n  kit:         ${JSON.stringify(actual)}`).toBe(true);
          }
        }
      }
      console.info(`[variants] ${app}: ${compared} translations compared, ${improved} left less Korean than the original, ${spacing} differ only in spacing (original cache order)`);
      expect(compared).toBeGreaterThan(1000);
    });
  });
}

/** 실제 빌드 결과(읽기만)의 파일 목록으로 원본 sw-plugin과 도구가 같은 sw.js 원본을 만드는지 */
const dists = Object.fromEntries((process.env.OPENCAD_SITE_KIT_DISTS ?? '').split(',').filter(Boolean).map(pair => pair.split(/:(.*)/s).slice(0, 2) as [string, string]));
describe.skipIf(!Object.keys(dists).length)('sw.js from real build outputs', () => {
  for (const app of APPS) {
    it.skipIf(!dists[app] || !has(app))(`${app}: same worker source from the same files`, async () => {
      const dist = dists[app]!;
      const variant = join(variantsRoot, app);
      const tools = await import(join(variant, 'tools/sw-plugin.mjs'));
      const files: string[] = listFiles(dist).filter((file: string) => file !== 'sw.js');
      const read = (file: string) => readFileSync(join(dist, file));
      let before: string;
      if (app === 'step') {
        const pre = files.filter(tools.precacheable);
        const h = createHash('sha256');
        for (const f of pre) { h.update(f); h.update(read(f)); }
        before = tools.serviceWorkerSource({ version: h.digest('hex').slice(0, 12), urls: tools.precacheUrls(pre) });
      } else if (app === 'nc') {
        const pre = files.filter(tools.precacheable);
        before = tools.serviceWorkerSource({ version: tools.contentVersion(pre.map((f: string) => ({ name: f, content: read(f) }))), urls: tools.precacheUrls(pre) });
      } else if (app === 'skp') {
        const list: string[] = tools.precacheList(dist).filter((f: string) => f !== 'sw.js');
        const contents = list.map(f => ({ name: f, content: read(f === './' ? 'index.html' : f.endsWith('/') ? f + 'index.html' : f) }));
        before = tools.serviceWorkerSource(readFileSync(join(variant, 'tools/sw-template.js'), 'utf8'), list, contents);
      } else {
        const lazy = new Set<string>();
        const pre = files.filter(f => tools.precacheable(f, lazy));
        const staticFiles = files.filter(f => ['fonts/', 'pdfjs/', 'samples/'].some(d => f.startsWith(d)));
        before = tools.serviceWorkerSource({ version: tools.fingerprint(pre, read), staticVersion: tools.fingerprint(staticFiles, read), precache: tools.precacheUrls(files, lazy), assets: files.filter(f => f.startsWith('assets/') && /\.(?:m?js|css)$/.test(f)) });
      }
      const root = appRoot(app, 'kit');
      try {
        // 플러그인의 closeBundle은 dist에 쓰므로, 같은 계산(serviceWorkerValues → source)을 읽기만 하는 길로 한다(쓸 때만 받는 덩어리는 빌드 정보가 없어 비운다)
        const { lazy: _lazy, ...options } = swOptions(app);
        const after = (await swSource(app, root, variant))(serviceWorkerValues(files, read, options));
        expect(after).toBe(before);
        // 그 dist의 sw.js와도 같으면(같은 원본으로 빌드했고 쓸 때만 받는 덩어리가 없으면) 알린다
        const onDisk = existsSync(join(dist, 'sw.js')) ? readFileSync(join(dist, 'sw.js'), 'utf8') : null;
        console.info(`[variants] ${app}: real dist ${files.length} files, sw.js on disk ${onDisk === after ? 'identical' : 'differs (built from other sources or with lazy chunks)'}`);
      } finally { rmSync(root, { recursive: true, force: true }); }
    });
  }
});
