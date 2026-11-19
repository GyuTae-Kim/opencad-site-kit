export interface Language { code: string; label: string; locale: string; }
/** 사이트 정보(site/metadata.json)에서 번역기가 쓰는 부분 */
export interface SiteMetadataInput { url: string; [key: string]: unknown; }
/**
 * 언어 주소를 바꿀 경로. 경로는 모두 "/"로 시작하고 끝난다.
 * - apps: 앱 뿌리 — 언어 페이지는 그 아래 한 단계(/app/en/)
 * - aliases: 옛 앱 뿌리 → 지금 뿌리
 * - site: 언어를 뿌리 바로 아래 앞머리(/en/…)로 두는 사이트와, 뿌리 말고도 언어를 붙일 그 아래 쪽 이름들
 */
export interface SiteRoutes {
  apps?: string[];
  aliases?: Record<string, string>;
  site?: { root?: string; sections?: string[] };
}
export interface I18nOptions {
  metadata: SiteMetadataInput;
  /** 없으면 metadata.url의 경로 하나만 앱 뿌리 */
  routes?: SiteRoutes;
  /** 번역문에서 한국어 원문을 거꾸로 찾지 않을 이름(사이트·사람 이름 등) */
  untranslated?: string[];
}
export function configureI18n(options: I18nOptions): void;
export const languages: Language[];
export const catalogs: Record<string, Record<string, string>>;
export function registerCatalog(language: string, content: Record<string, string>): void;
export function normalize(value: string): string;
export function sourceMessage(value: string): string;
export function translate(value: string, language?: string, uiParameters?: boolean): string;
export function currentLanguage(url: string): string;
export function languageUrl(url: string, language?: string): string;
export function translateData<T>(value: T, language: string): T;
export function metadataForLanguage(language?: string): any;
