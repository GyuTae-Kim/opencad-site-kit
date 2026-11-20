import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error 형 선언 없는 저장소 스크립트
import { changelogSections, releaseNotes, REPO } from '../scripts/release-notes.mjs';

// GitHub 릴리스 본문은 CHANGELOG의 판 절에서 만든다(README "판 올리기"). 판마다 절이 있고, 본문의 링크가 GitHub에서 열리는지 본다.
const root = fileURLToPath(new URL('..', import.meta.url));
const changelog = readFileSync(`${root}/CHANGELOG.md`, 'utf8');
const version = (JSON.parse(readFileSync(`${root}/package.json`, 'utf8')) as { version: string }).version;
type Section = { version: string; date: string; body: string };
const sections = changelogSections(changelog) as Section[];

function tags(): string[] {
  try {
    return execFileSync('git', ['tag', '-l', 'v*'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

describe('release notes from CHANGELOG', () => {
  it('has a dated section for the current version and every tag, newest first', () => {
    const versions = sections.map((section) => section.version);
    expect(versions).toContain(version);
    for (const tag of tags()) expect(versions, `CHANGELOG.md에 [${tag.slice(1)}] 절이 없습니다`).toContain(tag.slice(1));
    const sorted = [...versions].sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
    expect(versions).toEqual(sorted);
  });

  it('turns every section into notes whose links work on GitHub', () => {
    for (const [i, section] of sections.entries()) {
      const notes: string = releaseNotes(sections, section.version, i === 0 ? 'sha384-x' : null);
      const tag = `v${section.version}`;
      // 상대 링크가 남으면 릴리스 화면에서 깨진다
      expect(notes, tag).not.toMatch(/\]\((?!https?:\/\/|#)/);
      expect(notes, tag).not.toMatch(/^### /m);
      const previous = sections[i + 1]?.version;
      expect(notes, tag).toContain(previous ? `${REPO}/compare/v${previous}...${tag}` : `${REPO}/tree/${tag}`);
      expect(notes, tag).toContain(`opencad-site-kit#${tag}"`);
    }
    const latest = releaseNotes(sections, sections[0]!.version, 'sha384-x');
    expect(latest).toContain(`opencad-site-kit@v${sections[0]!.version}/embed/opencad-embed.js`);
    expect(latest).toContain('integrity="sha384-x"');
    expect(() => releaseNotes(sections, '9.9.9', null)).toThrow(/9\.9\.9/);
  });
});
