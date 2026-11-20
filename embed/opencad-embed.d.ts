/** <opencad-viewer> 요소(embed/opencad-embed.js). 설명은 그 파일 머리말 */
export const EMBED_PROTOCOL: 1;
export const DEFAULT_BASE: string;
export const LANGUAGES: readonly string[];
export interface EmbedApp {
  /** base 아래 경로("/"로 끝남) */
  path: string;
  /** 여는 확장자(점 없이, 소문자) */
  extensions: readonly string[];
  /** iframe 이름(ko·en) */
  label?: { ko?: string; en?: string };
}
export const APPS: Record<'dwgdxf' | 'step' | 'skp' | 'nc', EmbedApp>;
export function appForName(name: string, apps?: Record<string, EmbedApp>): string | null;
export function fileNameOf(src: string, base?: string): string;
export function appUrl(app: string, options?: { base?: string; lang?: string; sample?: boolean }, apps?: Record<string, EmbedApp>, documentBase?: string): string;
export class OpenCadViewer extends HTMLElement {
  static apps: Record<string, EmbedApp>;
  static observedAttributes: string[];
  /** 읽으면 지금 띄운 앱 이름, 쓰면 app 속성(null이면 지움) */
  get app(): string | null;
  set app(value: string | null | undefined);
  /** sample 속성이 있는지(false면 지움) */
  sample: boolean;
  /** 파일을 앱에 넘긴다. 앱이 열기를 마치면 풀리고, 못 받으면 Error(code)로 거절된다 */
  open(file: Blob, name?: string): Promise<void>;
}
/**
 * <opencad-viewer>의 HTML 속성. React·Preact·Solid 같은 JSX의 IntrinsicElements 선언에 쓴다(docs/EMBED.md "프레임워크에서 쓰기")
 */
export interface OpenCadViewerAttributes {
  src?: string;
  app?: 'dwgdxf' | 'step' | 'skp' | 'nc' | (string & {});
  name?: string;
  lang?: 'ko' | 'en' | 'ja' | 'zh-CN' | 'de' | (string & {});
  base?: string;
  sample?: boolean;
  title?: string;
  loading?: 'lazy' | 'eager';
}
/** opencad-error의 code(요소가 정하는 것과 앱이 보내는 것). 새 판의 앱이 보낸 다른 코드도 문자열 그대로 온다 */
export type OpenCadErrorCode = 'timeout' | 'fetch-failed' | 'unsupported' | 'too-large' | 'bad-request' | 'open-failed';
export interface OpenCadEmbedEvents {
  'opencad-ready': CustomEvent<{ accept: string[] | null }>;
  'opencad-done': CustomEvent<{ id: string | null }>;
  'opencad-error': CustomEvent<{ id: string | null; code: OpenCadErrorCode | (string & {}) }>;
}
declare global {
  interface HTMLElementTagNameMap {
    'opencad-viewer': OpenCadViewer;
  }
  // 이벤트는 요소에서 올라오므로(bubbles) 요소·document·window의 addEventListener에서 detail 형이 잡히게 한다
  interface GlobalEventHandlersEventMap extends OpenCadEmbedEvents {}
}
