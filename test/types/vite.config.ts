/**
 * 형 확인 전용(tsc만 — 실행하지 않는다): 앱의 vite.config.ts가 docs/ADOPTION.md처럼 이 도구를 패키지 이름으로 가져와
 * JSON 사이트 정보·앱 정보 설정·서비스 워커 설정을 넘길 때 형이 맞는지 본다.
 */
import { siteLocalization } from 'opencad-site-kit/i18n/localization-plugin';
import { defineSite } from 'opencad-site-kit/seo/site-metadata';
import { siteMetadata } from 'opencad-site-kit/seo/site-plugin';
import { serviceWorker, serviceWorkerValues, templateSource, type Precache, type ServiceWorkerOptions } from 'opencad-site-kit/pwa/sw-plugin';
import type { Plugin } from 'vite';
import metadata from './site/metadata.json' with { type: 'json' };
import history from './site/content-history.json' with { type: 'json' };
import { fileHandling } from './tools/file-handling.mjs';

const site = defineSite({ metadata, history, manifest: { source: new URL('./public/manifest.webmanifest', import.meta.url) } });
const linked = defineSite({ metadata, history, manifest: {
  source: new URL('./site/manifest.webmanifest', import.meta.url), emitDefault: true, links: 'metadata',
  extend: (manifest) => ({ ...manifest, ...fileHandling(['nc']) }),
} });
const precache: Precache = (path, { lazy }) => path.startsWith('assets/') && !lazy.has(path);
const legacySource = ({ version, urls }: { version: string; urls: string[] }) => `${version}${urls.length}`;
export const plugins: Plugin[] = [
  siteLocalization(site), siteMetadata(site), siteMetadata(linked, { nojekyll: false }),
  serviceWorker({ source: ({ version, precache: urls }) => legacySource({ version, urls }), version: { length: 12, separator: '', terminator: '' } }),
  serviceWorker({ source: templateSource(new URL('./tools/sw-template.js', import.meta.url)), precache, sortUrls: true, staticDirs: ['fonts/'], lazy: { modules: [/pdfjs-dist/] } }),
];

// 앱 tools/site.mjs의 offline 설정 꼴: 플러그인과 시험(serviceWorkerValues)에 그대로 넘긴다
export const offline: ServiceWorkerOptions = { source: templateSource(new URL('./tools/sw-template.js', import.meta.url)), precache, sortUrls: true, lazy: { modules: [/pdfjs-dist/] } };
export const values = serviceWorkerValues(['index.html'], () => '', offline);
export const withLazy = serviceWorkerValues(['index.html'], () => '', { ...offline, lazy: new Set(['assets/a.js']) });
