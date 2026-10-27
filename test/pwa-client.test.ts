/** 홈 화면 앱 연결(pwa/client): 새 판 알림, 파일 열기, 공유 받기 주소 — 브라우저 기능은 가짜를 넘긴다 */
import { describe, expect, it, vi } from 'vitest';
import { canUseServiceWorker, consumeLaunchFiles, parseLaunchQuery, registerServiceWorker, usedResourceUrls, whenVisible, withoutLaunchQuery, type SwContainer, type SwRegistration, type SwWorker } from '../pwa/client';

function fakeWorker(state = 'installing') {
  const listeners: (() => void)[] = [];
  const w = {
    state,
    posted: [] as unknown[],
    postMessage(m: unknown) {
      this.posted.push(m);
    },
    addEventListener: (_t: 'statechange', fn: () => void) => listeners.push(fn),
    become(s: string) {
      w.state = s;
      for (const f of listeners) f();
    },
  };
  return w;
}

function fakeContainer(reg: Partial<SwRegistration>, controller: unknown = {}) {
  const changes: (() => void)[] = [];
  let found: (() => void) | null = null;
  const registration: SwRegistration = { waiting: null, installing: null, addEventListener: (_t, fn) => void (found = fn), ...reg };
  const sw: SwContainer & { change(): void; found(): void; registered: { url: string; scope?: string }[] } = {
    controller,
    registered: [],
    async register(url, opts) {
      this.registered.push({ url: String(url), scope: opts?.scope });
      return registration;
    },
    addEventListener: (_t, fn) => void changes.push(fn),
    change: () => changes.forEach((f) => f()),
    found: () => found?.(),
  };
  return { sw, registration };
}

