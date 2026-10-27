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
  /** 쓸 때만 받는 덩어리 이름 모음. 규칙 꼴(serviceWorker 설정의 lazy)을 주면 빌드 결과가 없어 빈 모음으로 친다 */
  lazy?: ReadonlySet<string> | LazyRules | null;
  sortUrls?: boolean;
  staticDirs?: string[];
  version?: VersionScheme;
  /** serviceWorker 설정을 그대로 넘길 수 있게 받기만 한다(쓰지 않는다) */
  source?: (values: ServiceWorkerValues) => string;
}
/** serviceWorker()의 설정(앱의 tools/site.mjs가 offline으로 내보내는 꼴) — serviceWorkerValues에도 그대로 넘길 수 있다 */
export interface ServiceWorkerOptions extends Omit<ValueOptions, 'lazy' | 'source'> {
  /** 워커 원본을 돌려주는 함수(templateSource(파일)도 된다) */
  source: (values: ServiceWorkerValues) => string;
  /** 쓸 때만 받는 덩어리를 가리는 규칙(lazyFiles) */
  lazy?: LazyRules | null;
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
export function serviceWorker(options: ServiceWorkerOptions): Plugin;
