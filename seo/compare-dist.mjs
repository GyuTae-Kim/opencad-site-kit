import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * 두 빌드 결과(dist)를 견준다 — 이 도구를 앱에 적용하기 전·후 확인용.
 * Vite 자산 이름의 내용 지문(assets/index-AbC123_x.js의 AbC123_x)을 '#'로 바꿔 이름과 글 안의 가리킴을 맞춘 뒤 파일마다
 * 'same'(바이트까지 같음), 'same-but-asset-names'(지문만 다름), 'changed'(내용이 다름 — 처음 다른 줄), 'added'·'removed'로 나눈다.
 */
const HASHED = /(-)[A-Za-z0-9_-]{8}(\.(?:m?js|css|map|wasm|json|png|svg|jpg|webp|woff2?|ttf))\b/g;
const TEXT = /\.(?:html|m?js|css|map|json|webmanifest|xml|txt|svg)$/;
export const normalizeAssetNames = (text) => text.replace(HASHED, '$1#$2');

function files(root) {
  const out = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else { const file = relative(root, path).split(sep).join('/'); out.set(normalizeAssetNames(file), file); }
    }
  };
  walk(root);
  return out;
}

export function compareDist(before, after) {
  const left = files(before), right = files(after), rows = [];
  for (const key of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    const a = left.get(key), b = right.get(key);
    if (!a || !b) { rows.push({ file: key, status: a ? 'removed' : 'added' }); continue; }
    const x = readFileSync(join(before, a)), y = readFileSync(join(after, b));
    if (a === b && x.equals(y)) { rows.push({ file: key, status: 'same' }); continue; }
    if (TEXT.test(key)) {
      const xs = normalizeAssetNames(x.toString()), ys = normalizeAssetNames(y.toString());
      if (xs === ys) { rows.push({ file: key, status: 'same-but-asset-names' }); continue; }
      const xl = xs.split('\n'), yl = ys.split('\n');
      const line = xl.findIndex((text, i) => text !== yl[i]);
      const at = line < 0 ? xl.length : line;
      const column = [...(xl[at] ?? '')].findIndex((ch, i) => ch !== [...(yl[at] ?? '')][i]);
      const clip = (text) => (text ?? '').slice(Math.max(0, column - 60), Math.max(0, column) + 100);
      rows.push({ file: key, status: 'changed', line: at + 1, before: clip(xl[at]), after: clip(yl[at]) });
    } else if (x.equals(y)) rows.push({ file: key, status: 'same-but-asset-names' });
    else rows.push({ file: key, status: 'changed' });
  }
  return rows;
}

/** 사람이 읽는 요약(바뀐 것만 줄마다) */
export function formatComparison(rows) {
  const count = (status) => rows.filter((row) => row.status === status).length;
  const lines = [`same ${count('same')}, same but asset names ${count('same-but-asset-names')}, changed ${count('changed')}, added ${count('added')}, removed ${count('removed')}`];
  for (const row of rows) {
    if (row.status === 'same' || row.status === 'same-but-asset-names') continue;
    lines.push(`${row.status.padEnd(8)} ${row.file}${row.line ? `:${row.line}` : ''}`);
    if (row.before !== undefined) lines.push(`  before: ${row.before}`, `  after:  ${row.after}`);
  }
  return lines.join('\n');
}
