/**
 * OpenCAD 사이트의 방문 통계 설정(presets/opencad의 OPENCAD_ANALYTICS)을 다시 내보낸다.
 * 다른 사이트는 이 값을 쓰지 말고 자기 AnalyticsConfig(측정 ID·호스트·공개 경로)를 만든다.
 */
import { OPENCAD_ANALYTICS } from '../presets/opencad.mjs';

export { OPENCAD_ANALYTICS };
/** @deprecated 0.2.0부터 initAnalytics는 설정 전체를 받는다 — OPENCAD_ANALYTICS를 넘긴다 */
export const GA4_MEASUREMENT_ID = OPENCAD_ANALYTICS.measurementId;
