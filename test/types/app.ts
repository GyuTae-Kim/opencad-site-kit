/** 형 확인 전용: 앱 화면 코드가 브라우저 쪽 모듈을 패키지 이름으로 가져와 쓸 때 */
import { initAnalytics, beginOpen, trackExport, type OpenAttempt } from 'opencad-site-kit/analytics';
import { GA4_MEASUREMENT_ID } from 'opencad-site-kit/analytics/config';
import { createLanguageMenu } from 'opencad-site-kit/i18n/language-menu';
import { languages, translate, configureI18n } from 'opencad-site-kit/i18n/core';
import { canUseServiceWorker, consumeLaunchFiles, registerServiceWorker, whenVisible, type SwContainer } from 'opencad-site-kit/pwa/client';

export function start(open: (file: File) => void, offer: (apply: () => void) => void): OpenAttempt {
  configureI18n({ metadata: { url: 'https://gyutae-kim.github.io/opencad-step/' } });
  initAnalytics(GA4_MEASUREMENT_ID, 'step');
  createLanguageMenu(languages, 'ko', async () => {});
  consumeLaunchFiles((files) => open(files[0]!));
  if (canUseServiceWorker(location, navigator))
    void registerServiceWorker(navigator.serviceWorker as unknown as SwContainer, new URL('sw.js', document.baseURI), offer, undefined, { onVisible: whenVisible });
  trackExport('stl');
  translate('열기', 'en', true);
  return beginOpen('local', 'step');
}
