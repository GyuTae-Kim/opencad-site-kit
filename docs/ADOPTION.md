# 네 앱에 적용하기

opencad-step·opencad-skp·opencad-nc·opencad-dwgdxf가 저장소마다 복사해 쓰던 사이트 계층 파일을 이 도구(`opencad-site-kit#v0.1.2`)로 바꾸는 안내입니다.
opencad-nc가 처음 적용했습니다(6601bba → 아래 "NC 적용 기록"). 다른 앱도 같은 순서로 하면 됩니다.
아래 설정은 갈래 비교 시험(`test/variants/configs.ts`)과 같은 값이고, 그 시험이 각 앱 원본(기준 커밋 — STEP `4d3dd50`, SKP `424a666`,
NC `eb2bd8c`, DWG `eea2fcf`)과 같은 입력에서 같은 dist(HTML·언어 페이지·앱 정보·sitemap·sw.js)가 나오는 것을 확인했습니다.

## 1. 갈래 차이 요약

| 파일 | 갈래 | 다른 점 | 합친 쪽 |
|---|---|---|---|
| tools/check-seo.mjs, content-dates.mjs, update-content-dates.mjs, site/i18n.mjs, src/app/language-menu.ts, analytics-config.ts | 넷 같음 | — | 그대로(`update-content-dates`·`check-seo`는 경로를 인자로) |
| site/i18n-core.mjs(+.d.mts), site/i18n.d.mts | STEP·SKP·NC / DWG | STEP 갈래: 여러 줄 글 줄마다 옮기기, ` · `로 이은 문장을 짧은 틀이 삼키면 조각마다(5차 고침). DWG: 그 고침 없음, 대신 `translate(…, uiParameters)`(화면 글 값도 옮김) | 둘 다. 사이트 정보는 `configureI18n({ metadata })`로 받음. 기억 열쇠를 글 그대로로(아래 4절) |
| tools/site-metadata.mjs(+.d.mts) | STEP·SKP·DWG / NC | NC: 앱 정보 원본이 `site/`, 검색 정보 자리에 언어별 앱 정보 링크·홈 화면 이름, `manifestFor`·`fileHandling` | `defineSite`의 `manifest`(`links: 'metadata'`, `emitDefault`, `extend`) |
| tools/site-plugin.mjs(+.d.mts) | STEP·SKP / NC / DWG(vite.config.ts 안) | NC: 언어별 manifest를 냄·개발 서버도. DWG: 자리 수 확인 없음, `.nojekyll` 안 냄, 개발 사이트맵 정규식·Content-Type 다름 | `siteMetadata(site, { nojekyll })` — 자리 하나 확인, 앱 정보는 설정에 따라 |
| tools/localization-plugin.mjs(+.d.mts) | 넷 다 다름 | STEP: 개발 서버 언어 manifest, `id` 남김. SKP: `id` 뺌, 개발 서버 없음. NC: 앱 정보 다루지 않음. DWG: `id` 뺌, 개발 서버 정규식·Content-Type 다름 | HTML만 다루고 앱 정보는 `siteMetadata`로. `id`는 뺌 |
| tools/check-i18n.mjs | 넷 다 다름 | 확인 항목이 조금씩 다름(id 같음/안쪽, 홈 화면 이름, 공유 받기 동작 주소, sw.js 페이지) | 모두 합친 것(네 앱 원본 dist에서 통과) |
| tools/app-fingerprint.mjs | STEP·SKP·NC / DWG | DWG는 `root` 인자 없음 | `appFingerprint(pageUrl, root = 'dist')` |
| tools/seo.test.mjs | STEP·SKP·NC / DWG | DWG에 지문 시험 없음 | 지문·날짜 시험은 이 저장소로, 앱은 `opencad-site test-seo`(설정 확인) |
| tools/sw-plugin.mjs(+.d.mts) | 넷 다 다름 | 워커 본문(STEP·NC는 함수, SKP·DWG는 틀 파일), 미리 담을 규칙, 판 이름 짓기(12/16자리, 구분자, 이름=경로/주소), 목록 차례, DWG의 쓸 때만 받는 덩어리·정적 폴더 판 | `serviceWorker(options)` — 다른 점은 모두 설정. 워커 본문은 앱에 남김 |
| tools/sw-template.js | SKP / DWG | 최근 문서 저장소 꼴·캐시 방식이 다름 | 앱에 남김(SKP는 자리 이름 하나만 바꿈) |
| tools/performance-summary.mjs, serve-performance.mjs | SKP·NC·DWG 같음(NC는 6601bba에서 더함) | — | `opencad-site performance-summary`·`serve-performance` |
| src/app/analytics.ts | STEP / SKP·DWG / NC | 내보내기 형식에 STEP의 stl·obj·csv, 여는 형식에 NC의 pgi·xml | 합집합 |
| src/app/pwa.ts | 넷 다 다름 | 부르는 꼴, 첫 설치 다시 읽기, 같은 워커 두 번 알림, 앱으로 돌아올 때 새 판 확인(STEP·NC만), 파일 여러 개 넘기기(NC·DWG). NC 6601bba는 등록 결과가 없으면 `null`(도구 v0.1.1과 같은 고침) | DWG 꼴 + `onVisible` 선택 |

