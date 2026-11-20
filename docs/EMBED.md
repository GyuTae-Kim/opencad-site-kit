# OpenCAD 앱을 내 웹페이지에 넣기

[English](EMBED.en.md)

OpenCAD의 네 앱(DWG·DXF 2D CAD, STEP·SketchUp·NC 3D 뷰어)을 블로그·포트폴리오·제품 소개 페이지 같은 내 페이지 안에 띄우는 방법입니다.
서버도, 빌드 도구도, 계정도 필요 없습니다.

## 바로 쓰기

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/GyuTae-Kim/opencad-site-kit@v0.3.0/embed/opencad-embed.js"></script>

<opencad-viewer src="/models/bracket.step" style="height: 520px"></opencad-viewer>
```

- 요소가 파일 확장자를 보고 앱을 고릅니다: `.dwg`·`.dxf` → DWG/DXF 캐드, `.step`·`.stp`·`.p21`·`.stpz` → STEP 뷰어, `.skp` → SKP 뷰어,
  `.nc`·`.gcode`·`.mpr`·`.pgi`·`.h` 등 → NC 뷰어
- 크기는 CSS로 정합니다(기본 높이 480px, 너비는 부모에 맞춤)
- 스크립트는 한 파일(의존 없음, MIT)이라 내 사이트에 복사해 올려도 됩니다. jsDelivr 주소의 `@v0.3.0`처럼 판을 고정해 씁니다
- `integrity`(SRI)를 붙이는 법, npm으로 받는 법, iframe만 넣는 법은 [README "내 웹사이트에 OpenCAD 설치하기"](../README.md#내-웹사이트에-opencad-설치하기)에 있습니다

방문자가 자기 파일을 열게 하려면 `src` 없이 `app`만 주거나, 파일 고르기를 이어 `open()`을 부릅니다.

```html
<input type="file" id="pick" accept=".dwg,.dxf,.step,.stp,.skp,.nc,.gcode">
<opencad-viewer id="viewer" app="dwgdxf" lang="en"></opencad-viewer>
<script type="module">
  const viewer = document.getElementById('viewer');
  document.getElementById('pick').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try { await viewer.open(file); }                      // 형식이 다르면 맞는 앱으로 바꿔 연다
    catch (error) { console.warn('열지 못함', error.message); }  // unsupported · too-large · timeout …
  });
</script>
```

## 속성·함수·이벤트

| 속성 | 뜻 |
|---|---|
| `src` | 이 페이지가 받아(fetch) 앱에 넘길 파일 주소. **이 페이지와 같은 출처이거나 CORS를 허용한 주소**여야 합니다 |
| `app` | `dwgdxf` · `step` · `skp` · `nc`. 없으면 `name`·`src`의 확장자로 고릅니다 |
| `name` | 앱에 보일 파일 이름(없으면 `src`의 마지막 조각) |
| `lang` | `ko`(기본) · `en` · `ja` · `zh-CN` · `de` — 앱 화면 언어 |
| `base` | 앱들이 있는 곳(기본 `https://gyutae-kim.github.io/`). 앱을 직접 배포했으면 그 주소 |
| `sample` | 파일 대신 그 앱의 예제를 엽니다(`app`과 함께) |
| `title` | iframe의 접근성 이름(기본 "OpenCAD STEP 뷰어" 등) |
| `loading` | `lazy`면 요소가 화면 200px 안으로 들어올 때 앱을 띄웁니다(`open()`을 부르면 바로). 한 페이지에 여럿을 넣을 때 씁니다. 0.3.0부터 |

- `viewer.open(fileOrBlob, name?)` → `Promise<void>`: 앱이 열기를 마치면 풀리고, 못 받으면 `Error(code)`로 거절됩니다
- `viewer.app`: 지금 띄운 앱 이름
- 이벤트(요소에서 올라옴): `opencad-ready`(`detail.accept` — 앱이 받는 확장자), `opencad-done`(`detail.id`), `opencad-error`(`detail.code`)

| `code` | 까닭 |
|---|---|
| `fetch-failed` | 이 페이지가 `src`를 받지 못함(주소·CORS 확인) |
| `unsupported` | 그 앱이 열지 않는 형식이거나 확장자로 앱을 고르지 못함 |
| `too-large` | 앱이 한 번에 받는 크기(1 GiB)보다 큼 |
| `timeout` | 30초 안에 앱이 답하지 않음(앱 주소·`base` 확인, 임베드를 받지 않는 옛 판). 앱이 늦게 준비되면 그 뒤 `opencad-ready`가 오고, `src` 파일은 그때 다시 받아 엽니다 — `open()`으로 넘긴 파일은 `opencad-ready` 뒤에 다시 넘깁니다 |
| `bad-request` · `open-failed` | 넘긴 자료가 잘못됐거나 앱이 열기 중에 실패 |

