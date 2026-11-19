# 보안 문제 신고

> **English:** Please report vulnerabilities privately through
> [GitHub's private vulnerability reporting](https://github.com/GyuTae-Kim/opencad-site-kit/security/advisories/new).
> If that form isn't available, open an issue asking for a contact, without technical details. Only the latest release is supported.

## 신고하는 곳

[GitHub 비공개 취약점 신고](https://github.com/GyuTae-Kim/opencad-site-kit/security/advisories/new)로 알려 주십시오.
신고 내용은 관리자에게만 보입니다.
그 양식이 열리지 않으면 공개 이슈에 재현 방법이나 공격 방법은 쓰지 말고, 연락 방법만 요청해 주십시오.

## 지원하는 판

가장 최근 태그만 고칩니다(지금은 `v0.2.0`). 고친 판을 내면 [CHANGELOG.md](CHANGELOG.md)에 적습니다.

## 특히 살펴 주실 곳

- **임베드 메시지**(`embed/app.ts`, `embed/opencad-embed.js`)
  - 앱은 바로 위 부모가 보낸 글만 받고, 답은 그 글을 보낸 출처로만 보내야 합니다.
  - 요소는 앱의 출처에서 온 답만 들어야 합니다.
  - 파일 개수(32개)와 크기(1 GiB) 확인, 이름 검사를 우회하는 길이 있으면 알려 주십시오.
- **방문 통계**(`analytics/`)
  - 동의하기 전에 보내는 것이 있는지 봐 주십시오.
  - 파일 이름, 문서 제목, 정해진 언어 주소 밖의 경로가 나가는지도 봐 주십시오.
  - iframe 안에서 통계가 켜지는지도 알려 주십시오.
- **서비스 워커**(`pwa/`): 다른 출처의 응답을 담거나 내주는 길이 있으면 알려 주십시오.

CAD 파일을 읽는 코드는 각 앱 저장소에 있습니다. 파일 읽기 문제는 그 앱에 신고해 주십시오.
[opencad-step](https://github.com/GyuTae-Kim/opencad-step) · [opencad-skp](https://github.com/GyuTae-Kim/opencad-skp) ·
[opencad-nc](https://github.com/GyuTae-Kim/opencad-nc) · [opencad-dwgdxf](https://github.com/GyuTae-Kim/opencad-dwgdxf)
