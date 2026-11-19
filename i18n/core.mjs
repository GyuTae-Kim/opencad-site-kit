/**
 * 공용 번역기. 한국어 원문을 열쇠로 앱 사전(en·ja·zh-CN·de)에서 찾고, {0} 자리가 있는 틀은 잡은 값을 그대로 끼운다.
 * 앱은 site/i18n-core.mjs에서 configureI18n({ metadata })로 자기 사이트 정보(site/metadata.json)를 넘기고 사전은 registerCatalog로 넣는다.
 * 언어 주소를 바꿀 경로(routes)와 거꾸로 찾지 않을 이름(untranslated)도 설정으로 받는다 — OpenCAD 값은 presets/opencad.mjs.
 */
let siteMetadata = null;
let siteRoutes = null;
let routeInput = null;
let keepNames = [];
const ROOT = /^\/(?:.*\/)?$/;
function checkRoot(path, what) {
  if (typeof path !== 'string' || !ROOT.test(path)) throw new Error(`configureI18n: ${what} must be a path that starts and ends with "/": ${path}`);
  return path;
}
/**
 * 이 앱의 사이트 정보(site/metadata.json)와 주소 규칙. 주소 계산(currentLanguage·languageUrl)과 metadataForLanguage가 쓴다.
 * routes를 주지 않으면 metadata.url의 경로 하나만 앱 뿌리로 본다(언어 페이지는 그 아래 en/ …). 같은 사이트 정보로 다시 부를 때
 * (빌드의 defineSite 등) routes·untranslated를 빼면 앞서 준 것을 그대로 둔다.
 */
