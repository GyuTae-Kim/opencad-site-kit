import type { Plugin } from 'vite';
import type { Site } from './site-metadata.mjs';
export function siteMetadata(site: Site, options?: { nojekyll?: boolean }): Plugin;
