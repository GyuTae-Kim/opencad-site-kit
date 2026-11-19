// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi, type Mock } from 'vitest';
import { acceptEmbeddedFiles, EMBED_PROTOCOL, type EmbedWindow } from '../embed/app';
import { isFramed } from '../embed/context';
import { canUseServiceWorker } from '../pwa/client';
import { APPS, appForName, appUrl, EMBED_PROTOCOL as HOST_PROTOCOL, fileNameOf, OpenCadViewer } from '../embed/opencad-embed.js';

/** iframe 안의 앱 창 흉내: 부모에게 보낸 글을 모으고, 부모가 보낸 글을 넣는다 */
function frame(framed = true) {
  const posted: { message: Record<string, unknown>; origin: string }[] = [];
  const parent = { postMessage: (message: unknown, origin: string) => void posted.push({ message: message as Record<string, unknown>, origin }) };
  const listeners: ((event: MessageEvent) => void)[] = [];
  const attributes: Record<string, string> = {};
  const self = {};
  const w: EmbedWindow = {
    self, top: framed ? {} : self, parent,
    addEventListener: (_type, listener) => void listeners.push(listener),
    document: { documentElement: { setAttribute: (name: string, value: string) => void (attributes[name] = value) } },
  };
  const send = (data: unknown, { source = parent as unknown, origin = 'https://host.example' } = {}) =>
    listeners.forEach((listener) => listener({ data, source, origin } as MessageEvent));
  return { w, posted, send, attributes };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
/** jsdom의 Blob에는 text()가 없다 */
const textOf = (blob: Blob): Promise<string> => typeof blob.text === 'function' ? blob.text() : new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsText(blob);
});
const openMessage = (files: unknown, extra: Record<string, unknown> = {}) => ({ type: 'opencad:open', protocol: 1, id: 'a1', files, ...extra });

describe('frame detection', () => {
  it('tells a framed document from a top-level one', () => {
    const self = {};
    expect(isFramed({ self, top: self })).toBe(false);
    expect(isFramed({ self, top: {} })).toBe(true);
    expect(isFramed({ self, get top(): unknown { throw new Error('cross-origin'); } })).toBe(true);
    expect(isFramed(undefined)).toBe(false);
  });
  it('does not register a service worker inside a frame', () => {
    const https = { protocol: 'https:', hostname: 'gyutae-kim.github.io' };
    expect(canUseServiceWorker(https, { serviceWorker: {} }, false)).toBe(true);
    expect(canUseServiceWorker(https, { serviceWorker: {} }, true)).toBe(false);
  });
});