파일을 읽지 못한 까닭(깨진 파일 등)은 앱 화면이 알립니다. 이때도 `open()`은 풀립니다 — 앱이 열기를 마쳤다는 뜻입니다.

## 파일은 어디로 가나

1. 내 페이지가 `src`를 직접 받습니다(또는 `open()`에 넘긴 파일을 그대로 씁니다)
2. 받은 바이트를 `postMessage`로 iframe 안의 앱에 넘깁니다. 받는 쪽 출처를 앱 주소로 정해 보내고, 그 출처에서 온 답만 듣습니다
3. 앱은 받은 바이트만 브라우저 안에서 엽니다. 앱은 다른 주소를 부르지 않고(앱의 `?open=`도 같은 출처만 엽니다), 파일 내용·이름을 내 페이지 말고 어디에도 보내지 않습니다

넣은 앱(iframe 안)은 방문 통계를 켜지 않고 동의 상자도 띄우지 않으며, 서비스 워커(오프라인·새 판 알림)도 등록하지 않습니다.
최근 문서 같은 앱 저장소는 브라우저가 내 사이트 몫으로 따로 나눕니다(OpenCAD 사이트에서 연 기록과 섞이지 않습니다).

## 앱을 직접 배포해 쓰기

OpenCAD 앱 저장소는 모두 MIT입니다. 저장소를 fork해 내 GitHub Pages에 올리고 `base`를 그 주소로 줍니다.

```html
<opencad-viewer base="https://me.github.io/" src="/models/plan.dxf"></opencad-viewer>
<!-- https://me.github.io/opencad-dwgdxf/ 를 띄운다 -->
```

저장소 이름을 바꿨으면 요소의 앱 목록을 고칩니다(스크립트를 불러온 뒤, 요소를 그리기 전에).

```js
import { OpenCadViewer, APPS } from './opencad-embed.js';
OpenCadViewer.apps = { ...APPS, dwgdxf: { ...APPS.dwgdxf, path: 'my-cad/' } };
```

fork한 앱의 방문 통계·언어 주소는 `site/i18n-core.mjs`·`src/app/main.ts`의 설정을 내 값으로 바꿉니다([README "다른 사이트에서 쓰기"](../README.md#다른-사이트에서-쓰기)).
바꾸지 않아도 통계는 `gyutae-kim.github.io`에서만 켜지므로 내 사이트 방문이 OpenCAD 통계로 가지 않습니다.

## 요소 없이 iframe만 쓰기

스크립트를 쓸 수 없는 곳(일부 블로그 편집기)에서는 iframe만 넣어 앱 첫 화면을 띄울 수 있습니다. 방문자는 그 안에서 자기 파일을 엽니다.

```html
<iframe src="https://gyutae-kim.github.io/opencad-step/en/" title="OpenCAD STEP viewer" allow="fullscreen; clipboard-write" style="width:100%;height:520px;border:0"></iframe>
```

## 약속(직접 만드는 호스트 스크립트용)

모든 글은 `{ type, protocol: 1, … }` 꼴입니다. 앱 쪽 구현은 `embed/app.ts`(`acceptEmbeddedFiles`), 호스트 쪽은 `embed/opencad-embed.js`입니다.

| 방향 | `type` | 내용 |
|---|---|---|
| 앱 → 부모 | `opencad:ready` | `accept`: 받는 확장자 목록. 앱이 받을 준비가 되면 한 번(모든 출처로 — 파일·주소 없음), 부모가 `opencad:ping`을 보내면 그 출처로 다시 |
| 부모 → 앱 | `opencad:ping` | 준비됐는지 묻기 |
| 부모 → 앱 | `opencad:open` | `id`(64자 안), `files: [{ name, data }]` — `data`는 `ArrayBuffer` 또는 `Blob`, 이름에 `/`·`\` 없음, 32개·1 GiB 안 |
| 앱 → 부모 | `opencad:done` | `id` — 앱이 열기를 마침 |
| 앱 → 부모 | `opencad:error` | `id`, `code`(`bad-request` · `unsupported` · `too-large` · `open-failed`) |

앱은 바로 위 부모(`window.parent`)가 보낸 글만 받고, 답은 그 글을 보낸 출처에만 보냅니다. 받는 확장자에 맞는 파일만 앱에 넘깁니다.