## 2. 모든 앱에 공통으로

1. `package.json`
   ```json
   "devDependencies": { "opencad-site-kit": "github:GyuTae-Kim/opencad-site-kit#v0.1.2" },
   "scripts": {
     "check:seo": "opencad-site check-seo",
     "test:seo": "opencad-site test-seo",
     "update:content-dates": "vite build && opencad-site update-content-dates",
     "check:i18n": "opencad-site check-i18n"
   }
   ```
   `build`·`test:i18n` 등 다른 스크립트는 그대로입니다. `npm install -D "opencad-site-kit@github:GyuTae-Kim/opencad-site-kit#v0.1.2"`로
   받아 잠금 파일에 그 태그의 커밋이 적히게 합니다. 빌드 때만 쓰므로 `devDependencies`에 둡니다 — `dependencies`에 두면 이 도구의 선택 peer(`vite`·`jsdom`)
   때문에 npm이 vite·jsdom과 그 의존 수십 개의 `"dev": true`를 `"devOptional"`로 바꿔 잠금 파일이 200줄 넘게 바뀝니다.
2. 지울 파일: `tools/check-seo.mjs`, `tools/content-dates.mjs`, `tools/update-content-dates.mjs`, `tools/app-fingerprint.mjs`, `tools/check-i18n.mjs`,
   `tools/seo.test.mjs`, `tools/site-metadata.mjs`·`.d.mts`, `tools/localization-plugin.mjs`·`.d.mts`, `tools/site-plugin.mjs`·`.d.mts`(DWG는 없음),
   `src/app/language-menu.ts`, `src/app/analytics.ts`, `src/app/analytics-config.ts`, `tests/app/analytics.test.ts`(같은 시험이 이 저장소에 있습니다)
3. `site/i18n-core.mjs`를 바꿉니다(사전을 넣는 `site/i18n.mjs`는 그대로).
   ```js
   // 공용 번역기(opencad-site-kit)에 이 앱의 사이트 정보를 넘긴다. 사전은 site/i18n.mjs(빌드·시험)와 앱(src/app/i18n.ts)이 넣는다.
   import metadata from './metadata.json' with { type: 'json' };
   import { configureI18n } from 'opencad-site-kit/i18n/core';
   configureI18n({ metadata });
   export * from 'opencad-site-kit/i18n/core';
   ```
   `site/i18n-core.d.mts`와 `site/i18n.d.mts`는 둘 다 `export * from 'opencad-site-kit/i18n/core';` 한 줄로.
4. 가져오는 곳 바꾸기
   - `src/app/i18n.ts`: `from './language-menu'` → `from 'opencad-site-kit/i18n/language-menu'`
   - `from './analytics'`(·`'../analytics'`·`'./app/analytics'`) → `from 'opencad-site-kit/analytics'`
   - `from './analytics-config'`(·`'./app/analytics-config'`) → `from 'opencad-site-kit/analytics/config'`
5. `tools/site.mjs`와 `tools/site.d.mts`를 새로 만들고(앱마다 3절), `vite.config.ts`는 이렇게 가져옵니다.
   ```ts
   import { siteLocalization } from 'opencad-site-kit/i18n/localization-plugin';
   import { siteMetadata } from 'opencad-site-kit/seo/site-plugin';
   import { serviceWorker } from 'opencad-site-kit/pwa/sw-plugin';
   import { offline, site } from './tools/site.mjs';
   // …
   plugins: [siteLocalization(site), siteMetadata(site), serviceWorker(offline)],
   ```
   `tools/site.d.mts`(넷 같음):
   ```ts
   import type { Site } from 'opencad-site-kit/seo/site-metadata';
   import type { serviceWorker } from 'opencad-site-kit/pwa/sw-plugin';
   export const site: Site;
   export const offline: Parameters<typeof serviceWorker>[0];
   ```
