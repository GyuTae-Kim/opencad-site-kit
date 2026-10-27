/** 시험용 합성 앱: 사이트 계층만 갖춘 작은 앱을 .runtime/tmp 아래에 만들고 Vite로 빌드한다(실제 앱 파일은 쓰지 않는다). */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, type Plugin } from 'vite';

export const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const metadata = {
  title: 'OpenCAD 시험 뷰어 | 합성 앱',
  description: '시험용 합성 앱입니다. 파일은 브라우저에서 처리합니다.',
  url: 'https://gyutae-kim.github.io/opencad-step/',
  siteName: 'OpenCAD 시험 뷰어',
  language: 'ko',
  locale: 'ko_KR',
  image: { url: 'https://gyutae-kim.github.io/opencad-step/og-opencad.jpg', type: 'image/jpeg', width: 1200, height: 630, alt: '시험 화면' },
  author: { '@type': 'Person', name: 'OpenCAD', url: 'https://gyutae-kim.github.io/' },
  application: { name: 'OpenCAD 시험 뷰어', applicationCategory: 'DesignApplication', isAccessibleForFree: true },
  breadcrumbs: [
    { '@type': 'ListItem', position: 1, name: 'OpenCAD', item: 'https://gyutae-kim.github.io/opencad' },
    { '@type': 'ListItem', position: 2, name: 'OpenCAD 시험 뷰어', item: 'https://gyutae-kim.github.io/opencad-step/' },
  ],
};

const words: Record<string, Record<string, string>> = {
  'OpenCAD 시험 뷰어 | 합성 앱': { en: 'OpenCAD Test Viewer | Synthetic App', ja: 'OpenCAD テストビューア | 合成アプリ', 'zh-CN': 'OpenCAD 测试查看器 | 合成应用', de: 'OpenCAD Testbetrachter | Synthetische App' },
  '시험용 합성 앱입니다. 파일은 브라우저에서 처리합니다.': { en: 'A synthetic test app. Files stay in the browser.', ja: 'テスト用の合成アプリです。ファイルはブラウザーで処理します。', 'zh-CN': '测试用合成应用。文件在浏览器中处理。', de: 'Eine synthetische Test-App. Dateien bleiben im Browser.' },
  'OpenCAD 시험 뷰어': { en: 'OpenCAD Test Viewer', ja: 'OpenCAD テストビューア', 'zh-CN': 'OpenCAD 测试查看器', de: 'OpenCAD Testbetrachter' },
  '시험 뷰어': { en: 'Test Viewer', ja: 'テストビューア', 'zh-CN': '测试查看器', de: 'Testbetrachter' },
  '시험 화면': { en: 'Test screen', ja: 'テスト画面', 'zh-CN': '测试画面', de: 'Testbildschirm' },
  '시험용 앱 정보 설명': { en: 'Test app manifest description', ja: 'テスト用アプリ情報の説明', 'zh-CN': '测试应用信息说明', de: 'Beschreibung der Test-App' },
  '이 앱은 합성 시험 앱입니다.': { en: 'This app is a synthetic test app.', ja: 'このアプリは合成テストアプリです。', 'zh-CN': '此应用是合成测试应用。', de: 'Diese App ist eine synthetische Test-App.' },
  '소스 코드': { en: 'Source code', ja: 'ソースコード', 'zh-CN': '源代码', de: 'Quellcode' },
  '열기': { en: 'Open', ja: '開く', 'zh-CN': '打开', de: 'Öffnen' },
  '닫기': { en: 'Close', ja: '閉じる', 'zh-CN': '关闭', de: 'Schließen' },
  '면 {0}': { en: 'Face {0}', ja: '面 {0}', 'zh-CN': '面 {0}', de: 'Fläche {0}' },
  '넓이 {0}': { en: 'Area {0}', ja: '面積 {0}', 'zh-CN': '面积 {0}', de: 'Fläche {0}' },
  '태그 {0}': { en: 'Tag {0}', ja: 'タグ {0}', 'zh-CN': '标签 {0}', de: 'Tag {0}' },
  '그림을 저장하지 못했습니다: {0}': { en: 'Could not save the image: {0}', ja: '画像を保存できませんでした: {0}', 'zh-CN': '无法保存图片：{0}', de: 'Bild konnte nicht gespeichert werden: {0}' },
  '최근 문서에서 지우기: {0}': { en: 'Remove from recent documents: {0}', ja: '最近の文書から削除: {0}', 'zh-CN': '从最近文档中删除：{0}', de: 'Aus zuletzt verwendeten entfernen: {0}' },
  '{0} 열기': { en: 'Open {0}', ja: '{0}を開く', 'zh-CN': '打开{0}', de: '{0} öffnen' },
  '도면': { en: 'Drawing', ja: '図面', 'zh-CN': '图纸', de: 'Zeichnung' },
};
export const catalogFor = (language: string): Record<string, string> => Object.fromEntries(Object.entries(words).map(([key, value]) => [key, value[language]!]));

