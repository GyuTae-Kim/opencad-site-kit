import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { kitRoot } from './fixture';

mkdirSync(join(kitRoot, '.runtime'), { recursive: true });
const root = mkdtempSync(join(kitRoot, '.runtime', 'perf-'));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const cli = (...args: string[]) => spawnSync(process.execPath, [join(kitRoot, 'bin/opencad-site.mjs'), ...args], { cwd: root, encoding: 'utf8' });
const report = (score: number, fcp: number, js: number) => ({
  categories: { performance: { score }, accessibility: { score: 1 }, seo: { score: 1 } },
  audits: { 'first-contentful-paint': { numericValue: fcp }, 'largest-contentful-paint': { numericValue: fcp + 200 }, 'total-blocking-time': { numericValue: 10 },
    'cumulative-layout-shift': { numericValue: 0 }, 'network-requests': { details: { items: [{ resourceType: 'Script', transferSize: js }, { resourceType: 'Image', transferSize: 999 }] } } },
});

describe('mobile performance commands', () => {
  it('writes the median table of three cold loads per build, then checks the candidate against a budget', () => {
    const dir = join(root, 'performance');
    mkdirSync(dir);
    [[0.9, 1500, 100_000], [0.99, 1400, 100_000], [0.95, 1600, 100_000]].forEach(([s, f, j], i) => writeFileSync(join(dir, `baseline-${i + 1}.report.json`), JSON.stringify(report(s!, f!, j!))));
    [[0.97, 1700, 120_000], [0.92, 1650, 120_000], [0.99, 1800, 120_000]].forEach(([s, f, j], i) => writeFileSync(join(dir, `candidate-${i + 1}.report.json`), JSON.stringify(report(s!, f!, j!))));
    const summary = cli('performance-summary', 'performance');
    expect(summary.status, summary.stderr).toBe(0);
    expect(summary.stdout).toContain('|candidate|97|100|100|1700|1900|10|0.000|117.2|');
    expect(JSON.parse(readFileSync(join(dir, 'comparison.json'), 'utf8')).baseline.median.performance).toBe(95);
    mkdirSync(join(root, 'tools'));
    writeFileSync(join(root, 'tools/performance-budget.json'), JSON.stringify({ budget: { performance: { min: 90 }, fcp: { max: 2000 }, jsBytes: { max: 125_000 } } }));
    const ok = cli('check-performance-budget', 'performance');
    expect(ok.status, ok.stderr).toBe(0);
    expect(ok.stdout).toContain('|jsBytes|117.2 KiB|<= 122.1 KiB|ok|');
    writeFileSync(join(root, 'tight.json'), JSON.stringify({ budget: { performance: { min: 98 }, fcp: { max: 1000 } } }));
    const over = cli('check-performance-budget', 'performance', 'tight.json');
    expect(over.status).toBe(1);
    expect(over.stdout).toContain('|performance|97|>= 98|OVER BUDGET|');
    expect(over.stderr).toContain('2 mobile performance budget item(s) failed; see tight.json.');
    writeFileSync(join(root, 'missing.json'), JSON.stringify({ budget: { inp: { max: 200 } } }));
    expect(cli('check-performance-budget', 'performance', 'missing.json').stderr).toContain('comparison.json has no candidate median for inp');
  });
});
