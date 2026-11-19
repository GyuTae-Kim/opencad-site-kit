import { beforeAll, describe, expect, it, vi } from 'vitest';
import { catalogFor, metadata } from './fixture';
import { OPENCAD_SITE } from '../presets/opencad.mjs';

type Core = typeof import('../i18n/core.mjs');
let core: Core;
beforeAll(async () => {
  core = await import('../i18n/core.mjs');
  core.configureI18n({ metadata, ...OPENCAD_SITE });
  for (const language of ['en', 'ja', 'zh-CN', 'de']) core.registerCatalog(language, catalogFor(language));
});

describe('site configuration', () => {
  it('asks for the site metadata before computing addresses', async () => {
    vi.resetModules();
    const fresh: Core = await import('../i18n/core.mjs');
    expect(() => fresh.currentLanguage('https://gyutae-kim.github.io/opencad-step/en/')).toThrow(/configureI18n/);
    expect(() => fresh.configureI18n({ metadata: {} as never })).toThrow(/metadata\.url/);
    fresh.configureI18n({ metadata });
    expect(fresh.currentLanguage('https://gyutae-kim.github.io/opencad-step/en/')).toBe('en');
    vi.resetModules();
  });
});

describe('language URLs', () => {
  it('reads the language from the page path or ?lang=, keeping parameters and fragments', () => {
    expect(core.currentLanguage('https://example.test/opencad-skp/ja/?sample#view')).toBe('ja');
    expect(core.currentLanguage('https://example.test/opencad-skp/?lang=de')).toBe('de');
    expect(core.currentLanguage('/en/index.html')).toBe('en');
    expect(core.currentLanguage('https://gyutae-kim.github.io/opencad-step/')).toBe('ko');
    const url = new URL(core.languageUrl('https://gyutae-kim.github.io/opencad-skp/?sample&open=a.skp#view', 'en'));
    expect(url.pathname).toBe('/opencad-skp/en/'); expect(url.searchParams.has('sample')).toBe(true);
    expect(url.searchParams.get('open')).toBe('a.skp'); expect(url.hash).toBe('#view');
  });
  it('maps the old DWG path, portfolio pages and leaves other sites alone', () => {
    expect(core.languageUrl('https://gyutae-kim.github.io/2dcad-viewer/', 'ja')).toBe('https://gyutae-kim.github.io/opencad-dwgdxf/ja/');
    expect(core.languageUrl('https://gyutae-kim.github.io/opencad', 'de')).toBe('https://gyutae-kim.github.io/de/opencad');
    expect(core.languageUrl('https://gyutae-kim.github.io/en/opencad', 'ko')).toBe('https://gyutae-kim.github.io/opencad');
    expect(core.languageUrl('https://github.com/GyuTae-Kim/opencad-step', 'en')).toBe('https://github.com/GyuTae-Kim/opencad-step');
    expect(core.languageUrl('https://gyutae-kim.github.io/other/', 'en')).toBe('https://gyutae-kim.github.io/other/');
  });
  it('translates the site metadata with language addresses', () => {
    const en = core.metadataForLanguage('en');
    expect(en.url).toBe('https://gyutae-kim.github.io/opencad-step/en/');
    expect(en.title).toBe('OpenCAD Test Viewer | Synthetic App');
    expect(en.locale).toBe('en_US');
    expect(en.breadcrumbs[1].item).toBe('https://gyutae-kim.github.io/opencad-step/en/');
    expect(core.metadataForLanguage('ko').title).toBe(metadata.title);
  });
});

