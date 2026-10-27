/**
 * 네 앱이 이 도구를 쓸 때의 설정 — docs/ADOPTION.md의 vite.config.ts 값과 같다(갈래 비교 시험이 이 설정으로 원본과 같은 dist가 나오는지 본다).
 * 앱이 계속 갖고 있는 것(서비스 워커 본문, NC의 파일 다루기)은 appDir의 원본에서 가져온다.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { siteLocalization } from '../../i18n/localization-plugin.mjs';
import { serviceWorker, templateSource, type Precache, type ServiceWorkerValues } from '../../pwa/sw-plugin.mjs';
import { defineSite, type ContentHistory, type Site, type SiteMetadata } from '../../seo/site-metadata.mjs';
import { siteMetadata } from '../../seo/site-plugin.mjs';

export const APPS = ['step', 'skp', 'nc', 'dwg'] as const;
export type App = (typeof APPS)[number];

/** SKP: 앱 쪽·assets의 스크립트·스타일·JSON, 그림·앱 정보만 미리 담는다 */
export const skpPrecache: Precache = (f) =>
  f !== 'sw.js' && !f.endsWith('.map') && !/(^|\/)(sitemap\.xml|robots\.txt|og-opencad\.jpg)$/.test(f) &&
  (/^assets\/.+\.(js|css|json)$/.test(f) || /\.(png|svg|ico|webmanifest)$/.test(f) || /(^|\/)index\.html$/.test(f));

/** DWG: 다섯 언어 쪽과 앱 정보, 뿌리의 아이콘, assets의 스크립트·스타일 가운데 쓸 때만 받는 덩어리를 뺀 것 */
export const dwgPrecache: Precache = (path, { lazy }) => {
  if (/\.map$/.test(path) || path === 'sw.js') return false;
  if (path.startsWith('assets/')) return /\.(?:m?js|css)$/.test(path) && !lazy.has(path);
  if (/^(?:[\w-]+\/)?(?:index\.html|manifest\.webmanifest)$/.test(path)) return true;
  return /^[\w.-]+\.(?:png|svg|ico)$/.test(path);
};
export const dwgLazy = { facade: [/[\\/]site[\\/]locales[\\/][\w-]+\.json$/], modules: [/[\\/]node_modules[\\/]pdfjs-dist[\\/]/], assetOrigins: [/pdfjs-dist/], assetNames: [/(?:^|\/)pdf\.worker/] };

type LegacySource = (o: { version: string; urls: string[] }) => string;

/** 앱마다 서비스 워커 설정(본문 source 빼고) — 예전 판 이름·미리 담을 목록이 그대로 나오게 */
export function swOptions(app: App): Omit<Parameters<typeof serviceWorker>[0], 'source'> {
  if (app === 'step') return { version: { length: 12, separator: '', terminator: '' } };
  if (app === 'nc') return { version: { length: 12, separator: '\0', terminator: '' } };
  if (app === 'skp') return { precache: skpPrecache, sortUrls: true, version: { length: 16, key: 'url', separator: '\0', terminator: '' } };
  return { precache: dwgPrecache, lazy: dwgLazy, staticDirs: ['fonts/', 'pdfjs/', 'samples/'] };
}

/** 서비스 워커 본문: STEP·NC는 앱이 갖는 serviceWorkerSource(예전 tools/sw-plugin.mjs 그대로), SKP·DWG는 앱의 tools/sw-template.js */
export async function swSource(app: App, appDir: string, keptDir = appDir): Promise<(values: ServiceWorkerValues) => string> {
  if (app === 'skp' || app === 'dwg') return templateSource(join(appDir, 'tools/sw-template.js'));
  const { serviceWorkerSource } = (await import(join(keptDir, 'tools/sw-plugin.mjs'))) as { serviceWorkerSource: LegacySource };
  return ({ version, precache }) => serviceWorkerSource({ version, urls: precache });
}

/**
 * app의 사이트 설정과 Vite 플러그인. appDir: 앱 뿌리(site/·public/·tools/sw-template.js가 있는 곳),
 * keptDir: 앱이 계속 갖는 코드(서비스 워커 본문·NC 파일 다루기)를 가져올 곳(기본 appDir)
 */
export async function kitSetup(app: App, appDir: string, keptDir = appDir): Promise<{ site: Site; plugins: Plugin[] }> {
  const json = (path: string) => JSON.parse(readFileSync(join(appDir, path), 'utf8'));
  const metadata = json('site/metadata.json') as SiteMetadata;
  const history = json('site/content-history.json') as ContentHistory;
  let site: Site;
  if (app === 'nc') {
    const { fileHandling } = (await import(join(keptDir, 'tools/site-metadata.mjs'))) as { fileHandling: (extensions: readonly string[]) => Record<string, unknown> };
    const { NC_EXTENSIONS } = (await import(join(keptDir, 'src/extensions.ts'))) as { NC_EXTENSIONS: string[] };
    site = defineSite({ metadata, history, manifest: {
      source: join(appDir, 'site/manifest.webmanifest'), emitDefault: true, links: 'metadata',
      extend: (manifest) => ({ ...manifest, ...fileHandling(NC_EXTENSIONS) }),
    } });
  } else {
    site = defineSite({ metadata, history, manifest: { source: join(appDir, 'public/manifest.webmanifest') } });
  }
  return { site, plugins: [siteLocalization(site), siteMetadata(site), serviceWorker({ source: await swSource(app, appDir, keptDir), ...swOptions(app) })] };
}