describe('서비스 워커 등록과 새 판 알림', () => {
  it('앱 뿌리를 범위로 등록하고, 처음 설치(맡은 워커가 없음)는 알리지도 다시 읽지도 않는다', async () => {
    const w = fakeWorker();
    const { sw } = fakeContainer({ get installing() { return w as unknown as SwWorker; } }, null);
    const onUpdate = vi.fn();
    const reload = vi.fn();
    await registerServiceWorker(sw, 'https://x.test/app/sw.js', onUpdate, reload);
    expect(sw.registered).toEqual([{ url: 'https://x.test/app/sw.js', scope: 'https://x.test/app/' }]);
    sw.found();
    w.become('installed');
    sw.change(); // clients.claim
    expect(onUpdate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('상대 주소로 부르면 문서 기준 ./를 범위로 등록한다', async () => {
    const { sw } = fakeContainer({});
    await registerServiceWorker(sw, 'sw.js', vi.fn(), vi.fn());
    expect(sw.registered).toEqual([{ url: 'sw.js', scope: './' }]);
  });

  it('앞 판이 맡고 있을 때 새 판이 기다리면 알리고, 고르면 SKIP_WAITING을 보낸 뒤 바뀌면 한 번만 다시 읽는다', async () => {
    const w = fakeWorker('installed');
    const { sw } = fakeContainer({ waiting: w as unknown as SwWorker });
    let apply: (() => void) | null = null;
    const reload = vi.fn();
    await registerServiceWorker(sw, 'https://x.test/app/sw.js', (a) => (apply = a), reload);
    expect(apply).not.toBeNull();
    // 다른 창이 고른 새 판으로 바뀐 것은 이 창을 다시 읽지 않는다
    sw.change();
    expect(reload).not.toHaveBeenCalled();
    apply!();
    expect(w.posted).toEqual([{ type: 'SKIP_WAITING' }]);
    sw.change();
    sw.change();
    expect(reload).toHaveBeenCalledOnce();
  });

  it('쓰는 중에 새 판이 설치되면 그때 알린다(같은 워커는 한 번만)', async () => {
    const w = fakeWorker();
    const { sw } = fakeContainer({ get installing() { return w as unknown as SwWorker; } });
    const onUpdate = vi.fn();
    await registerServiceWorker(sw, 'https://x.test/app/sw.js', onUpdate);
    sw.found();
    w.become('installed');
    w.become('installed');
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it('앱으로 돌아오면 새 판이 있는지 본다(onVisible을 줄 때)', async () => {
    const update = vi.fn(() => Promise.resolve());
    const { sw } = fakeContainer({ update });
    let visible: (() => void) | null = null;
    await registerServiceWorker(sw, 'https://x.test/app/sw.js', vi.fn(), vi.fn(), { onVisible: (fn) => (visible = fn) });
    expect(update).not.toHaveBeenCalled();
    visible!();
    expect(update).toHaveBeenCalledOnce();
    // 문서가 다시 보일 때만
    const listeners: (() => void)[] = [];
    const doc = { visibilityState: 'hidden' as DocumentVisibilityState, addEventListener: (_: string, fn: () => void) => listeners.push(fn) };
    const seen = vi.fn();
    whenVisible(seen, doc as never);
    listeners[0]!();
    expect(seen).not.toHaveBeenCalled();
    doc.visibilityState = 'visible';
    listeners[0]!();
    expect(seen).toHaveBeenCalledOnce();
  });

  it('등록하지 못하거나 서비스 워커가 없으면 조용히 null, 보안 맥락(https·이 컴퓨터)에서만 쓴다', async () => {
    expect(await registerServiceWorker(undefined, 'sw.js', vi.fn())).toBeNull();
    const bad: SwContainer = { controller: null, register: () => Promise.reject(new Error('denied')), addEventListener: () => {} };
    expect(await registerServiceWorker(bad, 'https://x.test/sw.js', vi.fn())).toBeNull();
    expect(canUseServiceWorker({ protocol: 'https:', hostname: 'gyutae-kim.github.io' }, { serviceWorker: {} })).toBe(true);
    expect(canUseServiceWorker({ protocol: 'http:', hostname: '127.0.0.1' }, { serviceWorker: {} })).toBe(true);
    expect(canUseServiceWorker({ protocol: 'http:', hostname: '[::1]' }, { serviceWorker: {} })).toBe(true);
    expect(canUseServiceWorker({ protocol: 'http:', hostname: 'example.test' }, { serviceWorker: {} })).toBe(false);
    expect(canUseServiceWorker({ protocol: 'https:', hostname: 'x' }, {})).toBe(false);
  });

  it('맡기 전에 받은 파일은 앱 범위 안의 것만(조각 # 없이, 겹치지 않게) 알린다', () => {
    const urls = usedResourceUrls([{ name: 'https://x.test/app/assets/en-1.js' }, { name: 'https://x.test/app/assets/en-1.js#x' }, { name: 'https://x.test/other/a.js' }, { name: 'https://cdn.test/a.js' }, { name: 'nonsense' }], 'https://x.test/app/');
    expect(urls).toEqual(['https://x.test/app/assets/en-1.js']);
  });
});

describe('파일 열기(launchQueue)와 공유 받기 주소', () => {
  it('설치한 앱으로 연 파일들을 한꺼번에 넘기고, 못 읽은 것은 뺀다. 파일 없이 ?recent= 주소로 오면 주소를 넘긴다', async () => {
    let consumer: ((p: { files?: { getFile(): Promise<File> }[]; targetURL?: string }) => void) | null = null;
    const w = { launchQueue: { setConsumer: (fn: typeof consumer) => void (consumer = fn) } };
    const open = vi.fn();
    const onUrl = vi.fn();
    expect(consumeLaunchFiles(open, onUrl, w as never)).toBe(true);
    const a = new File(['a'], 'a.tst');
    const b = new File(['b'], 'b.tst');
    consumer!({ files: [{ getFile: async () => a }, { getFile: () => Promise.reject(new Error('gone')) }, { getFile: async () => b }] });
    await new Promise((r) => setTimeout(r, 0));
    expect(open).toHaveBeenCalledWith([a, b]);
    consumer!({ files: [{ getFile: () => Promise.reject(new Error('gone')) }] });
    await new Promise((r) => setTimeout(r, 0));
    expect(open).toHaveBeenCalledOnce();
    consumer!({ files: [], targetURL: 'https://x.test/app/?recent=a.tst%3A1' });
    expect(onUrl).toHaveBeenCalledWith('https://x.test/app/?recent=a.tst%3A1');
    expect(consumeLaunchFiles(open, onUrl, {} as never)).toBe(false);
  });

  it('?recent=·?share-error=를 읽고, 한 번 쓴 뒤에는 다른 인자·조각을 남긴 채 지운다', () => {
    expect(parseLaunchQuery('?recent=a.tst%3A12&lang=en')).toEqual({ recent: 'a.tst:12', shareError: null });
    expect(parseLaunchQuery('?share-error=too-big')).toEqual({ recent: null, shareError: 'too-big' });
    expect(withoutLaunchQuery('https://x.test/app/en/?recent=a&sample&share-error=x#view')).toBe('/app/en/?sample#view');
    expect(withoutLaunchQuery('https://x.test/app/?recent=a')).toBe('/app/');
  });
});
