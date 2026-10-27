import { translate } from '../i18n/core.mjs';

/** 언어 페이지의 앱 정보 경로(앱 뿌리 기준): 한국어는 manifest.webmanifest, 다른 언어는 <언어>/manifest.webmanifest */
export const manifestPath = (language = 'ko') => (language === 'ko' ? '' : language + '/') + 'manifest.webmanifest';

/**
 * 언어 페이지(<언어>/)의 앱 정보: 이름·설명을 옮기고, 시작 주소는 그 언어 페이지, 범위·아이콘은 앱 뿌리.
 * id는 두지 않는다 — 브라우저는 id를 start_url의 출처(https://gyutae-kim.github.io/)에 대고 풀므로 "./"는 사이트 뿌리가 되어
 * 다른 OpenCAD 앱·포트폴리오와 같은 앱으로 친다. 없으면 그 언어 페이지의 start_url(/opencad-step/en/ …)이 id다.
 */
export function localizeManifest(manifest, language) {
  if (language === 'ko') return manifest;
  const up = src => /^[a-z]+:|^\//i.test(src) ? src : '../' + src.replace(/^\.\//, '');
  const { id: _id, ...rest } = manifest;
  return { ...rest, name: translate(manifest.name, language), short_name: translate(manifest.short_name, language),
    description: translate(manifest.description, language), lang: language, start_url: './', scope: '../',
    icons: manifest.icons.map(icon => ({ ...icon, src: up(icon.src) })) };
}

/** 빌드가 쓰는 앱 정보 글(두 칸 들여쓰기, 끝 줄바꿈) */
export const manifestJson = manifest => JSON.stringify(manifest, null, 2) + '\n';