6. 문서: README 개발 절의 `tools/…` 설명을 `opencad-site` 명령으로, `ANALYTICS.md`(SKP는 `docs/analytics.md`)의
   "측정 ID는 `src/app/analytics-config.ts`" → "`opencad-site-kit`의 `analytics/config.ts`".

## 3. 앱마다

### opencad-step

- `tools/sw-plugin.mjs` → `tools/sw-source.mjs`로 이름을 바꾸고 `serviceWorkerSource`(와 그 위 설명)만 남깁니다. 돌려주는 글은 한 글자도 바꾸지 않습니다
  (첫 줄 주석의 `tools/sw-plugin.mjs`도 — sw.js에 그대로 들어가 바꾸면 sw.js가 달라집니다). `tools/sw-plugin.d.mts` → `tools/sw-source.d.mts`:
  `export function serviceWorkerSource(o: { version: string; urls: string[] }): string;`
- `tools/site.mjs`
  ```js
  // 이 앱의 사이트 설정(opencad-site-kit): 검색 정보·언어 페이지·앱 정보와 오프라인 서비스 워커. vite.config.ts와 시험이 같이 쓴다.
  import metadata from '../site/metadata.json' with { type: 'json' };
  import history from '../site/content-history.json' with { type: 'json' };
  import '../site/i18n.mjs';
  import { defineSite } from 'opencad-site-kit/seo/site-metadata';
  import { serviceWorkerSource } from './sw-source.mjs';

  export const site = defineSite({ metadata, history, manifest: { source: new URL('../public/manifest.webmanifest', import.meta.url) } });
  /** 판 이름은 예전처럼 미리 담는 파일 이름·내용 지문의 앞 12자리(구분자 없음) */
  export const offline = {
    source: ({ version, precache }) => serviceWorkerSource({ version, urls: precache }),
    version: { length: 12, separator: '', terminator: '' },
  };
  ```
- `src/app/app.ts`: `import { consumeLaunchQueue, registerServiceWorker } from './pwa'` →
  `import { canUseServiceWorker, consumeLaunchFiles, registerServiceWorker, whenVisible, type SwContainer } from 'opencad-site-kit/pwa/client';`
  ```ts
  if (!import.meta.env.DEV && canUseServiceWorker(location, navigator))
    void registerServiceWorker(navigator.serviceWorker as unknown as SwContainer, new URL('sw.js', document.baseURI),
      (apply) => this.toast('새 버전이 있습니다.', 'info', 60_000, { label: '새로 고침', run: apply }), undefined, { onVisible: whenVisible });
  consumeLaunchFiles((files) => void this.openFile(files[0]!));
  ```
  `src/app/pwa.ts`를 지웁니다.
- `tests/sw.test.ts`:
  ```ts
  import { serviceWorkerSource } from '../tools/sw-source.mjs';
  import { defaultPrecacheable as precacheable, serviceWorkerValues } from 'opencad-site-kit/pwa/sw-plugin';
  const precacheUrls = (files: string[]) => serviceWorkerValues(files, () => '').precache;
  ```

### opencad-skp

- `tools/sw-template.js`: `const ASSETS = __ASSETS__;` → `const ASSETS = __PRECACHE__;`(이 도구에서 `__ASSETS__`는 assets의 스크립트·스타일 전부라서. 채운 결과는 같습니다)
- `tools/sw-plugin.mjs`·`.d.mts`, `tools/performance-summary.mjs`, `tools/serve-performance.mjs`를 지웁니다.
- `tools/site.mjs`
  ```js
  import metadata from '../site/metadata.json' with { type: 'json' };
  import history from '../site/content-history.json' with { type: 'json' };
  import '../site/i18n.mjs';
  import { defineSite } from 'opencad-site-kit/seo/site-metadata';
  import { templateSource } from 'opencad-site-kit/pwa/sw-plugin';

  export const site = defineSite({ metadata, history, manifest: { source: new URL('../public/manifest.webmanifest', import.meta.url) } });
  /** 앱 쪽(뿌리·언어 쪽), assets의 스크립트·스타일·JSON, 그림·앱 정보만 미리 담는다 */
  export const precache = (f) =>
    f !== 'sw.js' && !f.endsWith('.map') && !/(^|\/)(sitemap\.xml|robots\.txt|og-opencad\.jpg)$/.test(f) &&
    (/^assets\/.+\.(js|css|json)$/.test(f) || /\.(png|svg|ico|webmanifest)$/.test(f) || /(^|\/)index\.html$/.test(f));
  /** 목록은 주소 차례, 판 이름은 예전처럼 주소·내용 지문의 앞 16자리 */
  export const offline = {
    source: templateSource(new URL('./sw-template.js', import.meta.url)),
    precache, sortUrls: true, version: { length: 16, key: 'url', separator: '\0', terminator: '' },
  };
  ```
  `tools/site.d.mts`에 `export const precache: import('opencad-site-kit/pwa/sw-plugin').Precache;`를 더합니다.
