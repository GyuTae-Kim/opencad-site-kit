/** 형 확인 전용: 앱 화면 코드가 브라우저 쪽 모듈을 패키지 이름으로 가져와 쓸 때 */
import { initAnalytics, beginOpen, trackExport, type AnalyticsConfig, type OpenAttempt } from 'opencad-site-kit/analytics';
import { OPENCAD_ANALYTICS as FROM_CONFIG } from 'opencad-site-kit/analytics/config';
import { OPENCAD_ANALYTICS, OPENCAD_SITE } from 'opencad-site-kit/presets/opencad';
import { createLanguageMenu } from 'opencad-site-kit/i18n/language-menu';
import { languages, translate, configureI18n } from 'opencad-site-kit/i18n/core';
import { canUseServiceWorker, consumeLaunchFiles, registerServiceWorker, whenVisible, type SwContainer } from 'opencad-site-kit/pwa/client';
import { acceptEmbeddedFiles, isFramed } from 'opencad-site-kit/embed/app';
import { appForName, type OpenCadErrorCode, type OpenCadViewer, type OpenCadViewerAttributes } from 'opencad-site-kit/embed';

export function start(open: (file: File) => Promise<boolean>, offer: (apply: () => void) => void): OpenAttempt {
  configureI18n({ metadata: { url: 'https://gyutae-kim.github.io/opencad-step/' }, ...OPENCAD_SITE });
  initAnalytics(OPENCAD_ANALYTICS, 'step');
  const other: AnalyticsConfig = { measurementId: 'G-X', host: 'cad.example.com', apps: { viewer: { path: '/viewer/', title: 'Viewer' } } };
  if (FROM_CONFIG !== OPENCAD_ANALYTICS) initAnalytics(other, 'viewer');
  createLanguageMenu(languages, 'ko', async () => {});
  consumeLaunchFiles((files) => void open(files[0]!));
  acceptEmbeddedFiles((files) => open(files[0]!), { accept: ['.step', '.stp'] });
  if (canUseServiceWorker(location, navigator) && !isFramed())
    void registerServiceWorker(navigator.serviceWorker as unknown as SwContainer, new URL('sw.js', document.baseURI), offer, undefined, { onVisible: whenVisible });
  trackExport('stl');
  translate('열기', 'en', true);
  return beginOpen('local', 'step');
}

/** 호스트 페이지: <opencad-viewer> 요소 */
export async function embed(file: File): Promise<string | null> {
  const viewer: OpenCadViewer | null = document.querySelector('opencad-viewer');
  // 이벤트 detail은 형 변환 없이 잡힌다(요소에서, 그리고 올라온 것을 document·window에서)
  viewer?.addEventListener('opencad-ready', (event) => console.log(event.detail.accept?.join(', ') ?? '모든 형식'));
  viewer?.addEventListener('opencad-error', (event) => {
    const code: OpenCadErrorCode | string = event.detail.code;
    if (code === 'timeout') console.log('앱이 답하지 않음', event.detail.id);
  });
  document.addEventListener('opencad-done', (event) => console.log(event.detail.id));
  window.addEventListener('opencad-error', (event) => console.log(event.detail.code));
  const made = document.createElement('opencad-viewer');
  made.setAttribute('app', 'step');
  // 프레임워크처럼 값으로 넣기
  made.app = 'nc';
  made.app = null;
  made.sample = true;
  const props: OpenCadViewerAttributes = { src: '/m/a.step', app: 'step', lang: 'en', loading: 'lazy', sample: false };
  for (const [name, value] of Object.entries(props)) if (typeof value === 'string') made.setAttribute(name, value);
  await made.open(file);
  await viewer?.open(file, file.name);
  return viewer?.app ?? appForName(file.name);
}
