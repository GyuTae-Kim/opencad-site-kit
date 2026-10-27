import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { contentFingerprint, digest } from './content-dates.mjs';

/**
 * 빌드한 앱(root, 기본 dist)의 내용 지문: 첫 쪽(index.html)의 내용 지문과 assets의 스크립트·스타일 지문.
 * pageUrl은 앱 주소(site/metadata.json의 url) — 그 경로 밖의 그림을 가리키면 던진다.
 */
export function appFingerprint(pageUrl, root = 'dist') {
  const base = new URL(pageUrl).pathname;
  const document = contentFingerprint(readFileSync(join(root, 'index.html'), 'utf8'), path => {
    if (!path.startsWith(base)) throw new Error('Unexpected application asset: ' + path);
    return readFileSync(join(root, path.slice(base.length)));
  }, pageUrl);
  // Include executable assets: changing a CAD command changes this application
  // even when its static introduction is unchanged. Source maps are not content.
  const assets = readdirSync(join(root, 'assets')).filter(file => /\.(?:js|mjs|css)$/.test(file)).sort()
    .map(file => [file, digest(readFileSync(join(root, 'assets', file)))]);
  return digest(JSON.stringify({ document, assets }));
}