- `src/app/main.ts`: `from './pwa'` → `from 'opencad-site-kit/pwa/client'`(`whenVisible`도 가져옴)
  ```ts
  consumeLaunchFiles((files) => void app.openFile(files[0]!));
  if (import.meta.env.PROD && canUseServiceWorker(location, navigator))
    void registerServiceWorker(navigator.serviceWorker as unknown as SwContainer, new URL(swPath, import.meta.url), (apply) => app.offerUpdate(apply), undefined, { onVisible: whenVisible });
  ```
  `src/app/pwa.ts`를 지웁니다.
- `tests/app/pwa.test.ts`: `from '../../src/app/pwa'` → `from 'opencad-site-kit/pwa/client'`. 등록·launchQueue 시험은 이 저장소에 같은 것이 있으니
  지워도 됩니다(남기면 `consumeLaunchFiles(open, w)` → `consumeLaunchFiles(open, undefined, w)`이고 `open`은 파일 배열을 받습니다). 서비스 워커 빌드 시험은
  `precacheList(root)` → `serviceWorkerValues(listFiles(root), (f) => readFileSync(join(root, f)), offline).precache`,
  `serviceWorkerSource(tpl, list, files)` → `fillTemplate(tpl, { version, precache: list })`(`opencad-site-kit/pwa/sw-plugin`, `../../tools/site.mjs`)로.
- `.github/workflows/mobile-validation.yml`: 기준 빌드 뒤 `git checkout --detach "$GITHUB_SHA"` 다음 줄에 `npm ci`를 더하고(기준 커밋의
  node_modules에는 이 도구가 없을 수 있다), `node tools/serve-performance.mjs` → `node_modules/.bin/opencad-site serve-performance`,
  `node tools/performance-summary.mjs` → `node_modules/.bin/opencad-site performance-summary`.

### opencad-nc

- `tools/sw-plugin.mjs` → `tools/sw-source.mjs`(STEP과 같이 `serviceWorkerSource`만, 글은 그대로). `.d.mts`:
  `export function serviceWorkerSource(opts: { version: string; urls: string[]; recent?: { db: string; store: string; max: number; maxSize: number } }): string;`
- `tools/site.mjs`
  ```js
  import metadata from '../site/metadata.json' with { type: 'json' };
  import history from '../site/content-history.json' with { type: 'json' };
  import '../site/i18n.mjs';
  import { NC_EXTENSIONS } from '../src/extensions.ts';
  import { defineSite } from 'opencad-site-kit/seo/site-metadata';
  import { serviceWorkerSource } from './sw-source.mjs';

  /** (예전 tools/site-metadata.mjs의 fileHandling과 설명을 그대로 옮긴다) */
  export function fileHandling(extensions) { /* … */ }
  // 앱 정보 원본은 site/manifest.webmanifest: 한국어도 빌드가 쓰고, 언어별 링크·홈 화면 이름은 검색 정보 자리에
  export const site = defineSite({ metadata, history, manifest: {
    source: new URL('../site/manifest.webmanifest', import.meta.url), emitDefault: true, links: 'metadata',
    extend: (manifest) => ({ ...manifest, ...fileHandling(NC_EXTENSIONS) }),
  } });
  /** 판 이름은 예전처럼 이름·내용(사이에 \0) 지문의 앞 12자리 */
  export const offline = {
    source: ({ version, precache }) => serviceWorkerSource({ version, urls: precache }),
    version: { length: 12, separator: '\0', terminator: '' },
  };
  ```
  `tools/site.d.mts`에 `export function fileHandling(extensions: readonly string[]): Record<string, unknown>;`를 더합니다.
  (`tools/site.mjs`는 `src/extensions.ts`를 가져오므로 Vite·vitest에서만 읽습니다. `opencad-site` 명령은 이 파일을 읽지 않습니다.)
- `src/app/app.ts`: `from './pwa'` → `from 'opencad-site-kit/pwa/client'`
  ```ts
  if (!import.meta.env.DEV && canUseServiceWorker(location, navigator))
    void registerServiceWorker(navigator.serviceWorker as unknown as SwContainer, new URL('sw.js', document.baseURI),
      (apply) => toast('새 버전이 있습니다.', 'info', 60_000, { label: '새로 고침', run: apply }), undefined, { onVisible: whenVisible });
  consumeLaunchFiles((files) => void (files.length > 1 ? this.openFiles(files) : this.openFile(files[0]!)));
  ```
  `src/app/pwa.ts`를 지웁니다.