describe('translate', () => {
  it('uses catalog entries and fills numbered captures verbatim', () => {
    expect(core.translate('열기', 'en')).toBe('Open');
    expect(core.translate('  열기  ', 'en')).toBe('Open');
    expect(core.translate('열기 ▾', 'en')).toBe('Open ▾');
    expect(core.translate('열기', 'ko')).toBe('열기');
    expect(core.translate('Open', 'en')).toBe('Open');
    expect(core.translate('그림을 저장하지 못했습니다: 가나.png', 'de')).toBe('Bild konnte nicht gespeichert werden: 가나.png');
    expect(core.sourceMessage('Open')).toBe('열기');
    expect(core.sourceMessage(' Close ')).toBe(' 닫기 ');
    expect(core.sourceMessage('GitHub')).toBe('GitHub');
  });
  it('translates captures only for authored UI copy (uiParameters)', () => {
    expect(core.translate('도면 열기', 'en')).toBe('Open 도면');
    expect(core.translate('도면 열기', 'en', true)).toBe('Open Drawing');
    // 같은 글이라도 uiParameters에 따라 따로 기억한다
    expect(core.translate('도면 열기', 'en')).toBe('Open 도면');
  });
  it('translates every piece of a " · "-joined sentence even when a short pattern would swallow the rest', () => {
    expect(core.translate('면 F1 · 넓이 12 m²', 'en')).toBe('Face F1 · Area 12 m²');
    expect(core.translate('면 F1 · 넓이 12 m² · 태그 벽', 'de')).toBe('Fläche F1 · Fläche 12 m² · Tag 벽');
    // 잡은 값(문서의 이름)은 그대로: 이름에 " · "가 들어도 한국어 조각이 없으면 바꾸지 않는다
    expect(core.translate('면 A · B', 'en')).toBe('Face A · B');
  });
  it('translates each line of a multi-line message even when a trailing {0} would swallow the next line', () => {
    const tip = '그림을 저장하지 못했습니다: part.png\n최근 문서에서 지우기: part.step';
    for (const language of ['en', 'ja', 'zh-CN', 'de']) expect(core.translate(tip, language), language).not.toMatch(/[가-힣]/);
    expect(core.translate(tip, 'en')).toBe('Could not save the image: part.png\nRemove from recent documents: part.step');
  });
  it('gives the same result whatever was translated before (spacing of untranslated text is kept)', () => {
    expect(core.translate('가나 ', 'en')).toBe('가나 ');
    expect(core.translate('가나', 'en')).toBe('가나');
    expect(core.translate(' 가나', 'en')).toBe(' 가나');
  });
  it('remembers multi-line and single-line text separately (same words, different line breaks)', () => {
    expect(core.translate('면 F1 넓이 2', 'ja')).toBe('面 F1 넓이 2');
    expect(core.translate('면 F1\n넓이 2', 'ja')).toBe('面 F1\n面積 2');
    expect(core.translate('면 F2\n넓이 3', 'zh-CN')).toBe('面 F2\n面积 3');
    expect(core.translate('면 F2 넓이 3', 'zh-CN')).toBe('面 F2 넓이 3');
  });
  it('translates nested data and leaves non-strings', () => {
    expect(core.translateData({ a: ['열기', 3, null], b: { c: '닫기' } }, 'en')).toEqual({ a: ['Open', 3, null], b: { c: 'Close' } });
  });
});

/** 0.1.x의 languageUrl(OpenCAD 경로가 코드에 있던 것) — 프리셋을 넘기면 같은 주소를 내야 한다 */
function legacyLanguageUrl(raw: string, language: string, siteUrl: string): string {
  const url = new URL(raw, siteUrl);
  if (url.origin !== new URL(siteUrl).origin && !['127.0.0.1', 'localhost'].includes(url.hostname)) return raw;
  const app = url.pathname.match(/^\/(2dcad-viewer|opencad-(?:dwgdxf|skp|step|nc))\/(?:en|ja|zh-CN|de)?\/?(?:index\.html)?$/);
  if (app) {
    const name = app[1] === '2dcad-viewer' ? 'opencad-dwgdxf' : app[1];
    url.pathname = '/' + name + '/' + (language === 'ko' ? '' : language + '/');
  } else if (url.pathname === '/' || /^\/(?:en|ja|zh-CN|de)(?:\/|$)/.test(url.pathname) || /^\/(?:opencad|portfolio|research|contact|notes)(?:\/|$)/.test(url.pathname)) {
    const path = url.pathname.replace(/^\/(?:en|ja|zh-CN|de)(?=\/|$)/, '') || '/';
    url.pathname = (language === 'ko' ? '' : '/' + language) + path;
  } else return raw;
  if (url.searchParams.has('lang')) url.searchParams.delete('lang');
  return url.href;
}

