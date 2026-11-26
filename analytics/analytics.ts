/** First-party GA4 adapter. Never pass file names, model data, URLs or exception text to events. */
import { isFramed } from '../embed/context';

/** Name of a page or app in AnalyticsConfig.apps (OpenCAD: portfolio, dwgdxf, nc, step, skp). */
export type AnalyticsTool = string;
export type InputKind = 'local' | 'sample' | 'url';
export type OpenError = 'size_limit' | 'read_error' | 'fetch_error' | 'unsupported' | 'empty' | 'parse_error';
export type ExportFormat = 'png' | 'jpg' | 'bmp' | 'pdf' | 'svg' | 'dxf' | 'dwg' | 'stl' | 'obj' | 'csv';
export type ContentGroup = string;

/** A public page identity: GA never sees the document title or the real address. */
export interface AnalyticsPage {
  /** Public entry path ending in "/". Language pages are one level below it (/app/en/). */
  path: string;
  /** Public page title recorded instead of the document title. */
  title: string;
  /** content_group (default: "app", or "site" for a site). */
  group?: ContentGroup;
  /** A routed site: pages are reported with trackPage, including the first one. */
  site?: boolean;
}

export interface ConsentText {
  label: string;
  message: string;
  allow: string;
  limited: string;
  deny: string;
}

/** Everything that belongs to one site. OpenCAD's values: OPENCAD_ANALYTICS in opencad-site-kit/presets/opencad. */
export interface AnalyticsConfig {
  /** GA4 measurement ID (G-...). */
  measurementId: string;
  /** Collect only on https pages of this host; also the cookie domain. */
  host: string;
  /** Public identities by tool name. Links to another non-site entry on the host send viewer_open. */
  apps: Readonly<Record<string, AnalyticsPage>>;
  /** localStorage key of the visitor's choice. */
  consentKey?: string;
  /**
   * Storage key that tags owner and QA visits with traffic_type=internal, for a GA4
   * "Internal Traffic" data filter. `#ga-internal=on|off` marks or clears this
   * browser (localStorage); a `utm_source=qa` link marks only the tab (sessionStorage).
   */
  internalKey?: string;
  /** Extensions recorded as file_format (others become "other"). */
  formats?: readonly string[];
  /** target_tool for a clicked source repository link (source_open), or null. */
  sourceTool?: (url: URL) => string | null;
  /** Consent box copy (default Korean). */
  text?: Partial<ConsentText>;
}

const LANGUAGE = 'en|ja|zh-CN|de';
const DEFAULT_FORMATS = ['skp', 'step', 'stp', 'p21', 'stpz', 'stpx', 'zip', 'gz', 'dxf', 'dwg', 'nc', 'gcode', 'ngc', 'h', 'mpr', 'pgi', 'xml'];
const DEFAULT_TEXT: ConsentText = {
  label: '방문 통계 설정',
  message: '허용하면 쿠키로 유입·기능 통계를 수집합니다. 거절하면 쿠키 없이 기본 방문 신호만 Google Analytics로 전송합니다. 파일명·내용·입력 주소는 보내지 않습니다. 푸터나 앱 메뉴에서 변경할 수 있습니다.',
  allow: '허용',
  limited: '거절 (기본 방문만)',
  deny: '수집 안 함',
};
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
interface Site { host: string; apps: Readonly<Record<string, AnalyticsPage>>; consentKey: string; internalKey: string; formats: ReadonlySet<string>; sourceTool?: (url: URL) => string | null; text: ConsentText }
let site: Site | undefined;
const DEFAULT_FORMAT_SET: ReadonlySet<string> = new Set(DEFAULT_FORMATS);
let active: { id: string; tool: AnalyticsTool } | undefined;
let started = false;
// Legacy "denied" keeps its original meaning: no Google requests at all.
type Consent = 'granted' | 'limited' | 'denied' | null;
let consent: Consent = null;
let pagePath = '/';
let pageTitle = '';
let pageGroup: ContentGroup = '';
let pageReferrer = '';
let lastPage = '';
let pageReady = false;
let internal = false;