- `tests/sw.test.ts`:
  ```ts
  import { fileHandling, offline, site } from '../tools/site.mjs';
  import { serviceWorkerSource } from '../tools/sw-source.mjs';
  import { defaultPrecacheable as precacheable, fingerprint, serviceWorkerValues } from 'opencad-site-kit/pwa/sw-plugin';
  const precacheUrls = (files: string[]) => serviceWorkerValues(files, () => '').precache;
  const manifestFor = (language = 'ko') => site.webManifest(language);   // 예전 manifestFor(language, NC_EXTENSIONS)
  const contentVersion = (files: { name: string; content: string }[]) => fingerprint(files.map((f) => ({ file: f.name, url: f.name })), (name) => files.find((f) => f.name === name)!.content, offline.version);
  ```
  `en`처럼 형을 좁혀 쓰는 곳은 `site.webManifest('en') as unknown as …`(앱 정보 형 `WebManifest`에는 `share_target`이 없다).
- `tests/app/pwa.test.ts`: 등록·launchQueue 시험을 도구의 꼴로 바꿉니다 —
  `registerServiceWorker(onUpdate, { sw, base, reload, onVisible })` → `registerServiceWorker(sw, new URL('sw.js', base), onUpdate, reload, { onVisible })`,
  `consumeLaunchQueue(open, host)` → `consumeLaunchFiles(open, undefined, host)`. "시험 환경 기본값은 등록하지 않는다"는 앱이 `import.meta.env.DEV`로 거르므로 뺍니다.
- `.github/workflows/mobile-validation.yml`과 성능 도구 두 파일: SKP와 같이(아래).
- 주석의 `tools/sw-plugin.mjs`(`src/app/recent.ts` 등)는 2단계에서 고칩니다 — 1단계에서 고치면 소스 맵(`sourcesContent`)이 달라져 바이트 비교가 깨집니다.

### opencad-dwgdxf

- `vite.config.ts` 안의 `siteMetadata()` 함수를 지우고 도구의 것을 씁니다: `plugins: [siteLocalization(site), siteMetadata(site), pdfjsAssets(), serviceWorker(offline)]`.
  `renderMetadata`·`sitemapXml` 가져오기도 지웁니다.
- `tools/sw-plugin.mjs`·`.d.mts`, `tools/performance-summary.mjs`, `tools/serve-performance.mjs`를 지웁니다(`tools/sw-template.js`는 그대로).
- `tools/site.mjs`
  ```js
  import metadata from '../site/metadata.json' with { type: 'json' };
  import history from '../site/content-history.json' with { type: 'json' };
  import '../site/i18n.mjs';
  import { defineSite } from 'opencad-site-kit/seo/site-metadata';
  import { templateSource } from 'opencad-site-kit/pwa/sw-plugin';

  export const site = defineSite({ metadata, history, manifest: { source: new URL('../public/manifest.webmanifest', import.meta.url) } });
  /** 다섯 언어 쪽과 앱 정보, 뿌리의 아이콘, assets의 스크립트·스타일 가운데 쓸 때만 받는 덩어리를 뺀 것 */
  export const precache = (path, { lazy }) => {
    if (/\.map$/.test(path) || path === 'sw.js') return false;
    if (path.startsWith('assets/')) return /\.(?:m?js|css)$/.test(path) && !lazy.has(path);
    if (/^(?:[\w-]+\/)?(?:index\.html|manifest\.webmanifest)$/.test(path)) return true;
    return /^[\w.-]+\.(?:png|svg|ico)$/.test(path);
  };
  /** 쓸 때만 받는 덩어리: 다른 언어 사전, PDF 해석기(pdfjs-dist) */
  export const lazy = { facade: [/[\\/]site[\\/]locales[\\/][\w-]+\.json$/], modules: [/[\\/]node_modules[\\/]pdfjs-dist[\\/]/], assetOrigins: [/pdfjs-dist/], assetNames: [/(?:^|\/)pdf\.worker/] };
  /** 글꼴·PDF 자료·예제는 따로 판(STATIC)을 매기고 쓸 때 담는다 */
  export const offline = { source: templateSource(new URL('./sw-template.js', import.meta.url)), precache, lazy, staticDirs: ['fonts/', 'pdfjs/', 'samples/'] };
  ```
  `tools/site.d.mts`에 `precache: Precache`와 `lazy: LazyRules`(`opencad-site-kit/pwa/sw-plugin`)를 더합니다. 판 이름 짓기는 도구 기본값과 같습니다.
