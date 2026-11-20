/**
 * 설치 안내에 넣을 CDN 스크립트 줄을 무결성 값(SRI)과 함께 찍는다.
 *   npm run embed:snippet                 지금 판(package.json version)과 작업 트리의 embed/opencad-embed.js — 판을 내는 PR에서
 *   npm run embed:snippet -- --tag v0.2.0  이미 낸 태그의 파일
 * 판을 내면 README·docs/EMBED*.md의 주소와 integrity를 이 값으로 바꾼다(test/embed-docs.test.ts가 어긋나면 실패한다).
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const at = args.indexOf('--tag');
const tag = at < 0 ? `v${JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version}` : args[at + 1];
if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '')) {
  console.error('쓰기: npm run embed:snippet [-- --tag v0.2.0]');
  process.exit(2);
}
const bytes = at < 0
  ? readFileSync(resolve(root, 'embed/opencad-embed.js'))
  : execFileSync('git', ['show', `${tag}:embed/opencad-embed.js`], { cwd: root, maxBuffer: 16 << 20 });
const integrity = `sha384-${createHash('sha384').update(bytes).digest('base64')}`;
console.log(`<script type="module"
  src="https://cdn.jsdelivr.net/gh/GyuTae-Kim/opencad-site-kit@${tag}/embed/opencad-embed.js"
  integrity="${integrity}"
  crossorigin="anonymous"></script>`);
