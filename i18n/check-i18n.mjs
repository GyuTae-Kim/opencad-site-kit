import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { languages, catalogs, metadataForLanguage } from './core.mjs';

/**
 * 빌드한 다섯 언어 페이지(root, 기본 dist)와 사전을 확인한다. 앱의 사전·사이트 정보가 먼저 들어 있어야 한다(site/i18n.mjs를 가져온 뒤).
 * - 사전: 언어마다 열쇠가 같고 빈 번역이 없으며 {0} 자리가 같다
 * - 쪽: lang·제목·대표 주소, 서로 가리키는 언어 대안 여섯, 스크립트는 앱 뿌리의 assets/
 * - 홈 화면 앱 정보: 링크 하나, 앱 경로 안, 그 언어(lang)·standalone, 시작 주소·id는 그 언어 페이지, 범위는 앱 전체,
 *   share_target·file_handlers가 있으면 그 언어 페이지로, 홈 화면 이름은 앱 정보의 짧은 이름, 아이콘과 apple-touch-icon이 있다
 * - 다른 언어 페이지는 앱 정보·main 소개에 한국어가 남지 않는다
 * - dist/sw.js가 있으면 그 언어 페이지를 미리 담는다
 * 어긋나면 던지고, 통과하면 통과 글을 돌려준다.
 */
export function checkI18n({ root = 'dist' } = {}) {
  const file = (url, code) => {
    const app = metadataForLanguage('ko').url;
    assert.ok(url.startsWith(app), `${code}: outside the app ${url}`);
    return join(root, url.slice(app.length));
  };
  const swPath = join(root, 'sw.js');
  const sw = existsSync(swPath) ? readFileSync(swPath, 'utf8') : null;
  const keys = Object.keys(catalogs.en).sort();
  for (const { code } of languages) {
    if (code !== 'ko') {
      const catalog = catalogs[code]; assert.deepEqual(Object.keys(catalog).sort(), keys, code);
      for (const key of keys) {
        assert.ok(catalog[key]?.trim(), `${code}: empty ${key}`);
        assert.deepEqual((catalog[key].match(/\{\d+\}/g) ?? []).sort(), (key.match(/\{\d+\}/g) ?? []).sort(), `${code}: parameters ${key}`);
      }
    }
    const raw = readFileSync(join(root, code === 'ko' ? '' : code, 'index.html'), 'utf8');
    const metadata = metadataForLanguage(code); const appUrl = metadataForLanguage('ko').url;
    const dom = new JSDOM(raw, { url: metadata.url }); const doc = dom.window.document;
    assert.equal(doc.documentElement.lang, code); assert.equal(doc.title, metadata.title); assert.equal(doc.querySelector('link[rel=canonical]').href, metadata.url);
    assert.equal(doc.querySelector('title').getAttribute('translate'), 'no', `${code}: app-localized title must be protected from browser translation`);
    assert.equal(doc.querySelectorAll('link[rel=alternate][hreflang]').length, 6);
    for (const item of languages) assert.equal(doc.querySelector(`link[hreflang="${item.code}"]`).href, metadataForLanguage(item.code).url);
    for (const script of doc.querySelectorAll('script[src]')) assert.equal(new URL(script.src).pathname.includes(`/${code}/assets/`), false, 'nested language assets must resolve to application root');
    // 홈 화면에 추가: 언어 페이지마다 그 언어로 그 페이지에서 열리고(start_url·id), 범위는 앱 전체, 아이콘이 있는 앱 정보
    const links = doc.querySelectorAll('link[rel=manifest]'); assert.equal(links.length, 1, `${code}: manifest link`);
    const manifestUrl = links[0].href; const manifest = JSON.parse(readFileSync(file(manifestUrl, code), 'utf8'));
    assert.equal(manifest.lang, code); assert.equal(manifest.display, 'standalone');
    const start = new URL(manifest.start_url, manifestUrl);
    assert.equal(start.href, metadata.url, `${code}: manifest start_url`);
    // 브라우저처럼 id를 푼다: start_url의 출처에 대고(없으면 start_url) — 앱 경로 밖(사이트 뿌리 등)이면 다른 앱과 겹친다
    const id = manifest.id === undefined ? start.href : new URL(manifest.id, start.origin).href;
    assert.ok(id.startsWith(appUrl), `${code}: manifest id ${id} outside the app`);
    assert.equal(id, metadata.url, `${code}: manifest id`);
    assert.equal(new URL(manifest.scope, manifestUrl).href, appUrl, `${code}: manifest scope`);
    // 공유 받기·"연결 프로그램"은 이 언어 페이지로 온다
    if (manifest.file_handlers) assert.equal(new URL(manifest.file_handlers[0]?.action ?? '', manifestUrl).href, metadata.url, `${code}: file_handlers action`);
    if (manifest.share_target) assert.equal(new URL(manifest.share_target.action ?? '', manifestUrl).href, metadata.url + 'share-target', `${code}: share_target action`);
    assert.equal(doc.querySelector('meta[name="apple-mobile-web-app-title"]')?.content, manifest.short_name, `${code}: apple-mobile-web-app-title`);
    if (code !== 'ko') assert.doesNotMatch(`${manifest.name} ${manifest.short_name} ${manifest.description}`, /[가-힣]/, `${code}: untranslated manifest`);
    for (const icon of manifest.icons) assert.ok(existsSync(file(new URL(icon.src, manifestUrl).href, code)), `${code}: icon ${icon.src}`);
    assert.ok(existsSync(file(doc.querySelector('link[rel=apple-touch-icon]').href, code)), `${code}: apple-touch-icon`);
    if (sw !== null) assert.ok(sw.includes(JSON.stringify(code === 'ko' ? './' : code + '/')), `${code}: page not precached by sw.js`);
    if (code !== 'ko') {
      const main = doc.querySelector('main'); main.querySelectorAll('[data-static-languages]').forEach(el => el.remove());
      assert.doesNotMatch(main.textContent, /[가-힣]/, `${code}: untranslated static introduction`);
    }
    dom.window.close();
  }
  return `i18n check passed: five static language pages, reciprocal alternatives, relative assets, home-screen manifests${sw === null ? '' : ', offline pages'} and ${keys.length} catalog messages.`;
}
