/**
 * <opencad-viewer> — 내 웹페이지에 OpenCAD 앱(DWG·DXF 2D CAD, STEP·SketchUp·NC 3D 뷰어)을 넣는 요소. 의존 없는 한 파일, MIT.
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/gh/GyuTae-Kim/opencad-site-kit@v0.2.0/embed/opencad-embed.js"></script>
 *   <opencad-viewer src="/models/bracket.step" style="height: 480px"></opencad-viewer>
 *
 * 속성
 * - src     이 페이지가 받아(fetch) 앱에 넘길 파일 주소. 이 페이지와 같은 출처이거나 CORS를 허용한 주소여야 한다. 앱은 이 주소를 부르지 않는다
 * - app     dwgdxf · step · skp · nc. 없으면 name·src의 확장자로 고른다
 * - name    앱에 보일 파일 이름(없으면 src 주소의 마지막 조각)
 * - lang    ko(기본) · en · ja · zh-CN · de
 * - base    앱들이 있는 곳(기본 https://gyutae-kim.github.io/). 앱을 직접 배포했으면 그 주소 — <base>opencad-step/ 꼴로 찾는다
 * - sample  파일 대신 그 앱의 예제를 연다(app과 함께)
 * - title   iframe의 접근성 이름
 * - loading lazy면 요소가 화면 가까이(200px) 올 때 앱을 띄운다(open()을 부르면 바로). 한 페이지에 여럿 넣을 때
 * 함수   open(file | blob, name?) → Promise<void> — 사용자가 고른 파일 등을 넘긴다(형식이 다르면 그 앱으로 바꾼다)
 * 이벤트 opencad-ready { accept } · opencad-done { id } · opencad-error { id, code }
 *        code: timeout(앱이 답하지 않음) · fetch-failed · unsupported · too-large · bad-request · open-failed
 *        (open()의 Promise는 그 밖에 replaced(다른 앱으로 바뀜)·disconnected(요소를 뺌)로도 끝난다)
 *
 * 파일은 이 페이지가 읽어 postMessage로 앱(iframe)에 넘기고, 답은 그 앱의 출처에서 온 것만 듣는다.
 * 약속은 opencad-site-kit/embed/app의 EMBED_PROTOCOL과 같다.
 */

export const EMBED_PROTOCOL = 1;
export const DEFAULT_BASE = 'https://gyutae-kim.github.io/';
export const LANGUAGES = ['ko', 'en', 'ja', 'zh-CN', 'de'];

const NC = ['nc', 'ngc', 'gcode', 'gco', 'gc', 'g', 'tap', 'cnc', 'ncc', 'nc1', 'mpf', 'spf', 'eia', 'iso', 'anc', 'din', 'ptp', 'fnc', 'min', 'hnc', 'ncd', 'xpi', 'cut', 'h', 'i', 'mpr', 'pgi', 'xml'];

/** 앱 이름 → base 아래 경로·여는 확장자·이름 */
export const APPS = {
  dwgdxf: { path: 'opencad-dwgdxf/', extensions: ['dwg', 'dxf'], label: { ko: 'OpenCAD DWG/DXF 캐드', en: 'OpenCAD DWG/DXF CAD' } },
  step: { path: 'opencad-step/', extensions: ['step', 'stp', 'p21', 'stpz'], label: { ko: 'OpenCAD STEP 뷰어', en: 'OpenCAD STEP viewer' } },
  skp: { path: 'opencad-skp/', extensions: ['skp'], label: { ko: 'OpenCAD SKP 뷰어', en: 'OpenCAD SKP viewer' } },
  nc: { path: 'opencad-nc/', extensions: NC, label: { ko: 'OpenCAD NC 뷰어', en: 'OpenCAD NC viewer' } },
};

const TIMEOUT_MS = 30_000;

/** 다른 창(realm)에서 만든 Blob·File도 받게 instanceof 대신 꼬리표로 본다 */
function isBlob(value) {
  const tag = Object.prototype.toString.call(value);
  return tag === '[object Blob]' || tag === '[object File]';
}