- `src/app/pwa.ts`는 공유 받기 안내만 남기고 나머지는 다시 내보냅니다(`pwa-app.ts`·시험은 그대로).
  ```ts
  export * from 'opencad-site-kit/pwa/client';
  /** 공유 받기 실패 안내 */
  export function shareErrorMessage(code: string): string { /* 그대로 */ }
  ```
  `src/app/pwa-app.ts`에서 `registerServiceWorker(…)`에 `undefined, { onVisible: whenVisible }`를 넘기면 앱으로 돌아올 때 새 판을 확인합니다(선택).
- `tests/app/sw.test.ts`:
  ```ts
  import { fillTemplate, lazyFiles as kitLazyFiles, serviceWorkerValues, type BundleItem } from 'opencad-site-kit/pwa/sw-plugin';
  import { lazy as lazyRules, offline, precache } from '../../tools/site.mjs';
  const precacheable = (f: string, lazy = new Set<string>()) => precache(f, { lazy });
  const precacheUrls = (files: string[], lazy = new Set<string>()) => serviceWorkerValues(files, () => '', { ...offline, lazy }).precache;
  const lazyFiles = (bundle: Record<string, BundleItem>) => kitLazyFiles(bundle, lazyRules);
  const serviceWorkerSource = (values: Parameters<typeof fillTemplate>[1]) => fillTemplate(readFileSync('tools/sw-template.js', 'utf8'), values);
  ```
- `tests/webapp-manifest.test.ts`: `localizeHtml(html, lang)` → `localizeHtml(html, lang, site)`(`site`는 `../tools/site.mjs`), `localizeManifest`는 그대로 가져와도 됩니다.
- `.github/workflows/mobile-validation.yml`: SKP와 같이 `npm ci`를 더하고 성능 명령을 `node_modules/.bin/opencad-site …`로.

## 4. 합치면서 바뀌는 동작

| 앱 | 바뀌는 것 | 까닭·확인 |
|---|---|---|
| 넷 | 번역 기억 열쇠가 글 그대로(전에는 빈칸을 정규화한 열쇠라, 앞뒤 빈칸·줄바꿈만 다른 글을 먼저 옮겼으면 그 결과의 빈칸·줄바꿈이 뒤 글에 섞였다) | 확인된 버그(부르는 차례에 따라 결과가 달랐다). 앱 사전 전체로 만든 말뭉치에서 STEP 10,136·SKP 12,212·NC 11,692개 차이 0, DWG는 빈칸만 다른 33개 |
| 넷 | `check-i18n`이 네 갈래의 확인을 모두 한다: 앱 정보 링크 하나·`display: standalone`·id가 그 언어 페이지·홈 화면 이름이 앱 정보 짧은 이름·`share_target`·`file_handlers` 동작 주소가 그 언어 페이지·`sw.js`가 다섯 페이지를 담음 | 네 앱 원본 플러그인으로 만든 dist에서 원본 확인과 합친 확인이 모두 통과 |
| 넷 | 언어별 `manifest.webmanifest`를 `siteMetadata`가 `generateBundle`에서 낸다(전: STEP·SKP·DWG는 `siteLocalization`의 `writeBundle`) | 파일·바이트 같음 |
| 넷 | `test:seo`는 사이트 설정 확인과 수정일이 지나간 UTC인지만. 지문·날짜 계산 시험은 이 저장소에 | — |
| 넷 | 방문 통계 형식 목록 합집합(여는 형식에 pgi·xml, 내보내기에 stl·obj·csv) | 각 앱이 보내는 값은 같다(자기가 열고 내보내는 형식만 쓴다) |
| 넷 | 새 판 알림: 같은 워커는 한 번만 알리고, 고른 뒤 바뀔 때만 한 번 다시 읽는다(DWG 꼴). `onVisible: whenVisible`을 넘기면 앱으로 돌아올 때 새 판을 확인 | STEP·NC는 전부터 확인했고, SKP·DWG는 넘기면 새로 생긴다 |
| STEP | 데스크톱 "연결 프로그램": 첫 파일을 못 읽으면 읽힌 다음 파일을 연다(전: 아무것도 열지 않음) | `consumeLaunchFiles`가 읽힌 파일만 넘긴다 |
| STEP | 언어별 앱 정보에서 `id`를 뺀다 | STEP 앱 정보에 `id`가 없어 출력 같음 |
| SKP | 첫 설치 때(워커가 `skipWaiting`·`clients.claim`) 페이지를 다시 읽던 것을 멈춘다 | SKP 원본은 `controllerchange`마다 다시 읽었다. DWG 갈래가 고친 것을 따름 |
| SKP | 개발 서버가 `<언어>/manifest.webmanifest`를 준다(전: 개발 서버에서 없음) | 개발 서버만 |
| SKP | `sw-template.js` 자리 이름 `__ASSETS__` → `__PRECACHE__` | 채운 sw.js 같음 |
| NC | `registerServiceWorker`·`consumeLaunchQueue` 부르는 꼴이 도구의 꼴로 | 동작 같음(같은 워커 한 번만 알림만 더해짐) |
| DWG | 공용 번역기에 STEP 갈래의 고침이 들어온다: 줄바꿈으로 이은 글은 줄마다, ` · `·` \| `·` — `로 이은 문장을 짧은 틀의 `{0}`이 삼키면 조각마다 | 사전 열쇠·값을 끼운 틀 하나짜리는 차이 0. 합성 말뭉치(네 언어)에서 이은 문장 10,944개 중 3,764개(화면 글 값 옮기기 2,560개), 여러 줄 10,944개 중 4,220개(4,028개)가 한국어를 덜 남긴다. 다른 결과는 모두 STEP 갈래 번역기와 같다(빈칸만 다른 것 빼고) |
| DWG | `<!-- site-metadata -->` 자리가 정확히 하나가 아니면 빌드가 멈춘다. `.nojekyll`을 낸다 | 지금 `index.html`은 하나, `public/.nojekyll`과 같은 빈 파일이라 dist 같음 |
| DWG | 개발 서버 사이트맵·언어 앱 정보의 Content-Type에 `charset=utf-8`, 언어 앱 정보 끝에 줄바꿈 | 개발 서버만 |
| DWG | `registerServiceWorker`를 상대 주소로 부르면 `null` 대신 `'./'` 범위로 등록 | 앱은 절대 주소로 부른다 |
| STEP·NC·SKP | `translate(값, 언어, true)`(화면 글 값도 옮김)를 쓸 수 있다 | 기본은 전과 같음 |