describe('app side: acceptEmbeddedFiles', () => {
  it('does nothing at the top level', () => {
    const { w, posted } = frame(false);
    expect(acceptEmbeddedFiles(() => {}, {}, w)).toBe(false);
    expect(posted).toEqual([]);
  });

  it('announces itself, answers pings to the asking origin and marks the page', () => {
    const { w, posted, send, attributes } = frame();
    expect(acceptEmbeddedFiles(() => {}, { accept: ['.STEP', '.stp'] }, w)).toBe(true);
    expect(posted).toEqual([{ message: { type: 'opencad:ready', protocol: 1, accept: ['.step', '.stp'] }, origin: '*' }]);
    expect(attributes).toEqual({ 'data-embedded': '' });
    send({ type: 'opencad:ping', protocol: 1 });
    expect(posted[1]).toEqual({ message: { protocol: 1, type: 'opencad:ready', accept: ['.step', '.stp'] }, origin: 'https://host.example' });
  });

  it('opens the files the parent sends and reports when the app is done', async () => {
    const { w, posted, send } = frame();
    let finish!: () => void;
    const opened: File[][] = [];
    acceptEmbeddedFiles((files) => { opened.push(files); return new Promise<void>((resolve) => { finish = resolve; }); }, { accept: ['.step'] }, w);
    send(openMessage([{ name: 'part.STEP', data: new TextEncoder().encode('ISO-10303-21;').buffer }, { name: 'notes.txt', data: new Blob(['x']) }]));
    expect(opened).toHaveLength(1);
    expect(opened[0]!.map((file) => file.name)).toEqual(['part.STEP']);
    expect(await textOf(opened[0]![0]!)).toBe('ISO-10303-21;');
    await settle();
    expect(posted).toHaveLength(1);
    finish();
    await settle();
    expect(posted[1]).toEqual({ message: { protocol: 1, type: 'opencad:done', id: 'a1' }, origin: 'https://host.example' });
  });

  it('ignores other windows and other messages', () => {
    const { w, posted, send } = frame();
    const open = vi.fn();
    acceptEmbeddedFiles(open, {}, w);
    send(openMessage([{ name: 'a.dxf', data: new ArrayBuffer(1) }]), { source: {} });
    send({ type: 'other', files: [] });
    send('opencad:open');
    send(null);
    expect(open).not.toHaveBeenCalled();
    expect(posted).toHaveLength(1);
  });

  it.each([
    ['a wrong protocol', openMessage([{ name: 'a.dxf', data: new ArrayBuffer(1) }], { protocol: 2 }), 'bad-request'],
    ['no id', openMessage([{ name: 'a.dxf', data: new ArrayBuffer(1) }], { id: undefined }), 'bad-request'],
    ['no files', openMessage([]), 'bad-request'],
    ['a path in the name', openMessage([{ name: '../a.dxf', data: new ArrayBuffer(1) }]), 'bad-request'],
    ['no bytes', openMessage([{ name: 'a.dxf', data: 'text' }]), 'bad-request'],
    ['too many files', openMessage(Array.from({ length: 33 }, (_, i) => ({ name: `a${i}.dxf`, data: new ArrayBuffer(1) }))), 'bad-request'],
    ['an unsupported type', openMessage([{ name: 'a.step', data: new ArrayBuffer(1) }]), 'unsupported'],
    ['too many bytes', openMessage([{ name: 'a.dxf', data: new ArrayBuffer(11) }]), 'too-large'],
  ])('refuses %s', (_label, message, code) => {
    const { w, posted, send } = frame();
    const open = vi.fn();
    acceptEmbeddedFiles(open, { accept: ['.dxf', '.dwg'], maxBytes: 10 }, w);
    send(message);
    expect(open).not.toHaveBeenCalled();
    expect(posted[1]!.message).toMatchObject({ type: 'opencad:error', code });
  });

  it('reports a failed open and answers an opaque origin with "*"', async () => {
    const { w, posted, send } = frame();
    acceptEmbeddedFiles(() => Promise.reject(new Error('parse')), {}, w);
    send(openMessage([{ name: 'a.dxf', data: new ArrayBuffer(1) }]), { origin: 'null' });
    await settle();
    expect(posted[1]).toEqual({ message: { protocol: 1, type: 'opencad:error', id: 'a1', code: 'open-failed' }, origin: '*' });
    const thrown = frame();
    acceptEmbeddedFiles(() => { throw new Error('sync'); }, {}, thrown.w);
    thrown.send(openMessage([{ name: 'a.dxf', data: new ArrayBuffer(1) }]));
    expect(thrown.posted[1]!.message).toMatchObject({ type: 'opencad:error', code: 'open-failed' });
  });
});

