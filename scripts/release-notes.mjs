#!/usr/bin/env node
/**
 * GitHub 릴리스 본문을 CHANGELOG.md의 그 판 절에서 만든다.
 *
 *   npm run -s release:notes -- v0.3.1 > .runtime/notes.md
 *   gh release create v0.3.1 --verify-tag --title "$(npm run -s release:notes -- v0.3.1 --title)" --notes-file .runtime/notes.md
 *
 * - 본문: CHANGELOG의 "## [X.Y.Z] - 날짜" 절. 상대 링크는 그 태그의 GitHub 주소로, "###" 제목은 "##"로 올린다
 * - 설치: 그 태그에 요소 스크립트가 있으면 integrity를 붙인 <script> 줄과 npm 줄, 없으면 npm 줄
 * - 끝: 바로 앞 판과의 비교 링크(첫 판은 코드 링크)
 * - --title: 태그 주석의 첫 줄(예: "v0.3.1 — …")
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = 'https://github.com/GyuTae-Kim/opencad-site-kit';
const EMBED = 'embed/opencad-embed.js';

/** CHANGELOG의 판 절 목록(새 판부터) */
export function changelogSections(text) {
  const heads = [...text.matchAll(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})\n/gm)];
  const refs = text.search(/^\[\d+\.\d+\.\d+\]: /m);
  return heads.map((head, i) => ({
    version: head[1],
    date: head[2],
    body: text.slice(head.index + head[0].length, i + 1 < heads.length ? heads[i + 1].index : refs < 0 ? text.length : refs).trim(),
  }));
}

/** npm 레지스트리에 올린 첫 판(그 전 판은 GitHub 태그로만 받는다) */
export const NPM_SINCE = '0.3.3';
const onRegistry = (version) => version.localeCompare(NPM_SINCE, 'en', { numeric: true }) >= 0;

/** 릴리스 본문. embedSri: 그 태그의 요소 스크립트 sha384(없으면 null) */
export function releaseNotes(sections, version, embedSri) {
  const at = sections.findIndex((section) => section.version === version);
  if (at < 0) throw new Error(`CHANGELOG.md에 [${version}] 절이 없습니다`);
  const tag = `v${version}`;
  const previous = sections[at + 1]?.version;
  const body = sections[at].body
    .replace(/\]\((?!https?:|#)([^)]+)\)/g, (_, path) => `](${REPO}/blob/${tag}/${path})`)
    .replace(/^### /gm, '## ');
  const npm = `"opencad-site-kit@github:GyuTae-Kim/opencad-site-kit#${tag}"`;
  const install = embedSri
    ? [
        '## 설치',
        `다른 웹페이지에 넣기([안내](${REPO}/blob/${tag}/docs/EMBED.md) · [English](${REPO}/blob/${tag}/docs/EMBED.en.md)):`,
        ['```html', '<script type="module"', `  src="https://cdn.jsdelivr.net/gh/GyuTae-Kim/opencad-site-kit@${tag}/${EMBED}"`, `  integrity="${embedSri}"`, '  crossorigin="anonymous"></script>', '```'].join('\n'),
        onRegistry(version) ? 'npm:' : 'npm(GitHub 태그):',
        ['```bash', ...(onRegistry(version) ? [`npm install opencad-site-kit@${version}`, '# 또는 GitHub 태그'] : []), `npm install ${npm}`, '```'].join('\n'),
      ]
    : ['## 설치', ['```bash', `npm install -D ${npm}`, '```'].join('\n')];
  const compare = previous ? `**전체 변경**: ${REPO}/compare/v${previous}...${tag}` : `**전체 코드**: ${REPO}/tree/${tag}`;
  return [body, ...install, compare].join('\n\n') + '\n';
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  const tag = args.find((arg) => /^v\d+\.\d+\.\d+$/.test(arg));
  if (!tag) {
    console.error('쓰기: npm run -s release:notes -- vX.Y.Z [--title]');
    process.exit(2);
  }
  const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8' });
  if (args.includes('--title')) {
    process.stdout.write(git('tag', '-l', '--format=%(contents:subject)', tag).trim() + '\n');
    return;
  }
  let sri = null;
  try {
    const file = execFileSync('git', ['show', `${tag}:${EMBED}`], { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
    sri = `sha384-${createHash('sha384').update(file).digest('base64')}`;
  } catch {
    sri = null;
  }
  process.stdout.write(releaseNotes(changelogSections(readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8')), tag.slice(1), sri));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