export function configureI18n({ metadata, routes, untranslated }) {
  if (!metadata || typeof metadata.url !== 'string') throw new Error('configureI18n: metadata.url is required.');
  const own = new URL(metadata.url).pathname;
  const again = siteMetadata?.url === metadata.url;
  const given = routes ?? (again ? routeInput : null) ?? { apps: [own] };
  untranslated ??= again ? keepNames : [];
  const apps = (given.apps ?? []).map(path => checkRoot(path, 'routes.apps'));
  const aliases = Object.entries(given.aliases ?? {}).map(([from, to]) => [checkRoot(from, 'routes.aliases'), checkRoot(to, 'routes.aliases')]);
  let site = null;
  if (given.site) {
    const sections = given.site.sections ?? [];
    if (!sections.every(name => typeof name === 'string' && /^[^/?#]+$/.test(name))) throw new Error('configureI18n: routes.site.sections must be path segments.');
    site = { root: checkRoot(given.site.root ?? '/', 'routes.site.root'), sections };
  }
  if (!Array.isArray(untranslated) || !untranslated.every(name => typeof name === 'string')) throw new Error('configureI18n: untranslated must be a list of names.');
  siteMetadata = metadata;
  routeInput = given;
  siteRoutes = { apps, aliases, site };
  keepNames = untranslated.map(name => name.trim());
  reverse = null;
}
function site() {
  if (!siteMetadata) throw new Error('Call configureI18n({ metadata }) before using the site translator.');
  return siteMetadata;
}
export const languages = [
  { code: 'ko', label: '한국어', locale: 'ko_KR' }, { code: 'en', label: 'English', locale: 'en_US' },
  { code: 'ja', label: '日本語', locale: 'ja_JP' }, { code: 'zh-CN', label: '简体中文', locale: 'zh_CN' }, { code: 'de', label: 'Deutsch', locale: 'de_DE' },
];
export const catalogs = {};
export function registerCatalog(language, content) { catalogs[language] = content; patterns.delete(language); cache.clear(); reverse=null; }
export const normalize = value => value.replace(/\s+/g, ' ').trim();
const patterns = new Map(); const cache = new Map();
// A separator (" · ", " | ", " — ", a line break) inside a pattern capture: the capture holds more than one piece of a joined sentence.
const SEPARATED = /(?:^|\s)[·|—](?:\s|$)|\n/;
const hangulCount = text => (text.match(/[가-힣]/g) ?? []).length;
let reverse = null;
export function sourceMessage(value) {
  if (keepNames.includes(value.trim())) return value;
  if (!reverse) { reverse = new Map(); for (const catalog of Object.values(catalogs)) for (const [key,text] of Object.entries(catalog)) if (text) reverse.set(normalize(text),key); }
  const source = reverse.get(normalize(value));
  return source ? (value.match(/^\s*/)?.[0] ?? '') + source + (value.match(/\s*$/)?.[0] ?? '') : value;
}
/**
 * 한국어 글을 language로 옮긴다. 틀({0})이 잡은 값(문서 자료·명령 이름·측정값·파일 이름)은 그대로 끼우고,
 * uiParameters가 true면(앱이 직접 쓴 화면 글만) 잡은 값도 옮긴다.
 */
export function translate(value, language = 'ko', uiParameters = false) {
  if (language === 'ko' || typeof value !== 'string') return value;
  const key = normalize(value), catalog = catalogs[language] ?? {};
  if (catalog[key]) return catalog[key];
  if (!/[가-힣]/.test(key)) return value;
  // Remember by the exact text: line breaks (line-by-line translation below) and the surrounding spaces of an untranslated
  // piece change the result, so a normalized key would hand one text's result to another with different spacing.
  const cacheKey = (uiParameters ? 'ui:' : '') + language + ':' + value;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  if (!patterns.has(language)) patterns.set(language, Object.keys(catalog).filter(k => /\{\d+\}/.test(k)).map(k => ({
    key: k, slots: k.match(/\{\d+\}/g), anchor: k.split(/\{\d+\}/).sort((a,b)=>b.length-a.length)[0],
    expression: new RegExp('^' + k.split(/\{\d+\}/).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.*?)') + '$'),
  })).sort((a,b) => b.key.replace(/\{\d+\}/g,'').length - a.key.replace(/\{\d+\}/g,'').length));
  let result = value, joined = null;
  for (const pattern of patterns.get(language)) {
    if (pattern.anchor && !key.includes(pattern.anchor)) continue;
    const match = key.match(pattern.expression);
    if (!match) continue;
    // Captures are document data, command identifiers, measurements or file names: substitute them verbatim.
    // Only explicitly authored UI copy (uiParameters) opts into translating its parameters.
    const filled = catalog[pattern.key].replace(/\{\d+\}/g, slot => {
      const captured = match[pattern.slots.indexOf(slot) + 1];
      return uiParameters ? translate(captured, language, true) : captured;
    });
    // A capture that runs over a separator and still holds Korean words may have swallowed the rest of a joined
    // sentence ("면 {0}" for "면 · 넓이 12 m² · 태그 벽" leaves "Face · 넓이 …"): keep looking for a pattern that fits,
    // and keep this one for the end, where the piece-by-piece split below wins if it leaves less Korean.
    if (match.slice(1).some(capture => SEPARATED.test(capture) && /[가-힣]/.test(capture))) {
      joined ??= filled;
      continue;
    }
    result = filled;
    break;
  }
  const disclosure = result === value ? value.match(/^(.*?)(\s*[▾▸▴▼▶▲])$/) : null;
  if (disclosure) result=translate(disclosure[1],language,uiParameters)+disclosure[2];
  if (result === value && /[\n]| · | \| | — /.test(value)) {
    const pieces = value.split(/(\n| · | \| | — )/);
    if (pieces.length > 1) result = pieces.map(piece => /[가-힣]/.test(piece) ? translate(piece,language,uiParameters) : piece).join('');
  }
  if (joined !== null && (result === value || hangulCount(joined) <= hangulCount(result))) result = joined;
  // Several messages on separate lines (a warning tooltip listing two warnings): the key above is normalized, so a pattern
  // capture may have run across the line break unseen. Translate line by line when that leaves less Korean.
  if (/\S\s*\n\s*\S/.test(value) && hangulCount(result)) {
    const lines = value.split(/(\n)/).map(piece => /[가-힣]/.test(piece) ? translate(piece,language,uiParameters) : piece).join('');
    if (hangulCount(lines) < hangulCount(result)) result = lines;
  }
  if (cache.size > 4000) cache.clear();
  cache.set(cacheKey, result);
  return result;
}
export function currentLanguage(url) {
  const parsed = new URL(url, site().url);
  const segments = parsed.pathname.split('/').filter(s => s && s !== 'index.html');
  return languages.find(item => item.code === segments.at(-1))?.code
    ?? languages.find(item => item.code === parsed.searchParams.get('lang'))?.code ?? 'ko';
}
const LANGUAGE_SEGMENT = 'en|ja|zh-CN|de';
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 앱 뿌리(언어는 그 아래 한 단계)에 맞는 지금 경로. 이 컴퓨터(개발 서버)에서는 사이트 규칙이 없으면 "/"도 앱 뿌리로 본다 */
function appRoute(pathname, local) {
  const { apps, aliases, site } = siteRoutes;
  const roots = [...apps.map(path => [path, path]), ...aliases];
  if (local && !site && !roots.some(([path]) => path === '/')) roots.push(['/', '/']);
  for (const [path, target] of roots)
    if (new RegExp('^' + escapeRegExp(path) + '(?:' + LANGUAGE_SEGMENT + ')?\\/?(?:index\\.html)?$').test(pathname)) return target;
  return null;
}
/**
 * url의 language 쪽 주소. 설정한 앱 뿌리(routes.apps·aliases)는 뿌리/언어/, 사이트(routes.site)는 뿌리/언어/쪽 꼴로 바꾸고
 * 인자와 조각(#)은 둔다(?lang=만 뺀다). 다른 사이트와 규칙 밖의 주소는 그대로 돌려준다.
 */
export function languageUrl(raw, language = 'ko') {
  const url = new URL(raw, site().url);
  const local = ['127.0.0.1','localhost'].includes(url.hostname);
  if (url.origin !== new URL(site().url).origin && !local) return raw;
  const app = appRoute(url.pathname, local);
  const section = siteRoutes.site;
  if (app) {
    url.pathname = app + (language === 'ko' ? '' : language + '/');
  } else if (section && (url.pathname === section.root
    || new RegExp('^' + escapeRegExp(section.root) + '(?:' + [LANGUAGE_SEGMENT, ...section.sections.map(escapeRegExp)].join('|') + ')(?:\\/|$)').test(url.pathname))) {
    const rest = url.pathname.slice(section.root.length).replace(new RegExp('^(?:' + LANGUAGE_SEGMENT + ')(?:\\/|$)'), '');
    url.pathname = section.root + (language === 'ko' ? '' : language + '/') + rest;
  } else return raw;
  if (url.searchParams.has('lang')) url.searchParams.delete('lang');
  return url.href;
}
export function translateData(value, language) {
  if (typeof value === 'string') return translate(value, language);
  if (Array.isArray(value)) return value.map(item => translateData(item, language));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,translateData(item,language)]));
  return value;
}
export function metadataForLanguage(language = 'ko') {
  const metadata = site();
  const data = translateData(metadata, language);
  data.url = languageUrl(metadata.url, language);
  data.language = language;
  data.locale = languages.find(item => item.code === language).locale;
  data.author.url = languageUrl(metadata.author.url, language);
  data.breadcrumbs = data.breadcrumbs.map(item => ({...item, item: languageUrl(item.item, language)}));
  return data;
}