## 5. 적용 뒤 확인

dist는 앱 저장소의 `.runtime/`(git 무시)에 둡니다.

1. 적용 전(기준 커밋): `npm ci && npx vite build && mv dist .runtime/dist-before`
2. **1단계 — 빌드 플러그인만(커밋할 수 있다)**: 2·3절 가운데 Vite 플러그인 쪽만 바꿉니다 — `package.json` 의존, `tools/site.mjs`·`vite.config.ts`,
   앱이 갖는 워커 본문, 지우는 것은 `tools/localization-plugin.*`·`tools/site-plugin.*`·`tools/sw-plugin.*`뿐, 그 파일을 가져오던 시험의 import.
   이때 `site/i18n-core.mjs`, `src/app/` 모듈, 확인 명령(`tools/check-*.mjs`·`tools/site-metadata.mjs` 등 — 앱의 번역기를 쓴다)은 그대로 두고,
   `tools/site.mjs`의 `import '../site/i18n.mjs';` 대신 공용 번역기에 사전을 직접 넣습니다.
   ```js
   import { registerCatalog } from 'opencad-site-kit/i18n/core';
   import en from '../site/locales/en.json' with { type: 'json' };
   import ja from '../site/locales/ja.json' with { type: 'json' };
   import zh from '../site/locales/zh-CN.json' with { type: 'json' };
   import de from '../site/locales/de.json' with { type: 'json' };
   for (const [language, content] of Object.entries({ en, ja, 'zh-CN': zh, de })) registerCatalog(language, content);
   ```
   `npx vite build && npx opencad-site compare-dist .runtime/dist-before dist --fail-on-change` — **모든 파일이 `same`(바이트까지 같음)이어야 합니다.**
   그다음 `npm test`·`npm run build`(앱의 확인 명령 그대로)·`npm run test:seo`가 통과하면 이 단계를 커밋합니다(dist가 같으니 내용 수정일은 그대로).
   (`compare-dist`는 v0.1.2부터 씁니다. v0.1.1은 수백 KB짜리 한 줄 묶음에서 처음 다른 글자를 찾느라 멈춥니다.)
   브라우저 묶음은 그대로이고, 언어 페이지·앱 정보·사이트맵·sw.js를 만드는 도구만 바뀌었기 때문입니다(이 저장소의 갈래 비교 시험이 같은 것을 합성 입구로 확인했습니다).
   다르면: 앱 정보 파일 경로(`manifest.source`), 워커 설정(`offline`의 `version`·`sortUrls`·`precache`), SKP 틀의 자리 이름, 워커 본문 글을 봅니다.
