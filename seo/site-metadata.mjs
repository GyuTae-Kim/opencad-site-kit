import { readFileSync } from 'node:fs';
import { configureI18n, languages, languageUrl, metadataForLanguage } from '../i18n/core.mjs';
import { localizeManifest, manifestPath } from '../pwa/manifest.mjs';

const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * 앱 하나의 사이트 설정. 검색·공유 정보(renderMetadata), 사이트맵, 언어별 앱 정보(webManifest)를 한 설정에서 만든다.
 * - metadata: site/metadata.json, history: site/content-history.json(내용 수정일)
 * - manifest(홈 화면 앱 정보, 없으면 앱 정보를 다루지 않는다):
 *   - source: 한국어 원본 앱 정보 파일(URL 또는 경로)
 *   - extend(manifest): 원본에 더할 것(예: 여는 확장자로 만든 share_target·file_handlers)
 *   - emitDefault: 한국어 manifest.webmanifest도 빌드가 쓴다(원본이 public/ 밖에 있을 때). 아니면 public/이 그대로 복사한다
 *   - links: 'html'(index.html에 적은 <link rel="manifest">·홈 화면 이름을 언어 페이지마다 바꾼다) 또는
 *     'metadata'(검색 정보 자리에 언어별 앱 정보 링크와 홈 화면 이름을 함께 넣는다)
 */
export function defineSite({ metadata, history, manifest = null }) {
  configureI18n({ metadata });
  const options = manifest && { emitDefault: false, links: 'html', ...manifest };
  const site = {
    metadata, history, manifest: options,
    webManifest(language = 'ko') {
      if (!options) throw new Error('This site has no web app manifest.');
      const source = JSON.parse(readFileSync(options.source, 'utf8'));
      return localizeManifest(options.extend ? options.extend(source) : source, language);
    },
    renderMetadata: (language = 'ko') => renderMetadata(site, language),
    sitemapXml: () => sitemapXml(site),
  };
  return site;
}

/** 언어 페이지의 머리 정보(제목·대표 주소·검색·공유 태그·언어 대안·구조화 자료) */
export function renderMetadata(site, language = 'ko') {
  const { history } = site;
  const metadata = metadataForLanguage(language);
  const image = metadata.image;
  const tags = [`<title>${escape(metadata.title)}</title>`, `<link rel="canonical" href="${escape(metadata.url)}">`,
    `<link rel="sitemap" type="application/xml" href="${escape(languageUrl(metadata.url,'ko'))}sitemap.xml">`];
  const names = { description: metadata.description, robots: 'index, follow, max-image-preview:large', author: metadata.author.name,
    'twitter:card': 'summary_large_image', 'twitter:title': metadata.title, 'twitter:description': metadata.description,
    'twitter:image': image.url, 'twitter:image:alt': image.alt };
  const properties = { 'og:type': 'website', 'og:site_name': metadata.siteName, 'og:locale': metadata.locale,
    'og:title': metadata.title, 'og:description': metadata.description, 'og:url': metadata.url,
    'og:image': image.url, 'og:image:secure_url': image.url, 'og:image:type': image.type,
    'og:image:width': image.width, 'og:image:height': image.height, 'og:image:alt': image.alt };
  for (const [name, content] of Object.entries(names)) tags.push(`<meta name="${name}" content="${escape(content)}">`);
  for (const [property, content] of Object.entries(properties)) tags.push(`<meta property="${property}" content="${escape(content)}">`);
  for (const item of [...languages, { code: 'ko', label: 'x-default' }]) tags.push(`<link rel="alternate" hreflang="${item.label === 'x-default' ? 'x-default' : item.code}" href="${escape(languageUrl(metadata.url,item.code))}">`);
  // Relative to the application root (language pages carry <base href="../">).
  if (site.manifest?.links === 'metadata') tags.push(`<link rel="manifest" href="./${manifestPath(language)}">`, `<meta name="apple-mobile-web-app-title" content="${escape(site.webManifest(language).short_name)}">`);
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', '@id': metadata.url + '#app', ...metadata.application, url: metadata.url,
      description: metadata.description, inLanguage: metadata.language, image: image.url, author: metadata.author, dateModified: history.lastmod },
    { '@type': 'BreadcrumbList', itemListElement: metadata.breadcrumbs },
  ] };
  tags.push(`<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`);
  return tags.join('\n    ');
}

/** 다섯 언어 페이지와 서로의 언어 대안을 적은 사이트맵 */
export function sitemapXml(site) {
  const { metadata, history } = site;
  const alternates = [...languages.map(({code}) => `<xhtml:link rel="alternate" hreflang="${code}" href="${escape(languageUrl(metadata.url,code))}"/>`), `<xhtml:link rel="alternate" hreflang="x-default" href="${escape(metadata.url)}"/>`].join('');
  const urls = languages.map(({code}) => `  <url><loc>${escape(languageUrl(metadata.url,code))}</loc><lastmod>${escape(history.lastmod)}</lastmod>${alternates}</url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}
