import { languages } from '../i18n/core.mjs';
import { manifestJson, manifestPath } from '../pwa/manifest.mjs';

/**
 * Vite 플러그인: 같은 설정(site)으로 개발·배포 HTML의 검색 정보, 사이트맵, 언어별 앱 정보를 만든다.
 * - index.html의 <!-- site-metadata --> 한 자리에 한국어 검색 정보를 넣는다(언어 페이지는 siteLocalization이 다시 쓴다)
 * - 빌드: sitemap.xml, .nojekyll(nojekyll: false면 빼기), 언어별 manifest.webmanifest(site.manifest가 있을 때 — emitDefault면 한국어도)
 * - 개발 서버: 같은 사이트맵·앱 정보를 그때그때 만들어 준다
 */
export function siteMetadata(site, { nojekyll = true } = {}) {
  const sitemapPath = new URL(site.metadata.url).pathname + 'sitemap.xml';
  const manifestLanguages = () => site.manifest ? languages.filter(({ code }) => code !== 'ko' || site.manifest.emitDefault) : [];
  return {
    name: 'opencad-site-metadata',
    transformIndexHtml: { order: 'pre', handler(html) {
      if (html.split('<!-- site-metadata -->').length !== 2) throw new Error('Expected one shared metadata marker.');
      return html.replace('<!-- site-metadata -->', '<!-- localized-metadata:start -->' + site.renderMetadata() + '<!-- localized-metadata:end -->');
    } },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0];
        const manifest = site.manifest ? path.match(/(?:^|\/)(?:(en|ja|zh-CN|de)\/)?manifest\.webmanifest$/) : null;
        if (manifest && (manifest[1] || site.manifest.emitDefault)) {
          res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          return res.end(manifestJson(site.webManifest(manifest[1] ?? 'ko')));
        }
        if (path !== '/sitemap.xml' && path !== sitemapPath) return next();
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.end(site.sitemapXml());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: site.sitemapXml() });
      if (nojekyll) this.emitFile({ type: 'asset', fileName: '.nojekyll', source: '' });
      for (const { code } of manifestLanguages()) this.emitFile({ type: 'asset', fileName: manifestPath(code), source: manifestJson(site.webManifest(code)) });
    },
  };
}
