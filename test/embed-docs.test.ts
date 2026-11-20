import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// 설치 안내의 CDN 주소·npm 태그·무결성 값(SRI)이 낸 판과 맞는지 본다.
// 다른 사이트는 안내를 그대로 복사해 쓰므로, 값 하나가 어긋나면 브라우저가 스크립트를 막아 그 사이트의 뷰어가 모두 멈춘다.
const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string): string => readFileSync(`${root}/${path}`, 'utf8');
const version = (JSON.parse(read('package.json')) as { version: string }).version;

/** 설치 안내가 실린 파일: README, docs의 임베드 안내(EMBED*.md), 예제, 데모 페이지, 요소 스크립트 머리말 */
const files = [
  'README.md',
  ...readdirSync(`${root}/docs`).filter((name) => /^EMBED.*\.md$/.test(name)).map((name) => `docs/${name}`),
  ...(existsSync(`${root}/examples`) ? readdirSync(`${root}/examples`).filter((name) => name.endsWith('.html')).map((name) => `examples/${name}`) : []),
  // 데모 페이지(GitHub Pages)도 안내와 같은 스크립트 줄을 쓴다
  ...(existsSync(`${root}/demo`) ? readdirSync(`${root}/demo`).filter((name) => name.endsWith('.html')).map((name) => `demo/${name}`) : []),
  'embed/opencad-embed.js',
];
const CDN = /cdn\.jsdelivr\.net\/gh\/GyuTae-Kim\/opencad-site-kit@v(\d+\.\d+\.\d+)\/embed\/opencad-embed\.js/g;
const NPM = /opencad-site-kit@github:GyuTae-Kim\/opencad-site-kit#v(\d+\.\d+\.\d+)/g;
const SRI = /integrity="(sha\d+-[A-Za-z0-9+/=]+)"/g;

const found = files.flatMap((path) => {
  const text = read(path);
  return [
    ...[...text.matchAll(CDN)].map((match) => ({ path, kind: 'cdn', value: match[1]! })),
    ...[...text.matchAll(NPM)].map((match) => ({ path, kind: 'npm', value: match[1]! })),
    ...[...text.matchAll(SRI)].map((match) => ({ path, kind: 'sri', value: match[1]! })),
  ];
});

const semver = (value: string): number[] => value.split('.').map(Number);
const notAfter = (a: string, b: string): boolean => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i]! < y[i]!;
  return true;
};

/** 그 판 태그의 요소 스크립트. 아직 태그를 달지 않은 지금 판(판을 내는 PR)이면 작업 트리의 파일 */
function embedAt(tagVersion: string): Buffer {
  try {
    return execFileSync('git', ['show', `v${tagVersion}:embed/opencad-embed.js`], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 16 << 20 });
  } catch {
    if (tagVersion === version) return readFileSync(`${root}/embed/opencad-embed.js`);
    throw new Error(`태그 v${tagVersion}을 찾지 못했습니다 — git fetch --tags 뒤 다시 돌립니다(CI는 checkout에 fetch-depth: 0)`);
  }
}

describe('embed install docs', () => {
  const versions = [...new Set(found.filter((item) => item.kind !== 'sri').map((item) => item.value))];

  it('point every CDN URL and npm tag at one released version', () => {
    expect(found.some((item) => item.path === 'README.md' && item.kind === 'cdn')).toBe(true);
    expect(versions, found.filter((item) => item.kind !== 'sri').map((item) => `${item.path} ${item.kind} v${item.value}`).join('\n')).toHaveLength(1);
    expect(notAfter(versions[0]!, version), `안내의 v${versions[0]}이 package.json의 ${version}보다 새 판입니다`).toBe(true);
  });

  it('carry the SRI hash of that version of the element script', () => {
    const hashes = found.filter((item) => item.kind === 'sri');
    expect(hashes.length).toBeGreaterThan(0);
    const expected = `sha384-${createHash('sha384').update(embedAt(versions[0]!)).digest('base64')}`;
    for (const item of hashes) expect(item.value, `${item.path}의 integrity — npm run embed:snippet 값으로 바꿉니다`).toBe(expected);
  });
});
