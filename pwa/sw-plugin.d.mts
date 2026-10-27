import type { Plugin } from 'vite';

export interface VersionScheme {
  /** 지문 앞 몇 자리(기본 16) */
  length?: number;
  /** 지문에 넣는 이름: 'file'(dist 경로, 기본) 또는 'url'(미리 담을 주소) */
  key?: 'file' | 'url';
  /** 이름과 내용 사이(기본 '\0') */
  separator?: string;
  /** 내용 뒤(기본 '\0') */
  terminator?: string;
}
export const DEFAULT_VERSION: Readonly<Required<VersionScheme>>;
export interface LazyRules { facade?: RegExp[]; modules?: RegExp[]; assetOrigins?: RegExp[]; assetNames?: RegExp[] }
export type Precache = (path: string, context: { lazy: ReadonlySet<string> }) => boolean;
export interface ServiceWorkerValues {
  version: string;
  staticVersion: string | null;
  precache: string[];
  assets: string[];
  files: string[];
}
export interface ValueOptions {
  precache?: Precache;
  lazy?: ReadonlySet<string>;
  sortUrls?: boolean;
  staticDirs?: string[];
  version?: VersionScheme;
}
export interface BundleItem { type: 'chunk' | 'asset'; fileName: string; facadeModuleId?: string | null; moduleIds?: string[]; modules?: Record<string, unknown>; originalFileNames?: string[]; originalFileName?: string | null }

export function defaultPrecacheable(path: string): boolean;
export function listFiles(root: string): string[];
export function pageUrl(file: string): string;
export function fingerprint(entries: { file: string; url: string }[], read: (file: string) => string | Uint8Array, scheme?: VersionScheme): string;
export function lazyFiles(bundle: Record<string, BundleItem>, rules?: LazyRules): Set<string>;
export function serviceWorkerValues(files: string[], read: (file: string) => string | Uint8Array, options?: ValueOptions): ServiceWorkerValues;
export function fillTemplate(template: string, values: { version: string; staticVersion?: string | null; precache: string[]; assets?: string[] }): string;
export function templateSource(template: string | URL): (values: ServiceWorkerValues) => string;
export function serviceWorker(options: Omit<ValueOptions, 'lazy'> & { source: (values: ServiceWorkerValues) => string; lazy?: LazyRules | null }): Plugin;
