import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { defineSite } from './site-metadata.mjs';
import { validateDate } from './content-dates.mjs';

/** 앱 설정 확인(node:test): 한 설정이 검색·공유·앱 설명과 날짜를 모두 채우고, 내용 수정일이 지나간 UTC 시각인지 */
export function registerSeoTests({ metadata, history }) {
  const site = defineSite({ metadata, history });
  test('one configuration supplies search, sharing and application descriptions and date', () => {
    const dom = new JSDOM(`<head>${site.renderMetadata()}</head>`);
    const doc = dom.window.document;
    for (const selector of ['meta[name=description]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) assert.equal(doc.querySelector(selector).content, metadata.description);
    const app = JSON.parse(doc.querySelector('script').textContent)['@graph'][0];
    assert.equal(app.description, metadata.description); assert.equal(app.dateModified, history.lastmod);
    assert.ok(site.sitemapXml().includes(`<lastmod>${history.lastmod}</lastmod>`));
    dom.window.close();
  });
  test('the recorded content date is a past UTC time', () => {
    assert.equal(validateDate(history.lastmod), history.lastmod);
  });
}