3. **2단계 — 나머지**: `tools/site.mjs`를 3절 그대로(`import '../site/i18n.mjs';`)로 되돌리고 `site/i18n-core.mjs`·`src/app/` 쪽, 확인 명령(`package.json` 스크립트)과 시험을 바꾸고 남은 복사본을 지웁니다.
   `npx vite build && npx opencad-site compare-dist .runtime/dist-before dist`에서 기대하는 차이는 이것뿐입니다.
   - `assets/*.js`(·`.map`) 가운데 공용 번역기·PWA 연결·방문 통계가 든 묶음: `changed`(4절의 코드 차이 — 번역기의 `configureI18n`·기억 열쇠·DWG 밖 갈래의 `uiParameters`,
     DWG의 여러 줄·이은 문장 고침, PWA 연결, 형식 목록)
   - `index.html`·`<언어>/index.html`: `same-but-asset-names`(스크립트 이름의 내용 지문만)
   - `sw.js`: 판 이름이 든 줄만 `changed`(판 이름을 캐시 이름에도 쓰는 앱은 두 줄 — 미리 담을 목록은 이름 지문만 다르다)
   - 앱 정보·사이트맵·`.nojekyll`·그림·글꼴: `same`
   이 밖에 `changed`가 있으면 원인을 적고 고칩니다.
4. 마무리: `npm run typecheck && npm test && npm run test:seo`, 마지막에 `npm run update:content-dates -- --at $(date -u +%Y-%m-%dT%H:%M:%SZ)`
   → `npm run build`(안에서 `check:seo`·`check:i18n`) → `git status`. 2단계에서 JS가 바뀌므로 내용 수정일이 올라갑니다.
5. 헤드리스 Chrome으로 넓은 화면·375px에서 언어 페이지 둘, 첫 방문 서비스 워커·오프라인 다시 열기·새 판 알림과 새로 고침을 봅니다.
   `.github/workflows/mobile-validation.yml`이 있는 앱은 기준 커밋을 빌드한 뒤 이 커밋으로 돌아와 `npm ci`를 다시 하고(기준 커밋에는 도구가 없을 수 있다)
   성능 명령을 `node_modules/.bin/opencad-site serve-performance …`·`performance-summary …`로 부릅니다.

## NC 적용 기록(opencad-nc, 2026-10-27)

| 단계 | compare-dist(적용 전 6601bba의 dist와) | 확인 |
|---|---|---|
| 1단계 빌드 플러그인 | 같음 32 | vitest 450·tsc·`npm run build`(앱 확인 명령)·test:seo 통과 |
| 2단계 번역기·언어 메뉴·PWA 연결·방문 통계·확인 명령 | 같음 24, 자산 이름만 5(다섯 언어 페이지), 바뀜 3: `assets/index-*.js`(321,602 → 322,132바이트)·`.map`, `sw.js` 판 이름 두 줄 | 사전 덩어리·해석 워커·CSS·앱 정보·sitemap 같음. vitest 434·tsc·test:i18n·check:i18n·test:seo, 헤드리스(ja·ko 1280px, de 375px, 오프라인·공유 받기·새 판 알림) 통과 |
| 내용 수정일 갱신 뒤 | 위에 더해 다섯 페이지의 `dateModified`와 `sitemap.xml`의 `lastmod` | `npm run build`(check:seo·check:i18n)·test:seo 통과 |

다음 앱에서 볼 것:
- STEP·SKP도 `tests/`가 `tools/sw-plugin.mjs`·`tools/site-metadata.mjs`·`tools/localization-plugin.mjs`를 가져오는지 먼저 찾아(`git grep -n "tools/"`) 1단계에서 함께 고칩니다.
- SKP는 `src/app/main.ts`의 `consumeLaunchFiles((file) => …)`를 파일 배열로, 시험의 `consumeLaunchFiles(open, w)`를 `(open, undefined, w)`로.
  SKP 원본은 첫 설치 때(`clients.claim`) 페이지를 한 번 다시 읽었습니다 — 바뀌는 동작이니 헤드리스로 첫 방문이 다시 읽지 않는지 봅니다.
- DWG는 `src/app/pwa.ts`를 다시 내보내기로 두면 `pwa-app.ts`·시험을 거의 그대로 둘 수 있습니다. `tests/webapp-manifest.test.ts`의 `localizeHtml`에 `site`를 넘깁니다.
- 번역기 결과는 STEP·SKP·NC에서 같고 DWG에서만 여러 줄·이은 문장이 달라집니다(4절). DWG는 2단계 뒤 다섯 언어 페이지의 정적 소개가 그대로인지(`check:i18n`) 꼭 봅니다.