describe('configured routes', () => {
  const fresh = async (options: Parameters<Core['configureI18n']>[0]): Promise<Core> => {
    vi.resetModules();
    const module: Core = await import('../i18n/core.mjs');
    module.configureI18n(options);
    return module;
  };

  it('gives the same addresses as the old built-in OpenCAD rules with the preset', () => {
    const hosts = ['https://gyutae-kim.github.io', 'http://localhost:5173', 'http://127.0.0.1:4173', 'https://example.com'];
    const paths = ['/', '/en', '/en/', '/ja/index.html', '/index.html', '/opencad', '/opencad/', '/en/opencad/projects/dwg-dxf', '/de/research', '/notes/x',
      '/opencad-step/', '/opencad-step', '/opencad-step/en/', '/opencad-step/zh-CN', '/opencad-step/de/index.html', '/opencad-step//', '/opencad-skp/ja/x',
      '/2dcad-viewer/', '/2dcad-viewer/en/', '/opencad-nc/?open=a.nc', '/opencad-dwgdxf/?lang=ja#v', '/other/', '/english', '/en//x', '/opencad-viewer3d/', '/portfolio?lang=de'];
    let compared = 0;
    for (const host of hosts) for (const path of paths) for (const language of ['ko', 'en', 'ja', 'zh-CN', 'de']) {
      const raw = host + path;
      expect(core.languageUrl(raw, language), `${raw} ${language}`).toBe(legacyLanguageUrl(raw, language, metadata.url));
      compared++;
    }
    for (const raw of ['./', '../opencad', '?lang=ja', '#x', 'en/', 'https://github.com/GyuTae-Kim/opencad-step'])
      for (const language of ['ko', 'de']) expect(core.languageUrl(raw, language), raw).toBe(legacyLanguageUrl(raw, language, metadata.url));
    expect(compared).toBe(520);
  });

  it('only knows its own app path without routes (and "/" on a local dev server)', async () => {
    const own = await fresh({ metadata: { url: 'https://example.com/cad/' } });
    expect(own.languageUrl('https://example.com/cad/?sample#v', 'ja')).toBe('https://example.com/cad/ja/?sample#v');
    expect(own.languageUrl('https://example.com/cad/de/', 'ko')).toBe('https://example.com/cad/');
    expect(own.languageUrl('https://example.com/', 'en')).toBe('https://example.com/');
    expect(own.languageUrl('https://example.com/opencad-step/', 'en')).toBe('https://example.com/opencad-step/');
    expect(own.languageUrl('http://localhost:5173/', 'de')).toBe('http://localhost:5173/de/');
    expect(own.languageUrl('http://localhost:5173/en/index.html', 'ko')).toBe('http://localhost:5173/');
    expect(own.sourceMessage('GitHub')).toBe('GitHub');
    vi.resetModules();
  });

  it('follows another site\'s apps, aliases and language-prefixed sections', async () => {
    const other = await fresh({
      metadata: { url: 'https://me.example/tools/viewer/' },
      routes: { apps: ['/tools/viewer/', '/tools/cad/'], aliases: { '/old-cad/': '/tools/cad/' }, site: { root: '/', sections: ['blog', 'about'] } },
      untranslated: ['My Site'],
    });
    expect(other.languageUrl('https://me.example/tools/cad/en/', 'ja')).toBe('https://me.example/tools/cad/ja/');
    expect(other.languageUrl('https://me.example/old-cad/', 'de')).toBe('https://me.example/tools/cad/de/');
    expect(other.languageUrl('https://me.example/blog/post-1', 'en')).toBe('https://me.example/en/blog/post-1');
    expect(other.languageUrl('https://me.example/en/about', 'ko')).toBe('https://me.example/about');
    expect(other.languageUrl('https://me.example/shop/', 'en')).toBe('https://me.example/shop/');
    expect(other.languageUrl('https://gyutae-kim.github.io/opencad-step/', 'en')).toBe('https://gyutae-kim.github.io/opencad-step/');
    expect(other.metadataForLanguage).toBeTypeOf('function');
    vi.resetModules();
  });

  it('puts the site root anywhere', async () => {
    const nested = await fresh({ metadata: { url: 'https://me.example/~me/cad/' }, routes: { apps: ['/~me/cad/'], site: { root: '/~me/', sections: ['notes'] } } });
    expect(nested.languageUrl('https://me.example/~me/', 'en')).toBe('https://me.example/~me/en/');
    expect(nested.languageUrl('https://me.example/~me/de/notes/a', 'ja')).toBe('https://me.example/~me/ja/notes/a');
    expect(nested.languageUrl('https://me.example/~me/en', 'ko')).toBe('https://me.example/~me/');
    expect(nested.languageUrl('https://me.example/~me/cad/zh-CN/', 'en')).toBe('https://me.example/~me/cad/en/');
    vi.resetModules();
  });

  it('keeps the routes when the same site is configured again without them (defineSite at build time)', async () => {
    const module = await fresh({ metadata, ...OPENCAD_SITE });
    module.configureI18n({ metadata });
    expect(module.languageUrl('https://gyutae-kim.github.io/2dcad-viewer/', 'en')).toBe('https://gyutae-kim.github.io/opencad-dwgdxf/en/');
    module.configureI18n({ metadata: { url: 'https://gyutae-kim.github.io/opencad-nc/' } });
    expect(module.languageUrl('https://gyutae-kim.github.io/2dcad-viewer/', 'en')).toBe('https://gyutae-kim.github.io/2dcad-viewer/');
    vi.resetModules();
  });

  it('rejects routes that are not "/"-terminated paths', async () => {
    vi.resetModules();
    const module: Core = await import('../i18n/core.mjs');
    expect(() => module.configureI18n({ metadata, routes: { apps: ['opencad-step/'] } })).toThrow(/routes\.apps/);
    expect(() => module.configureI18n({ metadata, routes: { apps: ['/a'] } })).toThrow(/routes\.apps/);
    expect(() => module.configureI18n({ metadata, routes: { aliases: { '/a/': 'b' } } })).toThrow(/routes\.aliases/);
    expect(() => module.configureI18n({ metadata, routes: { site: { root: '/', sections: ['a/b'] } } })).toThrow(/sections/);
    expect(() => module.configureI18n({ metadata, untranslated: 'x' as never })).toThrow(/untranslated/);
    vi.resetModules();
  });
});
