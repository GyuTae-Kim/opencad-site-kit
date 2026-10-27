import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/**
 * 오프라인용 서비스 워커(dist/sw.js)를 빌드 끝(closeBundle — 언어 페이지까지 다 쓴 뒤)에 만든다.
 * 이 도구는 dist의 파일을 훑어 미리 담을 목록과 판 이름(내용 지문)을 정하고, 워커 본문은 앱이 준다(source):
 * 최근 문서 저장소 꼴·공유 받기 흐름이 앱마다 달라서다. 판 이름은 미리 담는 파일 이름·내용의 지문이라
 * 내용이 같으면 판도 같아 브라우저가 새 판으로 보지 않는다.
 */

/** 기본으로 미리 담지 않을 파일: 소스 맵·서비스 워커 자신·사이트맵·robots.txt·.nojekyll·공유 그림 */
export function defaultPrecacheable(path) {
  return !/\.map$/.test(path) && !/(^|\/)(sw\.js|sitemap\.xml|robots\.txt|\.nojekyll|og-opencad\.jpg)$/.test(path);
}

/** dist 아래 파일 목록(/ 구분 상대 경로, 정렬) */
export function listFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(relative(root, p).split(sep).join('/'));
    }
  };
  walk(root);
  return out.sort();
}

/** 파일 경로 → 미리 담을 주소(앱 뿌리 기준 상대). index.html은 그 디렉터리 주소('./', 'en/')로 — 탐색 요청과 같은 열쇠 */
export const pageUrl = (file) => (file === 'index.html' ? './' : file.endsWith('/index.html') ? file.slice(0, -'index.html'.length) : file);

/**
 * 판 이름 짓기(지문) 방식. 앱이 예전에 쓰던 판 이름을 그대로 두려고 고를 수 있게 했다(바꾸면 한 번 새 판으로 본다).
 * - length: 지문 앞 몇 자리(기본 16)
 * - key: 지문에 넣는 이름 — 'file'(dist 경로, 기본) 또는 'url'(미리 담을 주소)
 * - separator: 이름과 내용 사이(기본 '\0'), terminator: 내용 뒤(기본 '\0')
 */
export const DEFAULT_VERSION = Object.freeze({ length: 16, key: 'file', separator: '\0', terminator: '\0' });

/** entries: { file, url } 차례대로, read(file) → 내용 */
export function fingerprint(entries, read, scheme = DEFAULT_VERSION) {
  const { length, key, separator, terminator } = { ...DEFAULT_VERSION, ...scheme };
  const h = createHash('sha256');
  for (const entry of entries) {
    h.update(key === 'url' ? entry.url : entry.file);
    if (separator) h.update(separator);
    h.update(read(entry.file));
    if (terminator) h.update(terminator);
  }
  return h.digest('hex').slice(0, length);
}

/**
 * 빌드 결과(bundle)에서 "쓸 때만 받는" 덩어리 이름(assets/…). 처음 설치 때 담지 않고 서비스 워커가 쓸 때 담는다.
 * rules: facade(입구 모듈 경로), modules(덩어리에 든 모듈 경로), assetOrigins(그림·파일의 원래 경로), assetNames(내보낸 이름) 정규식 목록
 */
export function lazyFiles(bundle, { facade = [], modules = [], assetOrigins = [], assetNames = [] } = {}) {
  const lazy = new Set();
  const any = (patterns, value) => patterns.some((pattern) => pattern.test(value));
  for (const item of Object.values(bundle)) {
    const name = item.fileName;
    if (!name.startsWith('assets/')) continue;
    if (item.type === 'chunk') {
      const ids = item.moduleIds ?? Object.keys(item.modules ?? {});
      if (any(facade, item.facadeModuleId ?? '') || ids.some((id) => any(modules, id))) lazy.add(name);
    } else {
      const origins = [...(item.originalFileNames ?? []), item.originalFileName ?? ''];
      if (origins.some((origin) => any(assetOrigins, origin)) || any(assetNames, name)) lazy.add(name);
    }
  }
  return lazy;
}

