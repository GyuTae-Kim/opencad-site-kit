/**
 * OpenCAD 사이트(gyutae-kim.github.io — 포트폴리오와 네 앱)의 설정 묶음. 공용 도구의 코드는 사이트 값을 갖지 않고 설정으로 받는다.
 * OpenCAD 앱은 이 값을 넘기고, 다른 사이트는 이 파일을 본보기로 자기 값을 만든다(README "다른 사이트에서 쓰기").
 */

export const OPENCAD_HOST = 'gyutae-kim.github.io';

/**
 * 번역기 설정(configureI18n에 metadata와 함께 넘긴다).
 * - routes.apps: 언어 페이지를 그 아래 한 단계(en/·ja/ …)로 두는 앱 뿌리. 서로의 링크도 언어 주소로 바꾼다
 * - routes.aliases: 옛 앱 경로 → 지금 경로(2D CAD 저장소 이름을 바꾸기 전 주소)
 * - routes.site: 언어를 뿌리 바로 아래 앞머리(/en/…)로 두는 사이트(포트폴리오)와 그 아래 언어를 붙이는 쪽들
 * - untranslated: 번역문에서 한국어 원문을 거꾸로 찾지 않을 이름
 */
export const OPENCAD_SITE = {
  routes: {
    apps: ['/opencad-dwgdxf/', '/opencad-skp/', '/opencad-step/', '/opencad-nc/'],
    aliases: { '/2dcad-viewer/': '/opencad-dwgdxf/' },
    site: { root: '/', sections: ['opencad', 'portfolio', 'research', 'contact', 'notes'] },
  },
  untranslated: ['OpenCAD', 'Sean Kim', 'GitHub'],
};

const SOURCE = /^\/GyuTae-Kim\/(?:opencad-(?:dwgdxf|nc|step|skp|viewer3d)|GyuTae-Kim.github.io)\/?$/i;

/** 방문 통계(initAnalytics에 넘긴다). 개인 GA4 계정 412270261, 속성 559257929 — 회사 속성은 쓰지 않는다 */
export const OPENCAD_ANALYTICS = {
  measurementId: 'G-51B8MJ5C4C',
  host: OPENCAD_HOST,
  consentKey: 'opencad.analytics-consent.v1',
  /** 소유자·QA 방문 표시(#ga-internal=on|off, utm_source=qa). 포트폴리오(GyuTae-Kim.github.io)와 같은 키 */
  internalKey: 'opencad.analytics-internal.v1',
  apps: {
    portfolio: { path: '/', title: '포트폴리오 | 홈', group: '포트폴리오', site: true },
    dwgdxf: { path: '/opencad-dwgdxf/', title: 'OpenCAD | DWG/DXF 캐드', group: 'OpenCAD 앱' },
    nc: { path: '/opencad-nc/', title: 'OpenCAD | NC 뷰어', group: 'OpenCAD 앱' },
    step: { path: '/opencad-step/', title: 'OpenCAD | STEP 뷰어', group: 'OpenCAD 앱' },
    skp: { path: '/opencad-skp/', title: 'OpenCAD | SKP 뷰어', group: 'OpenCAD 앱' },
  },
  /** 소스 저장소 링크(source_open)의 target_tool */
  sourceTool(url) {
    if (url.hostname !== 'github.com' || !SOURCE.test(url.pathname)) return null;
    const repo = url.pathname.split('/')[2].toLowerCase();
    return repo.startsWith('opencad-') ? repo.slice(8) : 'portfolio';
  },
};
