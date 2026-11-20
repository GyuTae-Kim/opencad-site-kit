# OpenCAD 사이트 도구

English: [Embed OpenCAD in your web page](docs/EMBED.en.md)

OpenCAD 앱(STEP·SKP·NC·DWG·DXF)이 함께 쓰는 사이트 계층 도구입니다. 다섯 언어 페이지, 검색·공유 정보와 사이트맵, 내용 수정일,
홈 화면 앱 정보와 오프라인 서비스 워커, 방문 통계, 모바일 성능 측정, 다른 사이트에 앱을 넣는 임베드를 한곳에 모았습니다.
사이트마다 다른 값(통계 ID·호스트·앱 경로·언어 주소 규칙)은 코드에 두지 않고 설정으로 받습니다 — OpenCAD의 값은 `presets/opencad.mjs` 한 파일에 있습니다.
예전에는 같은 파일을 앱 저장소마다 복사해 써서, 공용 번역기 고침을 저장소마다 따로 옮겨야 했고 DWG만 갈래가 달라져 있었습니다.

함께 쓰는 저장소: [opencad-step](https://github.com/GyuTae-Kim/opencad-step) · [opencad-skp](https://github.com/GyuTae-Kim/opencad-skp) ·
[opencad-nc](https://github.com/GyuTae-Kim/opencad-nc) · [opencad-dwgdxf](https://github.com/GyuTae-Kim/opencad-dwgdxf)

## 내 웹사이트에 OpenCAD 설치하기

내 블로그·포트폴리오·제품 소개 페이지에 OpenCAD 앱(DWG·DXF 2D 캐드, STEP·SketchUp·NC 3D 뷰어)을 넣는 방법입니다.
서버·계정·빌드 도구 없이 스크립트 한 줄과 `<opencad-viewer>` 요소 하나면 됩니다. 이 저장소와 네 앱 저장소는 모두 공개돼 있고 MIT입니다.

| 내 사이트 | 방법 |
|---|---|
| HTML을 직접 넣을 수 있는 곳(정적 사이트, 블로그 테마, CMS의 HTML 블록) | [1. 스크립트 한 줄(CDN)](#1-스크립트-한-줄cdn) |
| 바깥 CDN을 쓰지 않는 사이트 | [2. 파일 하나를 내 사이트에 두기](#2-파일-하나를-내-사이트에-두기) |
| 번들러를 쓰는 웹앱(Vite·webpack·Next.js 등) | [3. npm으로 받기](#3-npm으로-받기) |
| 스크립트를 넣을 수 없는 곳 | [4. iframe만 넣기](#4-iframe만-넣기) |
| 앱까지 내 서버에서 내보내고 싶을 때 | [5. 앱을 직접 배포하기](#5-앱을-직접-배포하기) |

### 1. 스크립트 한 줄(CDN)

```html
<script type="module"
  src="https://cdn.jsdelivr.net/gh/GyuTae-Kim/opencad-site-kit@v0.3.0/embed/opencad-embed.js"
  integrity="sha384-CY1O0cUbTNF8wtB63Oq+16i5fvJJ+dNm54zPnRBOU8qgSQ76Jy6TBUNbSwHbdauc"
  crossorigin="anonymous"></script>

<opencad-viewer src="/files/bracket.step" lang="en" style="height: 520px"></opencad-viewer>
```

- 요소는 `src`의 확장자로 앱을 고릅니다: `.dwg`·`.dxf`는 DWG/DXF 캐드, `.step`·`.stp`는 STEP 뷰어, `.skp`는 SKP 뷰어, `.nc`·`.gcode` 등은 NC 뷰어입니다
- `src` 파일은 내 페이지가 직접 받아 앱에 넘깁니다. 그래서 내 사이트에 있는 파일이거나 CORS를 허용한 주소여야 합니다
- 주소에 `@v0.3.0`처럼 태그를 붙여 판을 고정합니다. 태그는 옮기지 않으므로 같은 주소는 늘 같은 파일이고, `integrity` 값도 그대로 맞습니다.
  파일이 한 바이트라도 다르면 브라우저가 실행하지 않습니다. 새 판으로 올릴 때는 주소와 `integrity`를 함께 바꿉니다:
  `curl -sL <스크립트 주소> | openssl dgst -sha384 -binary | openssl base64 -A`
- 크기는 CSS로 정합니다(기본 높이 480px, 너비는 부모에 맞춤). 화면 언어는 `lang`(`ko`·`en`·`ja`·`zh-CN`·`de`)으로 고릅니다

방문자가 자기 파일을 열게 하려면 `src` 없이 `app`을 주고, 파일을 고르면 `open()`을 부릅니다.

```html
<input type="file" id="pick" accept=".dwg,.dxf">
<opencad-viewer id="viewer" app="dwgdxf"></opencad-viewer>
<script type="module">
  const viewer = document.getElementById('viewer');
  document.getElementById('pick').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { await viewer.open(file); }                         // 앱이 열기를 마치면 풀린다
    catch (error) { console.warn('열지 못함', error.message); }  // unsupported · too-large · timeout …
  });
</script>
```

속성·함수·이벤트와 오류 코드는 [docs/EMBED.md](docs/EMBED.md)에 있습니다.

### 2. 파일 하나를 내 사이트에 두기

요소 스크립트는 의존 없는 파일 하나입니다(12.6 KB, gzip 4.8 KB). 받아서 내 사이트에 올리고 그 주소로 불러옵니다.

```bash
curl -L -o opencad-embed.js https://cdn.jsdelivr.net/gh/GyuTae-Kim/opencad-site-kit@v0.3.0/embed/opencad-embed.js
```

```html
<script type="module" src="/js/opencad-embed.js"></script>
```

MIT 조건대로 이 저장소의 저작권·허가 문구([LICENSE](LICENSE))를 함께 둡니다. 앱은 그대로 `https://gyutae-kim.github.io/`의 것을 띄웁니다.

### 3. npm으로 받기

npm 레지스트리에는 올리지 않았으므로 GitHub 태그로 받습니다(설치하는 컴퓨터에 git이 있어야 합니다).

```bash
npm install "opencad-site-kit@github:GyuTae-Kim/opencad-site-kit#v0.3.0"
```

```js
import 'opencad-site-kit/embed';   // <opencad-viewer>를 등록한다. 번들에는 이 파일 하나만 들어간다
```

- 패키지는 런타임 의존이 없고 설치 때 빌드하지 않습니다. `jsdom`·`vite`는 선택 의존이라 함께 깔리지 않습니다
- 형 선언이 들어 있어 TypeScript에서 `document.querySelector('opencad-viewer')`가 `OpenCadViewer`로 잡힙니다.
  `addEventListener('opencad-done', (event) => event.detail.id)`처럼 이벤트의 `detail` 형도 형 변환 없이 잡힙니다(요소·`document`·`window` 모두)
- 서버에서 페이지를 그리는 프레임워크(SSR)에서 가져와도 오류가 나지 않습니다. 브라우저가 아니면 요소를 등록하지 않고, 요소는 브라우저에서 그려집니다
- 이벤트는 요소에 `addEventListener('opencad-done', …)`로 겁니다. React 같은 프레임워크에서는 ref로 요소를 잡아 겁니다

### 4. iframe만 넣기

스크립트를 넣을 수 없는 블로그 편집기 등에서는 앱 주소를 iframe으로 띄웁니다. 방문자가 그 안에서 자기 파일을 엽니다.
파일을 넘기거나 열기 결과를 받으려면 1~3을 씁니다.

```html
<iframe src="https://gyutae-kim.github.io/opencad-step/en/" title="OpenCAD STEP viewer"
  allow="fullscreen; clipboard-write" style="width:100%;height:520px;border:0"></iframe>
```

앱 주소는 `https://gyutae-kim.github.io/` 뒤에 `opencad-dwgdxf/` · `opencad-step/` · `opencad-skp/` · `opencad-nc/`, 언어를 바꾸려면 그 뒤에 `en/` · `ja/` · `zh-CN/` · `de/`를 붙입니다(한국어는 붙이지 않음).

### 5. 앱을 직접 배포하기

네 앱 저장소를 fork해 내 GitHub Pages 등에 올리고 요소에 `base="https://me.github.io/"`를 줍니다.
저장소 이름을 바꿨을 때와 통계·언어 주소 설정을 바꾸는 법은 [docs/EMBED.md "앱을 직접 배포해 쓰기"](docs/EMBED.md#앱을-직접-배포해-쓰기)에 있습니다.

### 알아 둘 것

- **파일**: 내 페이지가 파일을 읽어 `postMessage`로 iframe 안의 앱에 넘기고, 앱은 브라우저 안에서만 엽니다. 앱은 다른 서버를 부르지 않습니다
- **통계**: iframe 안의 앱은 방문 통계를 켜지 않고 동의 상자·서비스 워커(오프라인·새 판 알림)도 쓰지 않습니다. 내 사이트 방문이 OpenCAD 통계에 섞이지 않습니다
- **느린 기기**: 앱이 30초 안에 준비되지 않으면 `opencad-error`(`timeout`)가 옵니다. 앱은 그 뒤에도 계속 불러오고, 준비되면 `opencad-ready`가 옵니다.
  `src`로 준 파일은 그때 다시 받아 열고, `open()`으로 넘긴 파일은 `opencad-ready`를 받은 뒤 다시 넘깁니다
- **브라우저**: 요소 스크립트는 Chrome·Edge 84, Firefox 90, Safari 15 이후에서 돕니다. 앱마다 더 필요한 기능(WebGL 등)은 각 앱 README에 있습니다
- **CDN을 쓰지 않을 때**: jsDelivr를 쓰지 않으면 2번처럼 파일을 내 사이트에 둡니다. 앱 iframe은 `gyutae-kim.github.io`(또는 `base`)에서 뜹니다

2026-11-19~20에 다른 출처 페이지(localhost)에서 위 1번 코드(당시 `v0.2.0`)로 확인한 것:

- jsDelivr의 태그 주소 파일이 그 태그와 바이트까지 같고, CORS를 허용하며(`access-control-allow-origin: *`) 1년 동안 바뀌지 않는 파일로 캐시합니다
- `integrity` 값이 맞으면 요소가 등록되고, 값이 다르면 브라우저가 스크립트를 막습니다
- 네 앱 페이지는 다른 사이트가 iframe에 넣는 것을 막는 헤더(`X-Frame-Options`, CSP `frame-ancestors`)를 보내지 않습니다
- 배포된 네 앱 모두 파일 열기를 마쳤습니다(`opencad-done`): DXF(일본어 화면)·NC(독일어 화면)·SKP는 `src`로, STEP은 방문자가 고른 파일처럼 `open()`으로 넘겼습니다
- `loading="lazy"`(0.3.0)는 화면 밖 뷰어가 앱을 불러오지 않고, 스크롤해 다가간 뷰어만 앱을 띄워 열기를 마칩니다
- npm으로 받은 패키지에서 `opencad-site-kit/embed`가 이 파일 하나로 풀리고, Node(서버)에서 가져와도 오류가 없습니다

## 들어 있는 것

| 가져오는 경로 | 내용 |
|---|---|
| `opencad-site-kit/i18n/core` | 공용 번역기: 다섯 언어, 사전 등록, `translate`(틀 `{0}`의 값은 그대로 — `uiParameters`면 화면 글 값도 옮김), 줄바꿈·` · `로 이은 글은 조각마다, 언어 주소(`currentLanguage`·`languageUrl`), 언어별 사이트 정보. 앱은 `configureI18n({ metadata, routes, untranslated })`로 사이트 정보와 언어 주소 규칙을 넘깁니다 |
| `opencad-site-kit/i18n/localization-plugin` | Vite 플러그인 `siteLocalization(site)`: 빌드한 `index.html`을 `<언어>/index.html`로 옮기고(글·속성·링크·언어 고르기 줄·`<base href="../">`), 개발 서버는 주소의 언어로 |
| `opencad-site-kit/i18n/check-i18n` | 빌드 뒤 확인: 사전 열쇠·`{0}` 자리, 언어 페이지·언어 대안, 홈 화면 앱 정보(시작 주소·id·범위·공유 받기·아이콘), 서비스 워커가 페이지를 담는지 |
| `opencad-site-kit/i18n/language-menu` | 언어 고르기 메뉴(브라우저, TypeScript) |
| `opencad-site-kit/seo/site-metadata` | `defineSite({ metadata, history, manifest, routes })`: 앱 하나의 사이트 설정. 검색·공유 태그와 구조화 자료, 사이트맵, 언어별 앱 정보 |
| `opencad-site-kit/seo/site-plugin` | Vite 플러그인 `siteMetadata(site)`: `<!-- site-metadata -->` 자리에 검색 정보, `sitemap.xml`·`.nojekyll`·언어별 `manifest.webmanifest`, 개발 서버에서도 같은 것 |
| `opencad-site-kit/seo/content-dates`, `app-fingerprint`, `check-seo`, `update-content-dates`, `seo-test` | 내용 수정일: 앱 내용 지문(첫 쪽 내용 + 스크립트·스타일), 바뀌었을 때만 날짜 올리기, 빌드 뒤 검색 정보 확인 |
| `opencad-site-kit/seo/compare-dist` | 두 빌드 결과 견주기(자산 이름의 내용 지문은 맞춘 뒤) — 이 도구를 적용하기 전·후 확인용 |
| `opencad-site-kit/pwa/manifest` | 언어별 앱 정보(`localizeManifest` — 이름·설명을 옮기고 시작 주소는 그 언어 페이지, 범위·아이콘은 앱 뿌리, `id`는 두지 않음) |
| `opencad-site-kit/pwa/sw-plugin` | Vite 플러그인 `serviceWorker(options)`: 빌드 끝에 `dist/sw.js`. 미리 담을 목록과 판 이름(내용 지문)을 정하고 워커 본문은 앱이 줍니다(`templateSource(파일)` 또는 함수) |
| `opencad-site-kit/pwa/client` | 서비스 워커 등록과 새 판 알림, 데스크톱 파일 열기(launchQueue), 공유 받기 주소 인자(브라우저, TypeScript) |
| `opencad-site-kit/analytics` | 방문 통계(GA4, 고르기 전에는 아무것도 보내지 않음, iframe 안에서는 꺼짐). `initAnalytics(설정, 앱 이름)` — 측정 ID·호스트·공개 경로·제목을 설정으로 받습니다(브라우저, TypeScript) |
| `opencad-site-kit/presets/opencad` | OpenCAD 사이트의 값: `OPENCAD_ANALYTICS`(통계), `OPENCAD_SITE`(언어 주소 규칙·번역 제외 이름). 다른 사이트는 이 파일을 본보기로 자기 값을 만듭니다 |
| `opencad-site-kit/analytics/config` | `OPENCAD_ANALYTICS` 다시 내보내기(예전 `GA4_MEASUREMENT_ID`도 남김) |
| `opencad-site-kit/embed/app` | 앱 쪽 임베드: `acceptEmbeddedFiles(open, { accept })` — iframe에 넣은 앱이 부모 페이지가 넘긴 파일을 연다(브라우저, TypeScript) |
| `opencad-site-kit/embed` | 호스트 쪽 임베드: `<opencad-viewer>` 요소(의존 없는 한 파일 `embed/opencad-embed.js`) — [docs/EMBED.md](docs/EMBED.md) |
| `opencad-site-kit/perf/*` | 모바일 성능 비교(압축해서 주는 미리 보기 서버, Lighthouse 결과 가운데값 표, 앱 예산 파일과 견주는 성능 예산 검사) |
| `opencad-site` 명령 | 앱 npm 스크립트가 부르는 명령(아래) |

서비스 워커 본문(최근 문서 저장소 꼴·공유 받기 흐름)은 앱마다 달라 이 도구에 넣지 않았습니다. 앱 화면 쪽(최근 문서·테마·단축키 등)도 아직 앱에 있습니다.

## 앱에서 쓰기

npm에 올리지 않고 GitHub 의존으로 씁니다. 빌드 때만 쓰므로 `devDependencies`에 둡니다(`npm install -D "opencad-site-kit@github:GyuTae-Kim/opencad-site-kit#<태그>"`).
아래 예는 OpenCAD 앱의 것입니다. 다른 사이트는 [다른 사이트에서 쓰기](#다른-사이트에서-쓰기)를 봅니다. 브라우저 모듈은 TypeScript 원본 그대로 내보내므로 Vite 같은 번들러와 `moduleResolution: "bundler"`가 필요합니다.
빌드 도구(`.mjs`)는 Node 22와 Vite 7에서 돌고, 형 선언(`.d.mts`)이 함께 있습니다. `jsdom`·`vite`는 앱이 이미 가진 것을 씁니다.

```json
"devDependencies": {
  "opencad-site-kit": "github:GyuTae-Kim/opencad-site-kit#v0.3.0"
},
"scripts": {
  "build": "tsc --noEmit && vite build && npm run check:seo && npm run check:i18n",
  "check:seo": "opencad-site check-seo",
  "test:seo": "opencad-site test-seo",
  "update:content-dates": "vite build && opencad-site update-content-dates",
  "check:i18n": "opencad-site check-i18n"
}
```

공용 번역기에 앱의 사이트 정보와 언어 주소 규칙을 넘기는 `site/i18n-core.mjs`(사전은 지금처럼 `site/i18n.mjs`가 넣습니다):

```js
import metadata from './metadata.json' with { type: 'json' };
import { configureI18n } from 'opencad-site-kit/i18n/core';
import { OPENCAD_SITE } from 'opencad-site-kit/presets/opencad';
configureI18n({ metadata, ...OPENCAD_SITE });
export * from 'opencad-site-kit/i18n/core';
```

빌드의 `defineSite`도 번역기를 설정하지만, `routes`를 주지 않으면 이 파일이 같은 사이트 정보로 준 규칙을 그대로 씁니다.

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

이 설정의 형은 `ServiceWorkerOptions`이고, 시험에서는 같은 설정을 `serviceWorkerValues(listFiles(dist), read, offline)`에 그대로 넘겨
미리 담을 목록·판 이름을 봅니다(`source`는 쓰지 않고 규칙 꼴 `lazy`는 빈 모음 — 모음을 주려면 `{ ...offline, lazy: new Set([...]) }`).

브라우저 쪽은 패키지 경로로 가져옵니다.

```ts
import { createLanguageMenu } from 'opencad-site-kit/i18n/language-menu';
import { initAnalytics, beginOpen, trackExport } from 'opencad-site-kit/analytics';
import { OPENCAD_ANALYTICS } from 'opencad-site-kit/presets/opencad';
import { canUseServiceWorker, consumeLaunchFiles, registerServiceWorker, whenVisible, type SwContainer } from 'opencad-site-kit/pwa/client';
import { acceptEmbeddedFiles } from 'opencad-site-kit/embed/app';

initAnalytics(OPENCAD_ANALYTICS, 'step');
if (import.meta.env.PROD && canUseServiceWorker(location, navigator))
  void registerServiceWorker(navigator.serviceWorker as unknown as SwContainer, new URL('sw.js', document.baseURI), (apply) => offerUpdate(apply), undefined, { onVisible: whenVisible });
consumeLaunchFiles((files) => openFiles(files));
// 다른 사이트에 넣었을 때(iframe) 부모 페이지가 넘기는 파일 — 열기를 마치면 풀리는 Promise를 돌려주면 부모가 끝을 안다
acceptEmbeddedFiles((files) => openFiles(files, { remember: false }), { accept: ['.step', '.stp', '.p21', '.stpz'] });
```

iframe 안에서는 `initAnalytics`가 아무것도 하지 않고 `canUseServiceWorker`가 false입니다(남의 페이지 안에서 동의 상자·새 판 알림을 띄우지 않고,
그 사이트 방문을 OpenCAD 통계에 섞지 않습니다). `acceptEmbeddedFiles`는 `<html data-embedded>`를 달아 앱이 넣은 화면에서만 숨길 것을 CSS로 가릴 수 있게 합니다.

네 앱에 처음 적용하는 순서와 앱마다 바꿀 것은 [docs/ADOPTION.md](docs/ADOPTION.md)에 있습니다.

## 다른 사이트에서 쓰기

이 도구는 OpenCAD 앱을 위해 만들었지만, 사이트 값은 모두 설정으로 받으므로 자기 Vite 웹앱(예: 직접 배포한 OpenCAD 앱 사본)에도 씁니다.
`presets/opencad.mjs`를 본보기로 자기 값을 만듭니다.

```js
// site/i18n-core.mjs — 앱이 https://me.example/cad/ 에 있고 블로그(/blog/)도 언어 앞머리(/en/blog/)를 쓰는 사이트
import metadata from './metadata.json' with { type: 'json' };   // url: "https://me.example/cad/"
import { configureI18n } from 'opencad-site-kit/i18n/core';
configureI18n({
  metadata,
  routes: { apps: ['/cad/'], site: { root: '/', sections: ['blog'] } },  // 없으면 metadata.url의 경로(/cad/) 하나만 앱으로 본다
  untranslated: ['My Site'],
});
export * from 'opencad-site-kit/i18n/core';
```

```ts
// 방문 통계: 이 호스트의 https 페이지에서만, 방문자가 고른 뒤에만 보낸다
initAnalytics({
  measurementId: 'G-XXXXXXXXXX',
  host: 'me.example',
  consentKey: 'me.analytics-consent.v1',
  apps: { cad: { path: '/cad/', title: 'My Site | CAD 뷰어' } },   // GA에는 이 공개 경로·제목만 남는다(파일 이름·문서 제목은 보내지 않음)
  text: { message: '…', allow: '허용', limited: '기본 방문만', deny: '수집 안 함' },  // 동의 상자 글(기본 한국어)
}, 'cad');
```

| 설정 | 쓰는 곳 | 주지 않으면 |
|---|---|---|
| `routes.apps`(앱 뿌리, `/`로 시작·끝) | `languageUrl`·언어 페이지 링크 | `metadata.url`의 경로 하나. 이 컴퓨터(localhost)에서는 `/`도 |
| `routes.aliases`(옛 뿌리 → 지금 뿌리) | 옛 주소 링크 | 없음 |
| `routes.site`(`root`, `sections`) | 언어를 앞머리로 두는 사이트 쪽 | 없음 |
| `untranslated` | `sourceMessage`가 거꾸로 찾지 않을 이름 | 없음 |
| `AnalyticsConfig`(`measurementId`·`host`·`apps` 필수, `consentKey`·`formats`·`sourceTool`·`text`) | `initAnalytics` | 통계를 켜지 않음 |

언어는 아직 한국어·영어·일본어·중국어(간체)·독일어 다섯 가지로 정해져 있습니다(사전 열쇠는 한국어 원문).

## 0.2.0으로 옮기기

0.1.x는 OpenCAD 값(통계 ID·호스트·앱 경로·언어 주소 규칙)이 코드에 있었습니다. 0.2.0은 설정으로 받으므로 앱에서 세 곳을 바꿉니다.

1. `site/i18n-core.mjs`: `configureI18n({ metadata })` → `configureI18n({ metadata, ...OPENCAD_SITE })`(`opencad-site-kit/presets/opencad`에서 가져옴).
   빼면 다른 OpenCAD 앱·포트폴리오로 가는 링크가 언어 주소로 바뀌지 않습니다
2. 통계: `initAnalytics(GA4_MEASUREMENT_ID, 'step')` → `initAnalytics(OPENCAD_ANALYTICS, 'step')`. 형이 바뀌어 예전 꼴은 형 검사에서 걸립니다
3. (선택) 임베드: `consumeLaunchFiles` 옆에 `acceptEmbeddedFiles(…)`

네 앱을 옮기며 `opencad-site compare-dist`로 견주니 HTML·사이트맵·sw.js는 자산 이름·날짜·판 이름을 맞추면 0.1.6과 같고 앱 정보는 바이트까지 같았습니다.
언어 주소는 0.1.x 규칙과 520가지 주소·언어 조합으로 견줬습니다(`test/i18n-core.test.ts`). 바뀌는 동작은 iframe 안에서 통계·서비스 워커가 꺼지는 것뿐입니다.
첫 화면 스크립트는 1~2 kB(gzip) 늘고 스크립트가 바뀌므로 내용 수정일은 올립니다.

방문 통계의 `page_location`은 `/opencad-step/de/`처럼 앱의 실제 언어별 정식 주소를 보존하고, `page_language`는 `ko`·`en`·`ja`·`zh-CN`·`de` 중 하나로 기록합니다. 페이지 조회와 파일 열기·내보내기 이벤트에 같은 언어 문맥을 사용합니다. 기존 앱이 URL 갱신 뒤 보내는 `languagechange` 이벤트도 캡처해 언어를 전환할 때 새 조회를 한 번 기록합니다. 알려진 언어 진입 주소만 허용하며 파일명·임의 하위 경로·파일 URL·fragment를 보내지 않습니다. 허용된 캠페인 값은 기존처럼 분석 동의 시에만 전송합니다. 이전 판에서 기본 주소에 합쳐진 GA 이력은 소급 복원할 수 없습니다.

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
| `opencad-site check-performance-budget <폴더> [예산.json]` | 후보 가운데값(`comparison.json`)이 예산(기본 `tools/performance-budget.json` — `{ budget: { performance: { min }, fcp: { max }, … } }`)을 넘는지. 표를 찍고 넘으면 1로 끝납니다 |

## 판 올리기

- 판은 `package.json`의 `version`과 같은 이름의 태그(`v0.1.0`)로 냅니다. 앱은 태그로 고정해 씁니다(`#v0.1.0`). 태그를 옮기거나 다시 쓰지 않습니다.
- 앱 출력을 바꾸지 않는 고침은 끝자리(`v0.1.1`), 선택 필드·새 내보내기를 더하는 것은 가운데 자리(`v0.2.0`)를 올립니다.
  앱이 설정이나 가져오는 경로를 바꿔야 하는 변경도 0.x 동안은 가운데 자리를 올리고, README에 옮기는 법을 적습니다.
- 같은 입력에서 앱 출력(HTML·앱 정보·사이트맵·sw.js·번역)을 바꾸는 변경은 확인된 버그를 고칠 때만 하고, 판 설명에 앱마다 무엇이 바뀌는지 적습니다.
  앱은 판을 올릴 때 전·후 빌드를 `opencad-site compare-dist`로 견줍니다.
- 태그를 올린 뒤 각 앱의 `package.json`을 새 태그로 바꾸고 `npm install`로 잠금 파일을 갱신합니다.
- 요소 스크립트(`embed/opencad-embed.js`)가 바뀐 판이면, 판을 내는 PR에서 README·`docs/EMBED*.md`의 CDN 주소·npm 태그를 새 판으로 바꾸고
  `integrity`는 `npm run embed:snippet`이 찍는 값으로 바꿉니다. 주소·태그가 판 하나를 가리키지 않거나 무결성 값이 그 판의 파일과 다르면
  `test/embed-docs.test.ts`가 실패합니다. 다른 사이트는 안내를 그대로 복사해 쓰므로, 값이 어긋나면 브라우저가 스크립트를 막습니다.

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

## 적용한 앱

| 앱 | 적용한 판 | PR |
|---|---|---|
| [opencad-nc](https://github.com/GyuTae-Kim/opencad-nc) | v0.1.1 | #17 |
| [opencad-step](https://github.com/GyuTae-Kim/opencad-step) | v0.1.2 | #18 |
| [opencad-skp](https://github.com/GyuTae-Kim/opencad-skp) | v0.1.3 | #21 |
| [opencad-dwgdxf](https://github.com/GyuTae-Kim/opencad-dwgdxf) | v0.1.3 | #28 |

0.2.0(설정 분리·임베드) 적용 PR: opencad-step #114 · opencad-skp #115 · opencad-nc #106 · opencad-dwgdxf #176.

단계마다의 빌드 결과 비교와 바뀐 동작은 [docs/ADOPTION.md](docs/ADOPTION.md)의 "적용 기록"에 있습니다. 앱이 새 판으로 올릴 때는 이 표도 고칩니다.

## 남은 일

- 서비스 워커 본문과 최근 문서 저장소(앱의 `recent.ts`)는 앱마다 꼴이 달라 아직 앱에 있습니다. 같은 꼴로 모으면 워커 틀도 이 도구로 옮깁니다
- 서비스 워커 판 이름 짓기·미리 담을 목록 차례는 앱마다 예전 방식을 설정으로 남겼습니다(기본값으로 바꾸면 사용자 브라우저가 한 번 새 판으로 받습니다)
- 새 OpenCAD 앱을 더하면 `presets/opencad.mjs`(언어 주소 규칙·통계 공개 경로)와 `embed/opencad-embed.js`의 `APPS`를 고칩니다
- 언어(다섯 가지)는 아직 코드에 정해져 있습니다

## 내력

네 앱 저장소의 `tools/`·`site/`·`src/app/` 사이트 계층 파일을 합쳤습니다(기준 커밋: opencad-step `4d3dd50`, opencad-skp `424a666`,
opencad-nc `eb2bd8c`, opencad-dwgdxf `eea2fcf`). 갈래마다 고친 쪽을 따랐습니다(여러 줄·이은 문장 번역, 화면 글 값 옮기기,
첫 설치 때 다시 읽지 않기 등 — [docs/ADOPTION.md](docs/ADOPTION.md)의 "합치면서 바뀌는 동작").

## 기여·보안

- 판마다 바뀐 점: [CHANGELOG.md](CHANGELOG.md)
- 버그 신고·PR 안내: [CONTRIBUTING.md](CONTRIBUTING.md)(한국어·영어)
- 보안 문제는 공개 이슈 대신 [SECURITY.md](SECURITY.md)의 비공개 신고로 알려 주십시오

## 라이선스

MIT

앱이 언어별로 생성하는 탭 제목에는 `translate="no"`를 지정합니다. 앱 생성 제목과 그 안의 원본 파일명을 번역 대상에서 제외하도록 표시하며, SEO·i18n 검사가 이 속성을 확인합니다. 번역기의 속성 준수 여부와 사용자 브라우저 설정에 따라 본문·언어 속성의 표시가 달라질 수 있습니다.
