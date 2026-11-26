# 바뀐 점

판마다 무엇이 바뀌었는지 적습니다. 같은 내용을 [GitHub 릴리스](https://github.com/GyuTae-Kim/opencad-site-kit/releases)에도 올립니다. 판 이름은 `package.json`의 `version`과 같은 태그(`v0.4.0`)이고, 앱은 그 태그로 고정해 씁니다
(`github:GyuTae-Kim/opencad-site-kit#v0.4.0`). 판을 올리는 규칙은 [README "판 올리기"](README.md#판-올리기)에 있습니다.

## [0.4.0] - 2026-11-26

방문 통계에 선택 설정 `internalKey`와 내보내기 `internalTraffic`을 더한 판입니다([#26](https://github.com/GyuTae-Kim/opencad-site-kit/pull/26)). 앱 쪽에서 바뀌는 것은 방문 통계 코드뿐입니다.
요소 스크립트(`<opencad-viewer>`)는 0.3.3과 같아서 설치 안내의 CDN 주소(`@v0.3.3`)와 `integrity` 값은 그대로 둡니다.

### 더한 것

- 방문 통계: 소유자·검증 방문을 `traffic_type=internal`로 표시합니다(`#ga-internal=on|off`는 브라우저, `?utm_source=qa`는 탭). GA4 내부 트래픽 데이터 필터로 통계에서 뺄 수 있습니다. 설정 `internalKey`(기본 `analytics-internal.v1`)를 더했고, `OPENCAD_ANALYTICS`는 포트폴리오와 같은 `opencad.analytics-internal.v1`을 씁니다.

### 고친 것

- `package.json`의 `bin` 경로를 `bin/opencad-site.mjs`로 적었습니다. 앞의 `./` 때문에 `npm publish`가 「npm auto-corrected some errors」 경고를 냈습니다(설치된 `opencad-site` 명령은 0.3.3에서도 그대로 동작).

## [0.3.3] - 2026-11-20

npm 레지스트리에 처음 올리는 판입니다(`npm install opencad-site-kit`). 코드는 0.3.2와 같고 앱 빌드 결과도 같습니다.
요소 파일 머리말의 CDN 주소가 바뀌어 `integrity` 값이 바뀌었습니다.

### 더한 것

- npm 레지스트리에 올립니다. GitHub 태그 설치(`#v0.3.3`)도 그대로 됩니다.

### 문서

- [데모 페이지](https://gyutae-kim.github.io/opencad-site-kit/)를 더했습니다(`demo/`, GitHub Pages). 설치 안내와 같은 스크립트 줄로 예제 앱, 화면 언어, 내 파일 열기를 보여 줍니다. 판을 올리면 데모의 스크립트 줄도 시험이 함께 확인합니다.

## [0.3.2] - 2026-11-20

`<opencad-viewer>`만 고친 판입니다. 앱 빌드 결과는 0.3.1과 같고, CDN 주소(`@v0.3.2`)와 `integrity` 값이 바뀌었습니다([#21](https://github.com/GyuTae-Kim/opencad-site-kit/pull/21)).

### 고친 것

- 인라인 스타일을 막은 CSP(`style-src 'self'` 등) 페이지에서 요소의 `<style>`이 막혀, 뷰어가 300×150 크기로 작게 뜨던 문제를 고쳤습니다.
  요소는 이제 CSP에 걸리지 않는 스타일시트(`adoptedStyleSheets`)로 크기를 잡습니다. 지원하지 않는 브라우저(Safari 16.3 이하)는 전처럼 `<style>`을 씁니다.

### 문서

- 안내 문서에 「문제 해결」을 더했습니다. CSP에 넣을 값(`script-src`·`frame-src`·`connect-src`)과 증상별로 볼 곳을 담았습니다.

## [0.3.1] - 2026-11-20

`<opencad-viewer>`만 고친 판입니다. 앱 빌드 결과는 0.3.0과 같고, CDN 주소(`@v0.3.1`)와 `integrity` 값이 바뀌었습니다([#18](https://github.com/GyuTae-Kim/opencad-site-kit/pull/18)).

### 고친 것

- React 19에서 `<opencad-viewer app="step">`을 그리면 `Cannot set property app … which has only a getter` 오류로 화면이 깨지던 문제를 고쳤습니다. Vue·Svelte에서는 `app`이 경고와 함께 무시됐습니다.
  이 프레임워크들은 요소에 같은 이름의 값이 있으면 속성 대신 그 값에 넣는데, `app`이 읽기 전용이었습니다. 이제 `viewer.app = 'nc'`가 `app` 속성을 바꿉니다.
- `viewer.sample`을 더했습니다. `false`를 넣으면 속성을 지워, 프레임워크가 `sample="false"`를 남겨 예제가 열리는 일을 막습니다.

### 더한 것

- JSX 형 선언에 쓰는 `OpenCadViewerAttributes` 형을 내보냅니다.
- 안내 문서에 「프레임워크에서 쓰기」(React·Next.js·Vue·Svelte·Angular)를 더했습니다.

## [0.3.0] - 2026-11-20

다른 웹페이지에 넣는 `<opencad-viewer>`를 다듬은 판입니다. 앱이 쓰는 파일은 바뀌지 않아 앱 빌드 결과는 0.2.0과 같습니다.
요소 파일(`embed/opencad-embed.js`)이 바뀌어 CDN 주소(`@v0.3.0`)와 `integrity` 값이 바뀌었습니다. `@v0.2.0` 주소와 그 값은 그대로 쓸 수 있습니다.

### 더한 것

- `<opencad-viewer loading="lazy">`: 요소가 화면 200px 안으로 들어올 때 앱을 띄웁니다. `open()`을 부르면 바로 띄웁니다. 한 페이지에 뷰어를 여럿 넣을 때 씁니다([#14](https://github.com/GyuTae-Kim/opencad-site-kit/pull/14)).
- TypeScript에서 `opencad-ready`·`opencad-done`·`opencad-error` 이벤트의 `detail` 형이 형 변환 없이 잡힙니다(요소·`document`·`window`). 오류 코드 형 `OpenCadErrorCode`를 내보냅니다([#13](https://github.com/GyuTae-Kim/opencad-site-kit/pull/13)).
- `npm run embed:snippet`: 태그 하나를 받아 무결성 값을 붙인 `<script>` 줄을 찍습니다([#11](https://github.com/GyuTae-Kim/opencad-site-kit/pull/11)).

### 문서

- README에 「내 웹사이트에 OpenCAD 설치하기」를 더했습니다. CDN과 무결성 값, 파일 두기, npm, iframe, 앱 직접 배포의 다섯 가지 방법입니다([#9](https://github.com/GyuTae-Kim/opencad-site-kit/pull/9)).
- 영어 설치 안내 `docs/EMBED.en.md`를 더했습니다([#10](https://github.com/GyuTae-Kim/opencad-site-kit/pull/10)).
- 설치 안내의 CDN 주소와 npm 태그가 모두 같은 판인지, 무결성 값이 그 태그 파일과 맞는지 시험이 확인합니다([#11](https://github.com/GyuTae-Kim/opencad-site-kit/pull/11)).
- 변경 기록, 기여 안내, 보안 신고 안내, 이슈 틀을 더했습니다([#12](https://github.com/GyuTae-Kim/opencad-site-kit/pull/12)).

## [0.2.0] - 2026-11-19

앱이 코드를 고쳐야 하는 판입니다. 옮기는 법은 [README "0.2.0으로 옮기기"](README.md#020으로-옮기기)에 있습니다([#8](https://github.com/GyuTae-Kim/opencad-site-kit/pull/8)).

### 바뀐 것

- 사이트마다 다른 값(통계 ID, 호스트, 앱 경로, 언어 주소 규칙)을 코드에서 빼고 설정으로 받습니다.
  - 번역기: `configureI18n({ metadata, routes, untranslated })`
  - 통계: `initAnalytics(설정, 앱 이름)`
- OpenCAD의 값은 `opencad-site-kit/presets/opencad`의 `OPENCAD_ANALYTICS`와 `OPENCAD_SITE`에 모았습니다.
- 앱이 iframe 안에서 열리면 방문 통계와 서비스 워커를 켜지 않습니다.

### 더한 것

- 다른 웹페이지에 앱을 넣는 `<opencad-viewer>` 요소를 더했습니다(`embed/opencad-embed.js`). 의존이 없는 파일 하나이고 CDN이나 npm으로 씁니다.
- 앱 쪽 수신기 `acceptEmbeddedFiles`(`opencad-site-kit/embed/app`)를 더했습니다. 부모 페이지가 `postMessage`로 넘긴 파일을 엽니다.
- 안내 문서 `docs/EMBED.md`와 예제 `examples/embed.html`을 더했습니다.

## [0.1.6] - 2026-10-30

### 고친 것

- 브라우저 번역이 바꾼 탭 제목을 앱이 원문으로 받아들이던 문제를 고쳤습니다.
  - 앱이 언어별로 만드는 탭 제목에 `translate="no"`를 답니다.
  - 검색 정보 검사와 다국어 검사가 이 속성을 확인합니다([#7](https://github.com/GyuTae-Kim/opencad-site-kit/pull/7)).

## [0.1.5] - 2026-10-29

### 고친 것

- 영어·일본어·중국어(간체)·독일어 앱 방문이 방문 통계에서 한국어 주소에 합쳐지던 문제를 고쳤습니다([#6](https://github.com/GyuTae-Kim/opencad-site-kit/pull/6)).
  - 언어별 `page_location`과 `page_language`를 기록합니다.
  - 앱 안에서 언어를 바꾸면 새 조회를 한 번 기록합니다.
  - 이미 합쳐진 지난 기록은 되돌리지 못합니다.

## [0.1.4] - 2026-10-27

### 더한 것

- `serviceWorkerValues(files, read, options)`가 `serviceWorker()` 설정을 그대로 받습니다([#5](https://github.com/GyuTae-Kim/opencad-site-kit/pull/5)).

## [0.1.3] - 2026-10-27

### 더한 것

- `opencad-site check-performance-budget` 명령을 더했습니다. 휴대폰 Lighthouse 결과의 가운데값이 앱의 성능 예산을 넘으면 실패합니다([#4](https://github.com/GyuTae-Kim/opencad-site-kit/pull/4)).

## [0.1.2] - 2026-10-27

### 고친 것

- `compare-dist`가 한 줄짜리 큰 스크립트(321 KB)에서 10분이 넘도록 끝나지 않던 문제를 고쳤습니다([#3](https://github.com/GyuTae-Kim/opencad-site-kit/pull/3)).

## [0.1.1] - 2026-10-27

### 고친 것

- 서비스 워커 등록을 막은 브라우저에서 `registerServiceWorker`가 콘솔에 처리하지 않은 오류를 남기던 문제를 고쳤습니다([#2](https://github.com/GyuTae-Kim/opencad-site-kit/pull/2)).

## [0.1.0] - 2026-10-27

첫 판입니다. 네 OpenCAD 앱이 저장소마다 복사해 쓰던 사이트 계층을 한 패키지로 모았습니다([#1](https://github.com/GyuTae-Kim/opencad-site-kit/pull/1)).
다국어 페이지, 검색 정보와 사이트맵, 내용 수정일, 홈 화면 앱과 서비스 워커, 방문 통계, 성능 측정, `opencad-site` 명령이 들어 있습니다.

[0.4.0]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.3.3...v0.4.0
[0.3.3]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.6...v0.2.0
[0.1.6]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/GyuTae-Kim/opencad-site-kit/releases/tag/v0.1.0
