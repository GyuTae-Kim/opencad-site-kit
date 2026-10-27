#!/usr/bin/env node
/**
 * 앱 저장소의 npm 스크립트가 부르는 명령. 앱 뿌리(작업 폴더)에서 돌고, 앱 파일은 관례 경로에서 읽는다(바꾸려면 --옵션).
 *   opencad-site check-seo [--root dist] [--metadata site/metadata.json] [--history site/content-history.json]
 *   opencad-site check-i18n [--root dist] [--i18n site/i18n.mjs]
 *   opencad-site update-content-dates --at <YYYY-MM-DDTHH:mm:ssZ> [--root dist] [--metadata …] [--history …]
 *   opencad-site test-seo [--metadata …] [--history …]
 *   opencad-site compare-dist <전 dist> <후 dist> [--fail-on-change]   (적용 전·후 빌드 결과 견주기)
 *   opencad-site serve-performance <폴더> <포트>
 *   opencad-site performance-summary <폴더>
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [command, ...args] = process.argv.slice(2);
const option = (name, fallback) => { const at = args.indexOf('--' + name); return at < 0 ? fallback : args[at + 1]; };
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const metadataFile = () => option('metadata', 'site/metadata.json');
const historyFile = () => option('history', 'site/content-history.json');
const root = () => option('root', 'dist');

switch (command) {
  case 'check-seo': {
    const { checkSeo } = await import('../seo/check-seo.mjs');
    console.log(checkSeo({ metadata: json(metadataFile()), history: json(historyFile()), root: root() }));
    break;
  }
  case 'check-i18n': {
    // 앱의 사전 등록 모듈(사이트 정보도 맞춘다)을 먼저 읽는다
    await import(pathToFileURL(resolve(option('i18n', 'site/i18n.mjs'))).href);
    const { checkI18n } = await import('../i18n/check-i18n.mjs');
    console.log(checkI18n({ root: root() }));
    break;
  }
  case 'update-content-dates': {
    const { updateContentDates } = await import('../seo/update-content-dates.mjs');
    console.log(updateContentDates({ pageUrl: json(metadataFile()).url, at: option('at'), historyFile: historyFile(), root: root() }));
    break;
  }
  case 'test-seo': {
    const { registerSeoTests } = await import('../seo/seo-test.mjs');
    registerSeoTests({ metadata: json(metadataFile()), history: json(historyFile()) });
    break;
  }
  case 'compare-dist': {
    const { compareDist, formatComparison } = await import('../seo/compare-dist.mjs');
    const [before, after] = args.filter((arg) => !arg.startsWith('--'));
    if (!before || !after) throw new Error('Usage: opencad-site compare-dist <before dist> <after dist> [--fail-on-change]');
    const rows = compareDist(before, after);
    console.log(formatComparison(rows));
    if (args.includes('--fail-on-change') && rows.some((row) => !['same', 'same-but-asset-names'].includes(row.status))) process.exit(1);
    break;
  }
  case 'serve-performance':
  case 'performance-summary':
    // 원래 스크립트는 process.argv[2]부터 인자를 읽는다
    process.argv.splice(2, 1);
    await import(`../perf/${command}.mjs`);
    break;
  default:
    console.error('Usage: opencad-site <check-seo|check-i18n|update-content-dates|test-seo|compare-dist|serve-performance|performance-summary> [options]');
    process.exit(command ? 1 : 0);
}