/** 파일 이름의 확장자로 앱 이름(없으면 null) */
export function appForName(name, apps = APPS) {
  const ext = /\.([^./\\?#]+)$/.exec(String(name ?? ''))?.[1]?.toLowerCase();
  if (!ext) return null;
  return Object.keys(apps).find((key) => apps[key].extensions.includes(ext)) ?? null;
}

/** 주소의 마지막 조각(파일 이름) */
export function fileNameOf(src, base = typeof document === 'undefined' ? 'http://localhost/' : document.baseURI) {
  try {
    const last = new URL(src, base).pathname.split('/').pop() ?? '';
    try {
      return decodeURIComponent(last);
    } catch {
      return last;
    }
  } catch {
    return '';
  }
}

/** 앱 iframe 주소 */
export function appUrl(app, { base = DEFAULT_BASE, lang = 'ko', sample = false } = {}, apps = APPS, documentBase = typeof document === 'undefined' ? 'http://localhost/' : document.baseURI) {
  const entry = apps[app];
  if (!entry) throw new Error(`Unknown OpenCAD app: ${app}`);
  const language = LANGUAGES.includes(lang) && lang !== 'ko' ? `${lang}/` : '';
  const url = new URL(entry.path + language, new URL(base || DEFAULT_BASE, documentBase));
  if (sample) url.search = 'sample';
  return url.href;
}

const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

export class OpenCadViewer extends Base {
  /** 고를 수 있는 앱(직접 배포한 앱의 경로가 다르면 바꾼다) */
  static apps = APPS;
  static observedAttributes = ['src', 'app', 'name', 'lang', 'base', 'sample', 'title', 'loading'];

  #frame = null;
  #origin = '';
  /** 띄운 앱 주소(null = 아직 그리지 않음, '' = 열 앱 없음) */
  #url = null;
  #ready = false;
  #queue = [];
  #pending = new Map();
  #seq = 0;
  #timer = 0;
  #loadedSrc = null;
  #fileApp = null;
  #message = null;
  #started = false;
  /** 앱을 띄워도 되는지(loading="lazy"면 처음 화면 가까이 올 때까지 false) */
  #visible = false;
  #observer = null;
  #onMessage = (event) => this.#receive(event);

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = ':host{display:block;position:relative;height:480px;min-height:200px;border:1px solid #8886;border-radius:6px;overflow:hidden;background:Canvas;color:CanvasText}iframe{display:block;width:100%;height:100%;border:0}p{margin:0;padding:16px;font:14px/1.5 system-ui,sans-serif}';
    root.append(style);
  }

  connectedCallback() {
    window.addEventListener('message', this.#onMessage);
    this.#started = true;
    if (!this.#visible && this.#lazy()) {
      this.#watch();
      return;
    }
    this.#visible = true;
    this.#render();
  }

  disconnectedCallback() {
    this.#started = false;
    window.removeEventListener('message', this.#onMessage);
    this.#fail(null, 'disconnected', false);
    this.#frame?.remove();
    this.#frame = null;
    this.#url = null;
    clearTimeout(this.#timer);
    this.#observer?.disconnect();
    this.#observer = null;
  }

  attributeChangedCallback(name, before, after) {
    // 붙기 전(파서가 요소를 올리며 속성마다 부르는 때)에는 그리지 않는다 — connectedCallback이 모든 속성으로 한 번 그린다
    if (!this.#started || before === after) return;
    if (name === 'loading') {
      if (!this.#lazy()) this.#wake();
      return;
    }
    if (name === 'src' || name === 'name') this.#fileApp = null;
    if (this.#render()) return;
    if ((name === 'src' || name === 'name') && this.#ready) this.#loadSrc();
    if (name === 'title' && this.#frame) this.#frame.title = this.#title();
  }

  /** 열린 앱 이름 */
  get app() {
    return this.#app();
  }

  /** 파일(File·Blob)을 앱에 넘긴다. app 속성이 없고 형식이 다르면 그 형식의 앱으로 바꾼다 */
  open(file, name) {
    if (!isBlob(file)) return Promise.reject(new Error('bad-request'));
    const fileName = String(name ?? file.name ?? '').trim();
    const apps = this.constructor.apps;
    if (!this.getAttribute('app') || !apps[this.getAttribute('app')]) {
      const wanted = appForName(fileName, apps);
      if (!wanted) {
        this.#emit('opencad-error', { id: null, code: 'unsupported' });
        return Promise.reject(new Error('unsupported'));
      }
      if (wanted !== this.#app()) {
        this.#fileApp = wanted;
        // 새 앱에는 src를 다시 싣지 않는다 — 사용자가 고른 파일을 연다
        this.#loadedSrc = this.getAttribute('src');
        this.#render();
      }
    }
    // loading="lazy"로 아직 띄우지 않았으면 지금 띄운다
    this.#wake();
    const id = `f${++this.#seq}`;
    const message = { type: 'opencad:open', protocol: EMBED_PROTOCOL, id, files: [{ name: fileName || 'file', data: file }] };
    return new Promise((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      if (this.#ready) this.#post(message);
      else this.#queue.push(message);
    });
  }

  #app() {
    const apps = this.constructor.apps;
    const chosen = this.getAttribute('app');
    if (chosen && apps[chosen]) return chosen;
    if (this.#fileApp) return this.#fileApp;
    const src = this.getAttribute('src');
    return appForName(this.getAttribute('name') || (src ? fileNameOf(src) : ''), apps);
  }

  #lang() {
    const lang = this.getAttribute('lang');
    return LANGUAGES.includes(lang) ? lang : 'ko';
  }

  #title() {
    const app = this.constructor.apps[this.#app()];
    return this.getAttribute('title') || (app?.label?.[this.#lang() === 'ko' ? 'ko' : 'en'] ?? 'OpenCAD');
  }

  #lazy() {
    return this.getAttribute('loading') === 'lazy' && typeof IntersectionObserver === 'function';
  }

  /** 화면 가까이 오면 앱을 띄운다 */
  #watch() {
    this.#observer?.disconnect();
    this.#observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) this.#wake();
    }, { rootMargin: '200px' });
    this.#observer.observe(this);
  }

  /** 아직 띄우지 않은 앱을 띄운다 */
  #wake() {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#visible) return;
    this.#visible = true;
    if (this.#started) this.#render();
  }

  /** 앱 주소가 바뀌었으면 iframe을 새로 띄우고 true */
  #render() {
    if (!this.#visible) return false;
    const app = this.#app();
    let url = '';
    try {
      if (app) url = appUrl(app, { base: this.getAttribute('base') || DEFAULT_BASE, lang: this.#lang(), sample: this.hasAttribute('sample') }, this.constructor.apps);
    } catch {
      url = '';
    }
    if (url === this.#url) return false;
    // 앞 앱에 넘기던 열기는 끝나지 않는다
    if (this.#url) this.#fail(null, 'replaced', false);
    this.#url = url;
    this.#ready = false;
    clearTimeout(this.#timer);
    this.#frame?.remove();
    this.#frame = null;
    this.#message?.remove();
    this.#message = null;
    if (!url) {
      this.#loadedSrc = null;
      const note = document.createElement('p');
      note.setAttribute('part', 'message');
      note.textContent = this.#lang() === 'ko' ? 'OpenCAD로 열 파일 형식을 알 수 없습니다. app 속성(dwgdxf·step·skp·nc)이나 파일 주소(src)를 주십시오.' : 'Unknown file type for OpenCAD. Set the app attribute (dwgdxf, step, skp, nc) or a file address (src).';
      this.shadowRoot.append(note);
      this.#message = note;
      this.#fail(null, 'unsupported', true);
      return true;
    }
    if (!this.#fileApp) this.#loadedSrc = null;
    this.#origin = new URL(url).origin;
    const frame = document.createElement('iframe');
    frame.title = this.#title();
    frame.allow = 'fullscreen; clipboard-write';
    frame.addEventListener('load', () => {
      if (!this.#ready) this.#post({ type: 'opencad:ping', protocol: EMBED_PROTOCOL });
    });
    frame.src = url;
    this.shadowRoot.append(frame);
    this.#frame = frame;
    this.#timer = setTimeout(() => {
      if (!this.#ready) this.#fail(null, 'timeout', true);
    }, TIMEOUT_MS);
    return true;
  }

  #post(message) {
    try {
      this.#frame?.contentWindow?.postMessage(message, this.#origin);
    } catch {
      /* 앱이 아직 없다 */
    }
  }

  #receive(event) {
    if (!this.#frame || event.source !== this.#frame.contentWindow || event.origin !== this.#origin) return;
    const data = event.data;
    if (!data || typeof data !== 'object' || data.protocol !== EMBED_PROTOCOL || typeof data.type !== 'string') return;
    if (data.type === 'opencad:ready') {
      if (this.#ready) return;
      this.#ready = true;
      clearTimeout(this.#timer);
      this.#emit('opencad-ready', { accept: Array.isArray(data.accept) ? data.accept : null });
      for (const message of this.#queue.splice(0)) this.#post(message);
      this.#loadSrc();
    } else if (data.type === 'opencad:done') {
      const id = typeof data.id === 'string' ? data.id : null;
      this.#pending.get(id)?.resolve();
      this.#pending.delete(id);
      this.#emit('opencad-done', { id });
    } else if (data.type === 'opencad:error') {
      const id = typeof data.id === 'string' ? data.id : null;
      const code = typeof data.code === 'string' ? data.code.slice(0, 40) : 'open-failed';
      this.#pending.get(id)?.reject(new Error(code));
      this.#pending.delete(id);
      this.#emit('opencad-error', { id, code });
    }
  }

  async #loadSrc() {
    const src = this.getAttribute('src');
    if (!src || this.#loadedSrc === src || this.hasAttribute('sample')) return;
    this.#loadedSrc = src;
    let blob;
    try {
      const response = await fetch(new URL(src, document.baseURI), { credentials: 'same-origin' });
      if (!response.ok) throw new Error(String(response.status));
      blob = await response.blob();
    } catch {
      if (this.getAttribute('src') === src) this.#emit('opencad-error', { id: null, code: 'fetch-failed' });
      return;
    }
    if (this.getAttribute('src') !== src) return;
    // 결과는 opencad-done·opencad-error 이벤트로 알린다
    this.open(blob, this.getAttribute('name') || fileNameOf(src)).catch(() => {});
  }

  /** 기다리던 열기를 code로 끝낸다(emit이면 이벤트도) */
  #fail(id, code, emit) {
    for (const [key, waiter] of this.#pending) {
      if (id !== null && key !== id) continue;
      waiter.reject(new Error(code));
      this.#pending.delete(key);
    }
    this.#queue.length = 0;
    if (emit) this.#emit('opencad-error', { id, code });
  }

  #emit(type, detail) {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true }));
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('opencad-viewer')) customElements.define('opencad-viewer', OpenCadViewer);
