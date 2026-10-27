import { readFileSync, writeFileSync } from 'node:fs';
import { updatedHistory } from './content-dates.mjs';
import { appFingerprint } from './app-fingerprint.mjs';

/**
 * 빌드한 앱의 내용 지문이 기록(historyFile, 기본 site/content-history.json)과 다르면 at(실제 내용 수정 UTC 시각)으로 날짜를 올려 쓴다.
 * 같으면 날짜를 그대로 둔다. 알림 글을 돌려준다.
 */
export function updateContentDates({ pageUrl, at, historyFile = 'site/content-history.json', root = 'dist' }) {
  if (!at) throw new Error('Provide the actual content update time: --at YYYY-MM-DDTHH:mm:ssZ');
  const history = JSON.parse(readFileSync(historyFile, 'utf8'));
  const next = updatedHistory({ '/': history }, { '/': appFingerprint(pageUrl, root) }, at)['/'];
  writeFileSync(historyFile, JSON.stringify(next, null, 2) + '\n');
  return next === history ? 'Content unchanged; lastmod retained.' : `Application content date: ${next.lastmod}. Rebuild before publishing.`;
}
