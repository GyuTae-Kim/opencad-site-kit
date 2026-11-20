# 기여하기

> **English:** Issues and pull requests are welcome in Korean or English.
> Run `npm ci`, `npm run typecheck` and `npm test` before opening a pull request.
> Bug reports about `<opencad-viewer>` are easiest to act on with the page's HTML, the browser and any console errors.
> Everyone taking part follows the [Code of Conduct](CODE_OF_CONDUCT.md).

버그 신고, 문서 고침, 임베드 개선을 반깁니다. 한국어나 영어로 쓰시면 됩니다.
참여하는 모든 분은 [행동 강령](CODE_OF_CONDUCT.md)을 따릅니다.
동작을 크게 바꾸거나 새 설정을 더하는 일이면 먼저 이슈로 의논해 주십시오.

## 개발 환경

CI와 같은 Node 22를 씁니다.

```bash
npm ci
npm run typecheck
npm test
```

`npm test`는 단위 시험, 합성 앱 빌드(Vite), `opencad-site` 명령을 돌립니다.
앱 원본과 견주는 갈래 비교 시험은 `npm run variants`로 앱 파일을 꺼냈을 때만 돕니다(README "개발").

## 바꿀 때 지켜 주실 것

- **앱 출력**: 같은 입력에서 앱의 HTML, 앱 정보, 사이트맵, `sw.js`, 번역이 달라지는 변경은 확인된 버그를 고칠 때만 합니다.
  PR에는 앱마다 무엇이 달라지는지 적습니다. 앱은 `opencad-site compare-dist`로 전후 빌드를 견줍니다.
- **요소 스크립트**: `embed/opencad-embed.js`는 다른 사이트가 그대로 가져다 쓰는 파일입니다.
  의존 없는 파일 하나로 두고, 빌드 없이 브라우저에서 바로 돌게 합니다.
  이 파일이 바뀌면 다음 판에서 CDN 주소의 무결성 값도 바뀝니다(README "판 올리기").
- **메시지 약속**: `embed/app.ts`와 `embed/opencad-embed.js` 사이의 글 모양을 바꾸면 두 파일과 `docs/EMBED.md`·`docs/EMBED.en.md`의 "약속" 표를 함께 고칩니다.
  이미 배포된 앱과 다른 사이트의 요소가 판이 엇갈려도 계속 동작하는지 PR에 적습니다.
- **사이트 값**: 통계 ID, 호스트, 경로 같은 사이트별 값은 코드에 두지 않고 설정으로 받습니다. OpenCAD의 값은 `presets/opencad.mjs`에만 둡니다.
- **시험**: 고친 동작과 새 동작에는 `test/` 아래에 시험을 더합니다.

## PR

- 제목은 이 저장소의 커밋처럼 `[<gitmoji> <동작>] 요약` 꼴로 씁니다(예: `[🐛 fix] 빈 파일 이름에서 임베드가 멈추던 것`).
- 본문에는 바꾼 것, 확인한 것(돌린 명령과 결과), 남은 위험을 적습니다.
- 판 번호와 태그는 관리자가 올립니다. PR에서 `package.json`의 `version`을 바꾸지 않아도 됩니다.

## 라이선스

보내 주신 기여는 이 저장소와 같은 [MIT 라이선스](LICENSE)로 배포됩니다.
