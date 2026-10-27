export interface WebManifest { name: string; short_name: string; description: string; icons: { src: string; [key: string]: unknown }[]; id?: string; [key: string]: unknown; }
export function manifestPath(language?: string): string;
export function localizeManifest<T extends { name: string; short_name: string; description: string; icons: { src: string }[] }>(manifest: T, language: string): T;
export function manifestJson(manifest: unknown): string;
