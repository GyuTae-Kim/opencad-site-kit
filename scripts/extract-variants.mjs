/**
 * 갈래 비교 시험(test/variants)에 쓸 앱 원본을 꺼낸다: 앱 저장소의 기준 커밋(기본 origin/main)에서 사이트 계층 파일만
 * `git show`로 읽어 .runtime/variants/<앱>/에 쓴다(앱 전체를 복사하거나 클론하지 않는다).
 *   node scripts/extract-variants.mjs [--ref origin/main] [--step <폴더>] [--skp <폴더>] [--nc <폴더>] [--dwg <폴더>]
 * 폴더를 주지 않으면 이 저장소 옆의 opencad-step·opencad-skp·opencad-nc·2dcad-viewer(없으면 opencad-dwgdxf)를 찾는다.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf('--' + name); return at < 0 ? fallback : args[at + 1]; };
const ref = option('ref', 'origin/main');
const sibling = (...names) => names.map(name => resolve(root, '..', name)).find(existsSync);
const apps = {
  step: option('step', sibling('opencad-step')),
  skp: option('skp', sibling('opencad-skp')),
  nc: option('nc', sibling('opencad-nc')),
  dwg: option('dwg', sibling('2dcad-viewer', 'opencad-dwgdxf')),
};
const WANTED = /^(?:tools\/[^/]+|site\/[^/]*\.(?:mjs|mts|json|webmanifest)|site\/locales\/[^/]+\.json|src\/extensions\.ts|src\/app\/(?:language-menu|analytics-config|analytics|pwa|i18n)\.ts|public\/manifest\.webmanifest|public\/\.nojekyll|index\.html|package\.json|vite\.config\.ts)$/;
const git = (repo, ...rest) => execFileSync('git', ['-C', repo, ...rest], { maxBuffer: 64 << 20 });
for (const [app, repo] of Object.entries(apps)) {
  if (!repo || !existsSync(repo)) { console.log(`${app}: no checkout, skipped`); continue; }
  const out = join(root, '.runtime', 'variants', app);
  rmSync(out, { recursive: true, force: true });
  const sha = git(repo, 'rev-parse', ref).toString().trim();
  const files = git(repo, 'ls-tree', '-r', '--name-only', ref).toString().split('\n').filter(file => WANTED.test(file));
  for (const file of files) {
    mkdirSync(dirname(join(out, file)), { recursive: true });
    writeFileSync(join(out, file), git(repo, 'show', `${ref}:${file}`));
  }
  writeFileSync(join(out, '.source-sha'), sha + '\n');
  console.log(`${app}: ${files.length} files from ${ref} (${sha.slice(0, 7)})`);
}