/**
 * dist 파일 목록으로 워커에 넣을 값을 정한다.
 * - precache(path, { lazy }): 처음 설치 때 담을 파일인지(기본 defaultPrecacheable)
 * - sortUrls: 미리 담을 목록을 파일 경로 차례 대신 주소 차례로
 * - staticDirs: 따로 판(staticVersion)을 매기는 큰 정적 파일 폴더(예: 'fonts/'). 처음 설치 때 담지 않고(워커가 쓸 때 담는다),
 *   바뀌지 않으면 배포가 바뀌어도 담아 둔 것을 지우지 않게
 * - lazy: 쓸 때만 받는 덩어리 이름 모음(Set)
 * serviceWorker()에 주는 설정을 그대로 넘겨도 된다(앱 시험이 tools/site.mjs의 설정을 골라 넘기지 않게): source는 쓰지 않고,
 * 규칙 꼴 lazy(lazyFiles 규칙 — 빌드 결과가 있어야 가린다)는 빈 모음으로 친다. 모음을 따로 주려면 { ...설정, lazy: 모음 }.
 * 돌려주는 값: version, staticVersion(staticDirs가 없으면 null), precache(주소 목록), assets(assets/의 스크립트·스타일 전부), files(미리 담는 파일 경로)
 */
export function serviceWorkerValues(files, read, { precache = defaultPrecacheable, lazy: lazyOption = null, sortUrls = false, staticDirs = [], version = DEFAULT_VERSION } = {}) {
  const lazy = lazyOption && typeof lazyOption.has === 'function' ? lazyOption : new Set();
  const isStatic = (file) => staticDirs.some((dir) => file.startsWith(dir));
  const entries = files.filter((file) => !isStatic(file) && precache(file, { lazy })).map((file) => ({ file, url: pageUrl(file) }));
  if (sortUrls) entries.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  const staticFiles = staticDirs.length ? files.filter(isStatic).map((file) => ({ file, url: pageUrl(file) })) : null;
  return {
    version: fingerprint(entries, read, version),
    staticVersion: staticFiles ? fingerprint(staticFiles, read, version) : null,
    precache: entries.map((entry) => entry.url),
    assets: files.filter((file) => file.startsWith('assets/') && /\.(?:m?js|css)$/.test(file)),
    files: entries.map((entry) => entry.file),
  };
}

/**
 * 자리 표시가 있는 워커 원본을 채운다: '__VERSION__'·'__STATIC__'(따옴표째 — JSON 문자열로), __PRECACHE__·__ASSETS__(JSON 배열로).
 * 자리마다 처음 하나만 바꾼다.
 */
export function fillTemplate(template, { version, staticVersion = null, precache, assets = [] }) {
  return template
    .replace("'__VERSION__'", () => JSON.stringify(version))
    .replace("'__STATIC__'", () => JSON.stringify(staticVersion))
    .replace('__PRECACHE__', () => JSON.stringify(precache))
    .replace('__ASSETS__', () => JSON.stringify(assets));
}

/** 빌드 때 template 파일(URL 또는 경로)을 읽어 채우는 source */
export const templateSource = (template) => (values) => fillTemplate(readFileSync(template, 'utf8'), values);

/**
 * Vite 플러그인(빌드만): 빌드 끝에 dist/sw.js.
 * - source(values): 워커 원본을 돌려주는 함수(필수 — templateSource(파일)도 된다). values는 serviceWorkerValues의 값
 * - precache·sortUrls·staticDirs·version: serviceWorkerValues와 같다
 * - lazy: lazyFiles의 규칙(있으면 그 덩어리를 처음 설치 때 담지 않는다 — precache가 { lazy }를 받아 거른다)
 */
export function serviceWorker({ source, lazy: lazyRules = null, ...options }) {
  if (typeof source !== 'function') throw new Error('serviceWorker: source(values) is required.');
  let root = 'dist';
  let lazy = new Set();
  return {
    name: 'opencad-service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      root = resolve(config.root, config.build.outDir);
    },
    generateBundle(_options, bundle) {
      if (lazyRules) for (const name of lazyFiles(bundle, lazyRules)) lazy.add(name);
    },
    closeBundle() {
      const values = serviceWorkerValues(listFiles(root), (file) => readFileSync(join(root, file)), { ...options, lazy });
      writeFileSync(join(root, 'sw.js'), source(values));
      lazy = new Set();
    },
  };
}