/** Only published app entry paths may become page identities. */
function publicAppPath(tool: AnalyticsTool, pathname: string): string {
  const root = site!.apps[tool]!.path;
  if (!pathname.startsWith(root)) return root;
  const language = pathname.slice(root.length).match(new RegExp(`^(${LANGUAGE})(?:\\/(?:index\\.html)?)?$`))?.[1];
  return language ? `${root}${language}/` : root;
}

/**
 * Whether this visit is the owner's or a QA run (see AnalyticsConfig.internalKey).
 * Storage failures count as an ordinary visit and never block the page.
 */
export function internalTraffic(search: string, hash: string, key: string, store: { local?: Storage; session?: Storage } = {}): boolean {
  try {
    const local = store.local ?? localStorage;
    const session = store.session ?? sessionStorage;
    const toggle = /^#(?:.*&)?ga-internal=(on|off)(?:&|$)/.exec(hash)?.[1];
    if (toggle === 'on') local.setItem(key, '1');
    if (toggle === 'off') { local.removeItem(key); session.removeItem(key); }
    if (new URLSearchParams(search).get('utm_source')?.toLowerCase() === 'qa') session.setItem(key, '1');
    return local.getItem(key) === '1' || session.getItem(key) === '1';
  } catch { return false; }
}

/** Keep campaign slugs, excluding user-supplied file/URL parameters and fragments. */
export function campaignQuery(search: string): string {
  const out = new URLSearchParams();
  const input = new URLSearchParams(search);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = input.get(key);
    if (value && /^[a-z0-9][a-z0-9_-]{0,79}$/i.test(value)) out.set(key, value);
  }
  return out.toString() ? `?${out}` : '';
}

function referrer(): string {
  try { return new URL(document.referrer).origin; } catch { return ''; }
}