export const manifest = {
  name: 'OpenCAD 시험 뷰어', short_name: '시험 뷰어', description: '시험용 앱 정보 설명', lang: 'ko', dir: 'ltr', start_url: './', scope: './', display: 'standalone',
  theme_color: '#232830', background_color: '#232830',
  icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }],
  share_target: { action: './share-target', method: 'POST', enctype: 'multipart/form-data', params: { files: [{ name: 'file', accept: ['.tst'] }] } },
  file_handlers: [{ action: './', accept: { 'application/octet-stream': ['.tst'] } }],
};

export const indexHtml = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <!-- site-metadata -->
    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
    <link rel="manifest" href="./manifest.webmanifest" />
    <link rel="apple-touch-icon" href="./apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-title" content="시험 뷰어" />
  </head>
  <body>
    <div id="app">
      <main class="intro">
        <h1>OpenCAD 시험 뷰어</h1>
        <p>이 앱은 합성 시험 앱입니다.</p>
        <p><a href="https://gyutae-kim.github.io/opencad">OpenCAD</a> · <a href="https://github.com/GyuTae-Kim/opencad-step" title="소스 코드">GitHub</a></p>
      </main>
    </div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`;

export const swTemplate = `'use strict';
const VERSION = '__VERSION__';
const STATIC = '__STATIC__';
const PRECACHE = __PRECACHE__;
const ASSETS = __ASSETS__;
self.addEventListener('install', () => {});
`;

/** 합성 앱 폴더를 만든다. linkKit이면 node_modules/opencad-site-kit을 이 저장소로 잇는다(앱이 의존으로 설치한 모양) */
export function createFixtureApp(name: string, { linkKit = true }: { linkKit?: boolean } = {}): string {
  const base = join(kitRoot, '.runtime', 'tmp');
  mkdirSync(base, { recursive: true });
  const dir = mkdtempSync(join(base, name + '-'));
  const write = (path: string, content: string | Uint8Array) => { mkdirSync(dirname(join(dir, path)), { recursive: true }); writeFileSync(join(dir, path), content); };
  write('index.html', indexHtml);
  // 앱 코드 대신: 공용 번역기를 앱처럼(site/i18n-core.mjs 거쳐) 가져와 쓴다
  write('src/main.js', "import { translate } from '../site/i18n-core.mjs';\ndocument.title = translate(document.title, 'en');\n");
  write('public/manifest.webmanifest', JSON.stringify(manifest, null, 2) + '\n');
  write('public/icon-192.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]));
  write('public/apple-touch-icon.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 4, 5, 6]));
  write('public/favicon.svg', '<svg xmlns="http://www.w3.org/2000/svg"/>');
  write('public/og-opencad.jpg', new Uint8Array([0xff, 0xd8, 0xff, 7]));
  write('site/metadata.json', JSON.stringify(metadata, null, 2) + '\n');
  write('site/content-history.json', JSON.stringify({ lastmod: '2026-01-01T00:00:00Z', fingerprint: 'unset' }, null, 2) + '\n');
  for (const language of ['en', 'ja', 'zh-CN', 'de']) write(`site/locales/${language}.json`, JSON.stringify(catalogFor(language), null, 2) + '\n');
  write('site/i18n-core.mjs', "import metadata from './metadata.json' with { type: 'json' };\nimport { configureI18n } from 'opencad-site-kit/i18n/core';\nconfigureI18n({ metadata });\nexport * from 'opencad-site-kit/i18n/core';\n");
  write('site/i18n.mjs', "import en from './locales/en.json' with { type: 'json' };\nimport ja from './locales/ja.json' with { type: 'json' };\nimport zh from './locales/zh-CN.json' with { type: 'json' };\nimport de from './locales/de.json' with { type: 'json' };\nimport { registerCatalog } from './i18n-core.mjs';\nfor (const [language,content] of Object.entries({en,ja,'zh-CN':zh,de})) registerCatalog(language,content);\nexport * from './i18n-core.mjs';\n");
  write('tools/sw-template.js', swTemplate);
  if (linkKit) { mkdirSync(join(dir, 'node_modules'), { recursive: true }); symlinkSync(kitRoot, join(dir, 'node_modules', 'opencad-site-kit'), 'dir'); }
  return dir;
}

export const removeFixtureApp = (dir: string): void => rmSync(dir, { recursive: true, force: true });

/** dir의 index.html을 plugins로 빌드한다(dir/dist) */
export async function buildFixtureApp(dir: string, plugins: Plugin[]): Promise<string> {
  const outDir = join(dir, 'dist');
  await build({ root: dir, base: './', configFile: false, logLevel: 'silent', plugins, build: { outDir, emptyOutDir: true, target: 'es2022', sourcemap: true } });
  return outDir;
}

/** 폴더 안 파일 → 바이트(/ 구분 상대 경로) */
export function readTree(root: string): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const walk = (path: string) => {
    for (const name of readdirSync(path)) {
      const full = join(path, name);
      if (statSync(full).isDirectory()) walk(full);
      else out.set(relative(root, full).split(sep).join('/'), readFileSync(full));
    }
  };
  walk(root);
  return out;
}
