import { beforeAll, describe, expect, it, vi } from 'vitest';
import { catalogFor, metadata } from './fixture';

type Core = typeof import('../i18n/core.mjs');
let core: Core;
beforeAll(async () => {
  core = await import('../i18n/core.mjs');
  core.configureI18n({ metadata });
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