describe('host side: <opencad-viewer>', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('speaks the same protocol as the app side', () => {
    expect(HOST_PROTOCOL).toBe(EMBED_PROTOCOL);
  });

  it('picks the app by extension and builds its address', () => {
    expect(['plan.DWG', 'a.dxf', 'm.step', 'm.stp', 'm.p21', 'house.skp', 'O0001.nc', 'part.mpr', 'a.pgi', 'prog.H', 'x.txt', 'noext', '']
      .map((name) => appForName(name))).toEqual(['dwgdxf', 'dwgdxf', 'step', 'step', 'step', 'skp', 'nc', 'nc', 'nc', 'nc', null, null, null]);
    expect(fileNameOf('/files/%EB%8F%84%EB%A9%B4.dxf?v=2#x', 'https://site.example/')).toBe('도면.dxf');
    expect(appUrl('step')).toBe('https://gyutae-kim.github.io/opencad-step/');
    expect(appUrl('nc', { lang: 'zh-CN', sample: true })).toBe('https://gyutae-kim.github.io/opencad-nc/zh-CN/?sample');
    expect(appUrl('skp', { base: '/cad/', lang: 'xx' }, APPS, 'https://me.example/blog/')).toBe('https://me.example/cad/opencad-skp/');
    expect(() => appUrl('unknown')).toThrow(/Unknown/);
  });

  // jsdom은 그림자 안 iframe에 창을 만들지 않는다 — iframe마다 가짜 창(postMessage만)을 준다
  const frames = new WeakMap<HTMLIFrameElement, { postMessage: Mock }>();
  beforeAll(() => {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      configurable: true,
      get(this: HTMLIFrameElement) {
        let fake = frames.get(this);
        if (!fake) frames.set(this, (fake = { postMessage: vi.fn() }));
        return fake;
      },
    });
  });

  function mount(attributes: Record<string, string>) {
    const element = document.createElement('opencad-viewer') as OpenCadViewer;
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    const events: { type: string; detail: unknown }[] = [];
    for (const type of ['opencad-ready', 'opencad-done', 'opencad-error']) element.addEventListener(type, (event) => events.push({ type, detail: (event as CustomEvent).detail }));
    document.body.append(element);
    const iframe = () => element.shadowRoot!.querySelector('iframe')!;
    const sent = () => (iframe().contentWindow as unknown as { postMessage: Mock }).postMessage;
    const fromApp = (data: unknown, origin = new URL(iframe().src).origin, source: unknown = iframe().contentWindow) => {
      const event = new Event('message');
      Object.defineProperties(event, { data: { value: data }, origin: { value: origin }, source: { value: source } });
      window.dispatchEvent(event);
    };
    return { element, events, iframe, sent, fromApp };
  }

  it('loads src in this page and hands the bytes to the app once it is ready', async () => {
    const fetched: string[] = [];
    vi.stubGlobal('fetch', async (url: URL) => { fetched.push(String(url)); return new Response('0\nSECTION'); });
    const { element, events, iframe, sent, fromApp } = mount({ src: '/models/plan.dxf', lang: 'en', base: 'https://apps.example/' });
    expect(element.app).toBe('dwgdxf');
    expect(iframe().src).toBe('https://apps.example/opencad-dwgdxf/en/');
    expect(iframe().title).toBe('OpenCAD DWG/DXF CAD');
    fromApp({ type: 'opencad:ready', protocol: 1, accept: ['.dxf'] }, 'https://evil.example');
    fromApp({ type: 'opencad:ready', protocol: 1, accept: ['.dxf'] }, undefined, {});
    expect(events).toEqual([]);
    fromApp({ type: 'opencad:ready', protocol: 1, accept: ['.dxf'] });
    await vi.waitFor(() => expect(sent()).toHaveBeenCalled());
    expect(fetched).toEqual([new URL('/models/plan.dxf', document.baseURI).href]);
    const [message, origin] = sent().mock.calls[0]! as [Record<string, unknown>, string];
    expect(origin).toBe('https://apps.example');
    expect(message).toMatchObject({ type: 'opencad:open', protocol: 1, id: 'f1', files: [{ name: 'plan.dxf' }] });
    expect(await textOf((message.files as { data: Blob }[])[0]!.data)).toBe('0\nSECTION');
    fromApp({ type: 'opencad:done', protocol: 1, id: 'f1' });
    expect(events).toEqual([{ type: 'opencad-ready', detail: { accept: ['.dxf'] } }, { type: 'opencad-done', detail: { id: 'f1' } }]);
  });

  it('switches to the app of a file passed to open() and settles its promise', async () => {
    const { element, iframe, fromApp } = mount({ app: 'step', base: 'https://apps.example/' });
    expect(iframe().src).toBe('https://apps.example/opencad-step/');
    const result = element.open(new File(['x'], 'floor.dwg'));
    expect(iframe().src).toBe('https://apps.example/opencad-step/');
    const auto = mount({ base: 'https://apps.example/', src: 'a.step' });
    vi.stubGlobal('fetch', async () => new Response('x'));
    const opened = auto.element.open(new File(['x'], 'floor.dwg'));
    expect(auto.iframe().src).toBe('https://apps.example/opencad-dwgdxf/');
    auto.fromApp({ type: 'opencad:ready', protocol: 1, accept: null });
    expect(auto.sent()).toHaveBeenCalledTimes(1);
    expect(auto.sent().mock.calls[0]![0]).toMatchObject({ files: [{ name: 'floor.dwg' }] });
    auto.fromApp({ type: 'opencad:error', protocol: 1, id: 'f1', code: 'too-large' });
    await expect(opened).rejects.toThrow('too-large');
    fromApp({ type: 'opencad:ready', protocol: 1 });
    fromApp({ type: 'opencad:done', protocol: 1, id: 'f1' });
    await expect(result).resolves.toBeUndefined();
  });

  it('accepts a Blob made in another window and refuses anything else', async () => {
    const { element, iframe, sent, fromApp } = mount({ app: 'dwgdxf', base: 'https://apps.example/' });
    fromApp({ type: 'opencad:ready', protocol: 1 });
    const foreign = await new Response('0\nEOF').blob();
    void element.open(foreign, 'plan.dxf').catch(() => {});
    expect(sent()).toHaveBeenCalledTimes(1);
    await expect(element.open('not a file' as never, 'a.dxf')).rejects.toThrow('bad-request');
    expect(iframe().src).toBe('https://apps.example/opencad-dwgdxf/');
  });

  it('explains an unknown file type and reports a silent app', async () => {
    const unknown = mount({ src: 'notes.txt' });
    expect(unknown.element.shadowRoot!.querySelector('iframe')).toBeNull();
    expect(unknown.element.shadowRoot!.querySelector('p')!.textContent).toMatch(/app/);
    expect(unknown.events).toEqual([{ type: 'opencad-error', detail: { id: null, code: 'unsupported' } }]);
    await expect(unknown.element.open(new Blob(['x']), 'x.txt')).rejects.toThrow('unsupported');
    vi.useFakeTimers();
    const silent = mount({ app: 'skp', sample: '' });
    expect(silent.iframe().src).toBe('https://gyutae-kim.github.io/opencad-skp/?sample');
    vi.advanceTimersByTime(30_000);
    expect(silent.events).toEqual([{ type: 'opencad-error', detail: { id: null, code: 'timeout' } }]);
  });

  it('draws once when an element already in the page is upgraded (module script after the markup)', () => {
    // 문서에 먼저 있던 요소를 나중에 정의한다 — 속성마다 attributeChangedCallback이 붙은 채로 먼저 불린다
    document.body.innerHTML = '<opencad-viewer-late src="a.step" lang="de" base="https://apps.example/" title="Part"></opencad-viewer-late>';
    const created: string[] = [];
    const append = ShadowRoot.prototype.append;
    vi.spyOn(ShadowRoot.prototype, 'append').mockImplementation(function (this: ShadowRoot, ...nodes) {
      for (const node of nodes) if (node instanceof HTMLIFrameElement) created.push(node.src);
      return append.apply(this, nodes);
    });
    customElements.define('opencad-viewer-late', class extends OpenCadViewer {});
    expect(created).toEqual(['https://apps.example/opencad-step/de/']);
    expect(document.querySelector('opencad-viewer-late')!.shadowRoot!.querySelector('iframe')!.title).toBe('Part');
    vi.restoreAllMocks();
  });

  it('reloads only when the app address changes', async () => {
    vi.stubGlobal('fetch', async () => new Response('x'));
    const { element, iframe, sent, fromApp } = mount({ src: 'a.step', base: 'https://apps.example/' });
    const first = iframe();
    fromApp({ type: 'opencad:ready', protocol: 1 });
    await vi.waitFor(() => expect(sent()).toHaveBeenCalledTimes(1));
    element.setAttribute('src', 'b.stp');
    expect(iframe()).toBe(first);
    await vi.waitFor(() => expect(sent()).toHaveBeenCalledTimes(2));
    expect(sent().mock.calls[1]![0]).toMatchObject({ files: [{ name: 'b.stp' }] });
    element.setAttribute('lang', 'de');
    expect(iframe()).not.toBe(first);
    expect(iframe().src).toBe('https://apps.example/opencad-step/de/');
  });
});
