/**
 * 다른 사이트에 넣은(iframe) 앱이 부모 페이지에서 파일을 받는다. 부모 쪽은 embed/opencad-embed.js(<opencad-viewer>)나 같은 약속을 따르는 스크립트.
 *
 * 약속(EMBED_PROTOCOL = 1) — 모든 글은 { type, protocol: 1, … } 꼴
 * - 앱 → 부모  'opencad:ready'  { accept }      받을 준비가 됨(설치할 때 한 번, 부모가 'opencad:ping'을 보내면 다시)
 * - 부모 → 앱  'opencad:open'   { id, files: [{ name, data: ArrayBuffer | Blob }] }
 * - 앱 → 부모  'opencad:done'   { id }          앱이 열기를 마침(읽지 못한 파일은 앱 화면이 알린다)
 * - 앱 → 부모  'opencad:error'  { id, code }    bad-request · unsupported · too-large · open-failed
 *
 * 앱은 부모가 넘긴 바이트만 쓰고 다른 주소를 부르지 않는다(파일이 이 브라우저 밖으로 나가지 않는다는 약속 그대로).
 * 바로 위 부모(window.parent)의 글만 받고, 답은 그 글을 보낸 출처에만 보낸다. 파일 내용·이름을 부모에게 돌려보내지 않는다.
 */
import { isFramed, type FrameWindow } from './context';

export const EMBED_PROTOCOL = 1;

export type EmbedErrorCode = 'bad-request' | 'unsupported' | 'too-large' | 'open-failed';

export interface EmbedOptions {
  /** 여는 확장자(점 포함, 소문자 — '.step'). 주면 맞는 파일만 넘기고, 하나도 없으면 unsupported */
  accept?: readonly string[];
  /** 한 번에 받을 바이트 상한(기본 1 GiB) */
  maxBytes?: number;
  /** 한 번에 받을 파일 수 상한(기본 32) */
  maxFiles?: number;
}

/** 시험에서 가짜를 넘기는 창 */
export interface EmbedWindow extends FrameWindow {
  readonly parent: { postMessage(message: unknown, targetOrigin: string): void } | null;
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  readonly document?: { documentElement?: { setAttribute(name: string, value: string): void } };
}

interface IncomingFile {
  name: string;
  data: ArrayBuffer | Blob;
}

const GIB = 1024 ** 3;

function extension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot).toLowerCase() : '';
}

function readFiles(value: unknown, maxFiles: number): IncomingFile[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxFiles) return null;
  const files: IncomingFile[] = [];
  for (const item of value) {
    const name = (item as { name?: unknown } | null)?.name;
    const data = (item as { data?: unknown } | null)?.data;
    if (typeof name !== 'string' || !name.trim() || name.length > 255 || /[\\/]/.test(name)) return null;
    if (!isBytes(data)) return null;
    files.push({ name: name.trim(), data });
  }
  return files;
}

/** 다른 창(realm)에서 온 것도 알아보게 instanceof 대신 꼬리표로 본다 */
function isBytes(value: unknown): value is ArrayBuffer | Blob {
  const tag = Object.prototype.toString.call(value);
  return tag === '[object ArrayBuffer]' || tag === '[object Blob]' || tag === '[object File]';
}

const size = (data: ArrayBuffer | Blob): number => (Object.prototype.toString.call(data) === '[object ArrayBuffer]' ? (data as ArrayBuffer).byteLength : (data as Blob).size);

/**
 * iframe 안이면 부모가 넘기는 파일을 open에 건네고 true. open이 Promise를 돌려주면 끝난 뒤 'opencad:done'을 보낸다.
 * <html>에 data-embedded를 달아 앱이 넣은 화면에서 숨길 것(설치 단추·방문 통계 메뉴 등)을 CSS로 가릴 수 있게 한다.
 */
export function acceptEmbeddedFiles(open: (files: File[]) => unknown, options: EmbedOptions = {}, w: EmbedWindow | undefined = typeof window === 'undefined' ? undefined : (window as unknown as EmbedWindow)): boolean {
  if (!w || !isFramed(w) || !w.parent) return false;
  const parent = w.parent;
  const accept = options.accept?.map((ext) => ext.toLowerCase());
  const maxBytes = options.maxBytes ?? GIB;
  const maxFiles = options.maxFiles ?? 32;
  const ready = { type: 'opencad:ready', protocol: EMBED_PROTOCOL, accept: accept ?? null };
  const reply = (origin: string, message: Record<string, unknown>): void => {
    try {
      parent.postMessage({ protocol: EMBED_PROTOCOL, ...message }, origin === 'null' ? '*' : origin);
    } catch {
      /* 부모가 사라졌다 */
    }
  };
  w.addEventListener('message', (event) => {
    if (event.source !== parent) return;
    const message = event.data as { type?: unknown; protocol?: unknown; id?: unknown; files?: unknown } | null;
    if (!message || typeof message !== 'object' || typeof message.type !== 'string' || !message.type.startsWith('opencad:')) return;
    if (message.type === 'opencad:ping') {
      reply(event.origin, ready);
      return;
    }
    if (message.type !== 'opencad:open') return;
    const id = typeof message.id === 'string' || typeof message.id === 'number' ? String(message.id).slice(0, 64) : null;
    const fail = (code: EmbedErrorCode): void => reply(event.origin, { type: 'opencad:error', id, code });
    if (message.protocol !== EMBED_PROTOCOL || id === null) return fail('bad-request');
    const incoming = readFiles(message.files, maxFiles);
    if (!incoming) return fail('bad-request');
    const chosen = accept ? incoming.filter((file) => accept.includes(extension(file.name))) : incoming;
    if (!chosen.length) return fail('unsupported');
    if (chosen.reduce((sum, file) => sum + size(file.data), 0) > maxBytes) return fail('too-large');
    const files = chosen.map((file) => new File([Object.prototype.toString.call(file.data) === '[object ArrayBuffer]' ? new Uint8Array(file.data as ArrayBuffer) : (file.data as Blob)], file.name));
    let result: unknown;
    try {
      result = open(files);
    } catch {
      return fail('open-failed');
    }
    void Promise.resolve(result).then(
      () => reply(event.origin, { type: 'opencad:done', id }),
      () => fail('open-failed'),
    );
  });
  try {
    w.document?.documentElement?.setAttribute('data-embedded', '');
  } catch {
    /* 표시만 */
  }
  // 아직 부모가 누구인지 모른다 — 글에 파일·주소 같은 것이 없으므로 모든 출처에 알린다(부모는 ping으로 다시 물을 수 있다)
  try {
    parent.postMessage(ready, '*');
  } catch {
    /* 부모가 사라졌다 */
  }
  return true;
}

export { isFramed };
