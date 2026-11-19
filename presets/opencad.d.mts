import type { SiteRoutes } from '../i18n/core.mjs';

export const OPENCAD_HOST: 'gyutae-kim.github.io';
export const OPENCAD_SITE: { routes: SiteRoutes; untranslated: string[] };
export type OpenCadTool = 'portfolio' | 'dwgdxf' | 'nc' | 'step' | 'skp';
export const OPENCAD_ANALYTICS: {
  measurementId: string;
  host: string;
  consentKey: string;
  apps: Record<OpenCadTool, { path: string; title: string; group: string; site?: boolean }>;
  sourceTool(url: URL): string | null;
};
