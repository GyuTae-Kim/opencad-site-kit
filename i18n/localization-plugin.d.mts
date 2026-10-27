import type { Plugin } from 'vite';
import type { Site } from '../seo/site-metadata.mjs';
export { localizeManifest } from '../pwa/manifest.mjs';
export function siteLocalization(site: Site): Plugin;
export function localizeHtml(html: string, language: string, site: Site): string;
