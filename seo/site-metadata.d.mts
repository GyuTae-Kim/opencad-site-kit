import type { WebManifest } from '../pwa/manifest.mjs';

export interface SiteMetadata {
  url: string; title: string; description: string; siteName: string; locale?: string;
  author: { name: string; url: string; [key: string]: unknown };
  image: { url: string; type: string; width: number; height: number; alt: string };
  application?: Record<string, unknown>;
  breadcrumbs: { item: string; [key: string]: unknown }[];
  [key: string]: unknown;
}
export interface ContentHistory { lastmod: string; fingerprint: string; }
export interface ManifestOptions {
  /** 한국어 원본 앱 정보 파일(URL 또는 경로) */
  source: string | URL;
  /** 원본에 더할 것(예: 여는 확장자로 만든 share_target·file_handlers) */
  extend?: (manifest: WebManifest) => WebManifest;
  /** 한국어 manifest.webmanifest도 빌드가 쓴다(원본이 public/ 밖일 때). 기본 false */
  emitDefault?: boolean;
  /** 앱 정보 링크·홈 화면 이름이 있는 곳: 'html'(index.html, 기본) 또는 'metadata'(검색 정보 자리) */
  links?: 'html' | 'metadata';
}
export interface Site {
  readonly metadata: SiteMetadata;
  readonly history: ContentHistory;
  readonly manifest: Required<Pick<ManifestOptions, 'emitDefault' | 'links'>> & ManifestOptions | null;
  webManifest(language?: string): WebManifest;
  renderMetadata(language?: string): string;
  sitemapXml(): string;
}
export function defineSite(options: { metadata: SiteMetadata; history: ContentHistory; manifest?: ManifestOptions | null }): Site;
export function renderMetadata(site: Site, language?: string): string;
export function sitemapXml(site: Site): string;
