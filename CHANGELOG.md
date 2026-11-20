# 바뀐 점

판마다 무엇이 바뀌었는지 적습니다. 판 이름은 `package.json`의 `version`과 같은 태그(`v0.2.0`)이고, 앱은 그 태그로 고정해 씁니다
(`github:GyuTae-Kim/opencad-site-kit#v0.2.0`). 판을 올리는 규칙은 [README "판 올리기"](README.md#판-올리기)에 있습니다.

## 아직 내지 않은 것

- 문서: README에 「내 웹사이트에 OpenCAD 설치하기」를 더했습니다. CDN과 무결성 값, 파일 두기, npm, iframe, 앱 직접 배포의 다섯 가지 방법입니다([#9](https://github.com/GyuTae-Kim/opencad-site-kit/pull/9))

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

[0.2.0]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.6...v0.2.0
[0.1.6]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/GyuTae-Kim/opencad-site-kit/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/GyuTae-Kim/opencad-site-kit/releases/tag/v0.1.0
