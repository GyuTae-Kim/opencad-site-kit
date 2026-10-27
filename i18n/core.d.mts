export interface Language { code: string; label: string; locale: string; }
/** 사이트 정보(site/metadata.json)에서 번역기가 쓰는 부분 */
export interface SiteMetadataInput { url: string; [key: string]: unknown; }
export function configureI18n(options: { metadata: SiteMetadataInput }): void;
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