function fields(): Record<string, string> {
  const root = site!.apps[active!.tool]!.path;
  const relative = pagePath.startsWith(root) ? pagePath.slice(root.length) : pagePath.replace(/^\//, '');
  const pageLanguage = relative.match(new RegExp(`^(${LANGUAGE})(?:\\/|$)`))?.[1] ?? 'ko';
  return { tool: active!.tool, page_title: pageTitle, content_group: pageGroup, page_language: pageLanguage, page_location: `https://${site!.host}${pagePath}${consent === 'granted' ? campaignQuery(location.search) : ''}`, page_referrer: consent === 'granted' ? pageReferrer : '', ...(internal ? { traffic_type: 'internal' } : {}) };
}

function send(name: string, params: Record<string, string | number> = {}): void {
  if (consent !== 'granted' || !started || !active) return;
  try { (window as AnalyticsWindow).gtag?.('event', name, { ...params, ...fields(), send_to: active.id }); } catch { /* Analytics never interrupts CAD. */ }
}

function pageView(): void {
  if (!started || !active || !pageReady || (consent !== 'granted' && consent !== 'limited') || lastPage === pagePath) return;
  const w = window as AnalyticsWindow;
  // Also pin automatic engagement/session events to public titles and locations.
  try {
    w.gtag?.('set', fields());
  } catch { return; }
  try { w.gtag?.('event', 'page_view', { ...fields(), send_to: active.id }); } catch { return; }
  lastPage = pagePath;
}

function start(): void {
  if (!active || started || (consent !== 'granted' && consent !== 'limited')) return;
  const w = window as AnalyticsWindow;
  w.dataLayer ??= [];
  w.gtag ??= function (..._args: unknown[]): void { w.dataLayer!.push(arguments); };
  w.gtag('consent', 'default', { analytics_storage: consent === 'granted' ? 'granted' : 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
  w.gtag('js', new Date());
  w.gtag('set', { ...fields(), allow_google_signals: false, allow_ad_personalization_signals: false, ads_data_redaction: true, url_passthrough: false });
  // Configure once per document. Route metadata lives in global set/event parameters.
  w.gtag('config', active.id, { send_page_view: false, cookie_domain: site!.host, cookie_path: '/', allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.id = 'opencad-ga4';
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${active.id}`;
  document.head.append(script);
  started = true;
  pageView();
}

function storedConsent(value: string | null): Consent {
  return value === 'granted' || value === 'limited' || value === 'denied' ? value : null;
}

function choice(): Consent {
  try { return storedConsent(localStorage.getItem(site!.consentKey)); } catch { return null; }
}

function choose(value: Consent, persist = true): void {
  if (persist) {
    try { if (value) localStorage.setItem(site!.consentKey, value); else localStorage.removeItem(site!.consentKey); } catch { /* Session-only choice. */ }
  }
  const previous = consent;
  consent = value;
  const collecting = value === 'granted' || value === 'limited';
  (window as unknown as Record<string, unknown>)[`ga-disable-${active!.id}`] = !collecting;
  if (value !== 'granted') {
    for (const cookie of document.cookie.split(';')) {
      const key = cookie.trim().split('=')[0]!;
      if (/^_ga(?:_|$)/.test(key)) {
        document.cookie = `${key}=; Max-Age=0; path=/; domain=${site!.host}`;
        document.cookie = `${key}=; Max-Age=0; path=/`;
      }
    }
  }
  if (started && previous !== value) {
    try {
      const w = window as AnalyticsWindow;
      w.gtag?.('set', fields());
      w.gtag?.('consent', 'update', { analytics_storage: value === 'granted' ? 'granted' : 'denied' });
    } catch { /* Blocked tag. */ }
  }
  if (collecting) { start(); pageView(); }
  // Do not echo storage events to other tabs or create an extra page_view on a setting change.
  controls(value === null);
}

function controls(expanded: boolean): void {
  document.getElementById('opencad-analytics-choice')?.remove();
  if (!expanded) return;
  const box = document.createElement('aside');
  box.id = 'opencad-analytics-choice';
  const copy = site!.text;
  box.setAttribute('aria-label', copy.label);
  box.style.cssText = 'position:fixed;bottom:12px;right:12px;z-index:10000;box-sizing:border-box;width:340px;max-width:calc(100vw - 24px);padding:10px;border:1px solid #888;border-radius:6px;background:Canvas;color:CanvasText;font:13px/1.5 system-ui;box-shadow:0 2px 8px #0002';
  const button = (label: string, run: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = label;
    b.style.cssText = 'margin:4px;padding:6px 10px;font:inherit;cursor:pointer';
    b.addEventListener('click', run);
    return b;
  };
  const text = document.createElement('p');
  text.style.margin = '0 0 6px';
  text.textContent = copy.message;
  box.append(text, button(copy.allow, () => choose('granted')), button(copy.limited, () => choose('limited')), button(copy.deny, () => choose('denied')));
  document.body.append(box);
}

/** Reopen from a normal footer/menu, without a persistent floating button. */
export function showAnalyticsSettings(): void {
  if (active) controls(true);
}

/**
 * Published pages of config.host only; no Google request until the visitor makes a choice.
 * Never inside a frame: an app embedded in another site does not count that site's visitors or ask them for consent.
 */
export function initAnalytics(config: AnalyticsConfig, tool: AnalyticsTool): void {
  try { initialize(config, tool); } catch { /* Tracking failures never prevent opening the app. */ }
}

function configured(config: AnalyticsConfig): Site {
  if (!config || typeof config !== 'object') throw new Error('initAnalytics: a site configuration is required.');
  const apps = config.apps ?? {};
  for (const page of Object.values(apps)) if (typeof page?.path !== 'string' || !/^\/(?:.*\/)?$/.test(page.path) || typeof page.title !== 'string') throw new Error('initAnalytics: each app needs a path ending in "/" and a title.');
  return {
    host: config.host, apps, consentKey: config.consentKey ?? 'analytics-consent.v1', internalKey: config.internalKey ?? 'analytics-internal.v1',
    formats: new Set((config.formats ?? DEFAULT_FORMATS).map((format) => format.toLowerCase())), sourceTool: config.sourceTool,
    text: { ...DEFAULT_TEXT, ...config.text },
  };
}

function initialize(config: AnalyticsConfig, tool: AnalyticsTool): void {
  if (typeof window === 'undefined' || active || isFramed()) return;
  const settings = configured(config);
  const id = config.measurementId;
  const page = settings.apps[tool];
  if (!page || location.hostname !== settings.host || location.protocol !== 'https:' || typeof id !== 'string' || !/^G-[A-Z0-9]+$/.test(id)) return;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.globalPrivacyControl || nav.doNotTrack === '1') return;
  site = settings;
  active = { id, tool };
  internal = internalTraffic(location.search, location.hash, settings.internalKey);
  pagePath = publicAppPath(tool, location.pathname); pageTitle = page.title;
  pageGroup = page.group ?? (page.site ? 'site' : 'app');
  pageReferrer = referrer();
  pageReady = !page.site;
  choose(choice(), false);
  window.addEventListener('storage', (event) => {
    if (event.key === settings.consentKey || event.key === null) choose(event.key === null ? null : storedConsent(event.newValue), false);
  });
  // App localization replaces the URL and emits a non-bubbling event at #app.
  // Capture it without changing each consumer or trusting event detail as data.
  document.addEventListener('languagechange', () => {
    if (!active || settings.apps[active.tool]!.site) return;
    const nextPath = publicAppPath(active.tool, location.pathname);
    if (nextPath === pagePath) return;
    // Until the first recorded visit, retain the original external referrer.
    // A pre-consent language change must not turn organic traffic into direct.
    if (lastPage) pageReferrer = `https://${settings.host}${lastPage}`;
    pagePath = nextPath;
    pageView();
  }, true);
  document.addEventListener('click', (event) => {
    const link = (event.target instanceof Element ? event.target.closest('a[href]') : null) as HTMLAnchorElement | null;
    if (!link) return;
    try {
      const url = new URL(link.href);
      const target = Object.keys(settings.apps).find((key) => !settings.apps[key]!.site && url.pathname.replace(/\/$/, '') === settings.apps[key]!.path.replace(/\/$/, ''));
      if (url.hostname === settings.host && target) send('viewer_open', { target_tool: target });
      else {
        const source = settings.sourceTool?.(url);
        if (source) send('source_open', { target_tool: source });
      }
    } catch { /* Non-HTTP links are irrelevant. */ }
  });
}

/** Call after SEO updates on an Angular navigation; never pass document-specific titles. */
export function trackPage(path: string, title: string, group?: ContentGroup): void {
  const page = active && site!.apps[active.tool];
  if (!page?.site) return;
  const nextPath = path.startsWith('/') ? path.split(/[?#]/)[0]! : '/404';
  if (pageReady && pagePath !== nextPath) pageReferrer = `https://${site!.host}${pagePath}`;
  pagePath = nextPath;
  pageTitle = title;
  pageGroup = group ?? page.group ?? 'site';
  pageReady = true;
  pageView();
}

export interface OpenAttempt { success(): void; error(code: OpenError): void }
export function beginOpen(input: InputKind, format: string): OpenAttempt {
  const safeFormat = (site?.formats ?? DEFAULT_FORMAT_SET).has(format.toLowerCase()) ? format.toLowerCase() : 'other';
  const startAt = performance.now();
  const params = { input_kind: input, file_format: safeFormat };
  let done = false;
  send('file_open_start', params);
  return {
    success(): void {
      if (done) return; done = true;
      send(input === 'sample' ? 'sample_open_success' : 'file_open_success', { ...params, duration_ms: Math.min(3_600_000, Math.max(0, Math.round(performance.now() - startAt))) });
    },
    error(code): void {
      if (done) return; done = true;
      send(input === 'sample' ? 'sample_open_error' : 'file_open_error', { ...params, error_code: code });
    },
  };
}

export function trackExport(format: ExportFormat): void { send('export_complete', { export_format: format }); }
