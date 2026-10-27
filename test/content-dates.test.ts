import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appFingerprint } from '../seo/app-fingerprint.mjs';
import { assertContentDate, contentFingerprint, updatedHistory, validateDate } from '../seo/content-dates.mjs';
import { kitRoot } from './fixture';

const page = (body: string, date = '2026-01-01') => `<html><head><title>T</title><meta name="description" content="d"><script type="application/ld+json">{"@type":"WebApplication","dateModified":"${date}"}</script></head><body><main>${body}</main><script>var x=${Math.random()}</script></body></html>`;

describe('content dates', () => {
  it('unchanged rebuilds preserve dates; changed app assets require an explicit later date', () => {
    const old = { '/': { lastmod: '2026-01-01T00:00:00Z', fingerprint: 'a' } };
    expect(updatedHistory(old, { '/': 'a' }, '2026-02-01T00:00:00Z')).toEqual(old);
    expect(updatedHistory(old, { '/': 'b' }, '2026-02-01T00:00:00Z')['/']!.lastmod).toBe('2026-02-01T00:00:00Z');
    expect(() => updatedHistory(old, { '/': 'b' }, '2026-01-01T00:00:00Z')).toThrow(/later/);
    expect(() => validateDate('2999-01-01T00:00:00Z')).toThrow(/future/);
    expect(() => validateDate('2026-02-30T00:00:00Z')).toThrow();
    expect(() => validateDate('2026-02-01T00:00:00.000Z')).toThrow();
    expect(validateDate('2026-02-01T00:00:00Z')).toBe('2026-02-01T00:00:00Z');
  });

  it('the page fingerprint ignores dates, scripts and whitespace, but not the visible content', () => {
    const bytes = () => '';
    expect(contentFingerprint(page('<p>a  b</p>'), bytes)).toBe(contentFingerprint(page('<p>a b</p>', '2026-05-05'), bytes));
    expect(contentFingerprint(page('<p>a b</p>'), bytes)).not.toBe(contentFingerprint(page('<p>a c</p>'), bytes));
  });

  it('application and sharing-image changes invalidate dates, while identical content keeps the date', () => {
    mkdirSync(join(kitRoot, '.runtime'), { recursive: true });
    const root = mkdtempSync(join(kitRoot, '.runtime', 'seo-fingerprint-'));
    const url = 'https://gyutae-kim.github.io/opencad-step/';
    try {
      mkdirSync(join(root, 'assets'));
      writeFileSync(join(root, 'index.html'), `<html><head><meta property="og:image" content="${url}og-opencad.jpg"></head><body><main><h1>Fixture app</h1></main></body></html>`);
      writeFileSync(join(root, 'og-opencad.jpg'), 'initial image');
      writeFileSync(join(root, 'assets/app.js'), 'initial app');
      writeFileSync(join(root, 'assets/app.js.map'), 'map');
      const before = appFingerprint(url, root);
      const record = { lastmod: '2026-01-01T00:00:00Z', fingerprint: before };
      assertContentDate('/', record, appFingerprint(url, root));
      writeFileSync(join(root, 'assets/app.js.map'), 'changed map');
      expect(appFingerprint(url, root)).toBe(before);
      writeFileSync(join(root, 'assets/app.js'), 'changed app');
      expect(() => assertContentDate('/', record, appFingerprint(url, root))).toThrow(/content changed/);
      writeFileSync(join(root, 'assets/app.js'), 'initial app');
      expect(appFingerprint(url, root)).toBe(before);
      writeFileSync(join(root, 'og-opencad.jpg'), 'changed image');
      expect(appFingerprint(url, root)).not.toBe(before);
      writeFileSync(join(root, 'index.html'), '<html><body><main><img src="https://elsewhere.test/a.png"><img src="/other-app/a.png"></main></body></html>');
      expect(() => appFingerprint(url, root)).toThrow(/Unexpected application asset: \/other-app\/a\.png/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
