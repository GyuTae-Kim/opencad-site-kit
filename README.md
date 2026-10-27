# OpenCAD 사이트 도구

OpenCAD 앱(STEP·SKP·NC·DWG·DXF)이 함께 쓰는 사이트 계층 도구입니다. 다섯 언어 페이지, 검색·공유 정보와 사이트맵, 내용 수정일,
홈 화면 앱 정보와 오프라인 서비스 워커, 방문 통계, 모바일 성능 측정을 한곳에 모았습니다.
예전에는 같은 파일을 앱 저장소마다 복사해 써서, 공용 번역기 고침을 저장소마다 따로 옮겨야 했고 DWG만 갈래가 달라져 있었습니다.

함께 쓰는 저장소: [opencad-step](https://github.com/GyuTae-Kim/opencad-step) · [opencad-skp](https://github.com/GyuTae-Kim/opencad-skp) ·
[opencad-nc](https://github.com/GyuTae-Kim/opencad-nc) · [opencad-dwgdxf](https://github.com/GyuTae-Kim/opencad-dwgdxf)

## 들어 있는 것

| 가져오는 경로 | 내용 |
|---|---|
| `opencad-site-kit/i18n/core` | 공용 번역기: 다섯 언어, 사전 등록, `translate`(틀 `{0}`의 값은 그대로 — `uiParameters`면 화면 글 값도 옮김), 줄바꿈·` · `로 이은 글은 조각마다, 언어 주소(`currentLanguage`·`languageUrl`), 언어별 사이트 정보. 앱은 `configureI18n({ metadata })`로 사이트 정보를 넘깁니다 |
| `opencad-site-kit/i18n/localization-plugin` | Vite 플러그인 `siteLocalization(site)`: 빌드한 `index.html`을 `<언어>/index.html`로 옮기고(글·속성·링크·언어 고르기 줄·`<base href="../">`), 개발 서버는 주소의 언어로 |
| `opencad-site-kit/i18n/check-i18n` | 빌드 뒤 확인: 사전 열쇠·`{0}` 자리, 언어 페이지·언어 대안, 홈 화면 앱 정보(시작 주소·id·범위·공유 받기·아이콘), 서비스 워커가 페이지를 담는지 |
| `opencad-site-kit/i18n/language-menu` | 언어 고르기 메뉴(브라우저, TypeScript) |
| `opencad-site-kit/seo/site-metadata` | `defineSite({ metadata, history, manifest })`: 앱 하나의 사이트 설정. 검색·공유 태그와 구조화 자료, 사이트맵, 언어별 앱 정보 |
| `opencad-site-kit/seo/site-plugin` | Vite 플러그인 `siteMetadata(site)`: `<!-- site-metadata -->` 자리에 검색 정보, `sitemap.xml`·`.nojekyll`·언어별 `manifest.webmanifest`, 개발 서버에서도 같은 것 |
| `opencad-site-kit/seo/content-dates`, `app-fingerprint`, `check-seo`, `update-content-dates`, `seo-test` | 내용 수정일: 앱 내용 지문(첫 쪽 내용 + 스크립트·스타일), 바뀌었을 때만 날짜 올리기, 빌드 뒤 검색 정보 확인 |
| `opencad-site-kit/seo/compare-dist` | 두 빌드 결과 견주기(자산 이름의 내용 지문은 맞춘 뒤) — 이 도구를 적용하기 전·후 확인용 |
| `opencad-site-kit/pwa/manifest` | 언어별 앱 정보(`localizeManifest` — 이름·설명을 옮기고 시작 주소는 그 언어 페이지, 범위·아이콘은 앱 뿌리, `id`는 두지 않음) |
| `opencad-site-kit/pwa/sw-plugin` | Vite 플러그인 `serviceWorker(options)`: 빌드 끝에 `dist/sw.js`. 미리 담을 목록과 판 이름(내용 지문)을 정하고 워커 본문은 앱이 줍니다(`templateSource(파일)` 또는 함수) |
| `opencad-site-kit/pwa/client` | 서비스 워커 등록과 새 판 알림, 데스크톱 파일 열기(launchQueue), 공유 받기 주소 인자(브라우저, TypeScript) |
| `opencad-site-kit/analytics`, `opencad-site-kit/analytics/config` | 방문 통계(GA4, 고르기 전에는 아무것도 보내지 않음)와 측정 ID(브라우저, TypeScript) |
| `opencad-site-kit/perf/*` | 모바일 성능 비교(압축해서 주는 미리 보기 서버, Lighthouse 결과 가운데값 표) |
| `opencad-site` 명령 | 앱 npm 스크립트가 부르는 명령(아래) |

서비스 워커 본문(최근 문서 저장소 꼴·공유 받기 흐름)은 앱마다 달라 이 도구에 넣지 않았습니다. 앱 화면 쪽(최근 문서·테마·단축키 등)도 아직 앱에 있습니다.

## 앱에서 쓰기

npm에 올리지 않고 GitHub 의존으로 씁니다. 빌드 때만 쓰므로 `devDependencies`에 둡니다(`npm install -D "opencad-site-kit@github:GyuTae-Kim/opencad-site-kit#<태그>"`). 브라우저 모듈은 TypeScript 원본 그대로 내보내므로 Vite 같은 번들러와 `moduleResolution: "bundler"`가 필요합니다.
빌드 도구(`.mjs`)는 Node 22와 Vite 7에서 돌고, 형 선언(`.d.mts`)이 함께 있습니다. `jsdom`·`vite`는 앱이 이미 가진 것을 씁니다.

```json
"devDependencies": {
  "opencad-site-kit": "github:GyuTae-Kim/opencad-site-kit#v0.1.2"
},
"scripts": {
  "build": "tsc --noEmit && vite build && npm run check:seo && npm run check:i18n",
  "check:seo": "opencad-site check-seo",
  "test:seo": "opencad-site test-seo",
  "update:content-dates": "vite build && opencad-site update-content-dates",
  "check:i18n": "opencad-site check-i18n"
}
```

공용 번역기에 앱의 사이트 정보를 넘기는 `site/i18n-core.mjs`(사전은 지금처럼 `site/i18n.mjs`가 넣습니다):

```js
import metadata from './metadata.json' with { type: 'json' };
import { configureI18n } from 'opencad-site-kit/i18n/core';
configureI18n({ metadata });
export * from 'opencad-site-kit/i18n/core';
```

사이트 설정 `tools/site.mjs`(vite.config.ts와 시험이 같이 씁니다)와 `vite.config.ts`:

```js
// tools/site.mjs
import metadata from '../site/metadata.json' with { type: 'json' };
import history from '../site/content-history.json' with { type: 'json' };
import '../site/i18n.mjs';
import { defineSite } from 'opencad-site-kit/seo/site-metadata';
import { templateSource } from 'opencad-site-kit/pwa/sw-plugin';
export const site = defineSite({ metadata, history, manifest: { source: new URL('../public/manifest.webmanifest', import.meta.url) } });
export const offline = { source: templateSource(new URL('./sw-template.js', import.meta.url)) };
```

```ts
// vite.config.ts
import { siteLocalization } from 'opencad-site-kit/i18n/localization-plugin';
import { siteMetadata } from 'opencad-site-kit/seo/site-plugin';
import { serviceWorker } from 'opencad-site-kit/pwa/sw-plugin';
import { offline, site } from './tools/site.mjs';
export default defineConfig({ base: './', plugins: [siteLocalization(site), siteMetadata(site), serviceWorker(offline)] });
```

`defineSite`의 `manifest`:

- `source`: 한국어 원본 앱 정보 파일
- `extend(manifest)`: 원본에 더할 것(예: 여는 확장자로 만든 `share_target`·`file_handlers`)
- `emitDefault`: 한국어 `manifest.webmanifest`도 빌드가 씁니다(원본이 `public/` 밖일 때). 아니면 `public/`이 그대로 복사합니다
- `links`: `'html'`(기본 — `index.html`에 적은 앱 정보 링크·홈 화면 이름을 언어 페이지마다 바꿈) 또는 `'metadata'`(검색 정보 자리에 언어별로 넣음)

`serviceWorker`의 선택:

- `source(values)`: 워커 원본. `values`는 `{ version, staticVersion, precache, assets, files }`. `templateSource(파일)`은
  `'__VERSION__'`·`'__STATIC__'`(JSON 문자열)와 `__PRECACHE__`(미리 담을 주소)·`__ASSETS__`(assets의 스크립트·스타일 전부)를 채웁니다
- `precache(path, { lazy })`: 처음 설치 때 담을 파일인지(기본: 소스 맵·`sw.js`·사이트맵·`robots.txt`·`.nojekyll`·공유 그림만 뺌)
- `lazy`: 쓸 때만 받는 덩어리를 가리는 규칙(`lazyFiles`), `staticDirs`: 따로 판을 매기고 처음에 담지 않는 큰 정적 폴더
- `sortUrls`, `version`(`{ length, key: 'file' | 'url', separator, terminator }`): 앱이 예전에 쓰던 목록 차례·판 이름을 그대로 두는 설정.
  새 앱은 기본값(앞 16자리, 파일 경로, 이름과 내용 사이·뒤에 `\0`)을 씁니다

브라우저 쪽은 패키지 경로로 가져옵니다.

```ts
import { createLanguageMenu } from 'opencad-site-kit/i18n/language-menu';
import { initAnalytics, beginOpen, trackExport } from 'opencad-site-kit/analytics';
import { GA4_MEASUREMENT_ID } from 'opencad-site-kit/analytics/config';
import { canUseServiceWorker, consumeLaunchFiles, registerServiceWorker, whenVisible, type SwContainer } from 'opencad-site-kit/pwa/client';

if (import.meta.env.PROD && canUseServiceWorker(location, navigator))
  void registerServiceWorker(navigator.serviceWorker as unknown as SwContainer, new URL('sw.js', document.baseURI), (apply) => offerUpdate(apply), undefined, { onVisible: whenVisible });
consumeLaunchFiles((files) => openFiles(files));
```

네 앱에 처음 적용하는 순서와 앱마다 바꿀 것은 [docs/ADOPTION.md](docs/ADOPTION.md)에 있습니다.

## 명령

앱 뿌리(작업 폴더)에서 돌고, 앱 파일은 관례 경로에서 읽습니다(`--metadata`·`--history`·`--i18n`·`--root`로 바꿀 수 있습니다).

| 명령 | 하는 일 |
|---|---|
| `opencad-site check-seo` | `dist/`의 검색 정보 확인. 앱 내용 지문이 `site/content-history.json`과 다르면 수정일을 올리라고 실패합니다 |
| `opencad-site check-i18n` | `site/i18n.mjs`(사전)를 읽고 `dist/`의 다섯 언어 페이지·앱 정보·사전을 확인합니다 |
| `opencad-site update-content-dates --at <UTC>` | 내용이 바뀌었을 때만 `site/content-history.json`의 날짜를 올립니다(`npm run update:content-dates -- --at …`) |
| `opencad-site test-seo` | 사이트 설정이 검색·공유·앱 설명과 날짜를 모두 채우는지(node:test) |
| `opencad-site compare-dist <전> <후> [--fail-on-change]` | 두 빌드 결과 견주기 |
| `opencad-site serve-performance <폴더> <포트>`, `opencad-site performance-summary <폴더>` | 모바일 성능 비교(CI) |

## 판 올리기

- 판은 `package.json`의 `version`과 같은 이름의 태그(`v0.1.0`)로 냅니다. 앱은 태그로 고정해 씁니다(`#v0.1.0`). 태그를 옮기거나 다시 쓰지 않습니다.
- 앱 출력을 바꾸지 않는 고침은 끝자리(`v0.1.1`), 선택 필드·새 내보내기를 더하는 것은 가운데 자리(`v0.2.0`)를 올립니다.
  앱이 설정이나 가져오는 경로를 바꿔야 하는 변경도 0.x 동안은 가운데 자리를 올리고, README에 옮기는 법을 적습니다.
- 같은 입력에서 앱 출력(HTML·앱 정보·사이트맵·sw.js·번역)을 바꾸는 변경은 확인된 버그를 고칠 때만 하고, 판 설명에 앱마다 무엇이 바뀌는지 적습니다.
  앱은 판을 올릴 때 전·후 빌드를 `opencad-site compare-dist`로 견줍니다.
- 태그를 올린 뒤 각 앱의 `package.json`을 새 태그로 바꾸고 `npm install`로 잠금 파일을 갱신합니다.

## 개발

```bash
npm install
npm run typecheck
npm test            # 단위 시험 + 합성 앱 빌드(Vite) + 명령
npm run variants    # 갈래 비교용 앱 원본 꺼내기(옆 폴더의 opencad-step·opencad-skp·opencad-nc·2dcad-viewer, --ref 기본 origin/main)
npm test            # .runtime/variants가 있으면 원본과 견주는 시험도 돈다
```

갈래 비교 시험(`test/variants`)은 앱 원본의 사이트 계층(`git show`로 꺼낸 파일만 — 앱 전체를 복사하지 않습니다)과 이 도구를
[docs/ADOPTION.md](docs/ADOPTION.md) 설정으로 쓴 것을 같은 입력으로 빌드해 dist가 바이트까지 같은지, 원본 `check-i18n`과 내용 지문이 같은지,
앱 사전 전체로 번역 결과가 같은지 봅니다. 앱이 이 도구로 옮긴 뒤에는 `--ref`로 옮기기 전 커밋을 주면 됩니다.
`OPENCAD_SITE_KIT_DISTS=step:<dist>,dwg:<dist>`를 주면 실제 빌드 결과의 파일 목록으로 sw.js 원본도 견줍니다(읽기만 합니다).

## 남은 일

- 서비스 워커 본문과 최근 문서 저장소(앱의 `recent.ts`)는 앱마다 꼴이 달라 아직 앱에 있습니다. 같은 꼴로 모으면 워커 틀도 이 도구로 옮깁니다
- 서비스 워커 판 이름 짓기·미리 담을 목록 차례는 앱마다 예전 방식을 설정으로 남겼습니다(기본값으로 바꾸면 사용자 브라우저가 한 번 새 판으로 받습니다)
- `languageUrl`이 아는 앱 경로(opencad-step·skp·nc·dwgdxf, 옛 2dcad-viewer)와 포트폴리오 경로는 코드에 적혀 있습니다. 새 앱을 더하면 여기도 고칩니다
- 방문 통계의 앱 이름·제목 목록(`AnalyticsTool`)도 코드에 적혀 있습니다

## 내력

네 앱 저장소의 `tools/`·`site/`·`src/app/` 사이트 계층 파일을 합쳤습니다(기준 커밋: opencad-step `4d3dd50`, opencad-skp `424a666`,
opencad-nc `eb2bd8c`, opencad-dwgdxf `eea2fcf`). 갈래마다 고친 쪽을 따랐습니다(여러 줄·이은 문장 번역, 화면 글 값 옮기기,
첫 설치 때 다시 읽지 않기 등 — [docs/ADOPTION.md](docs/ADOPTION.md)의 "합치면서 바뀌는 동작").

## 라이선스

MIT
