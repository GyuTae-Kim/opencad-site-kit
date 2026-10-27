import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// 저장소 안의 시험·합성 앱이 'opencad-site-kit/…'를 앱처럼 가져오도록 package.json exports를 그대로 별칭으로 둔다.
const root = fileURLToPath(new URL('.', import.meta.url));
const exportsMap = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).exports as Record<string, string | { default: string }>;
const alias = Object.entries(exportsMap)
  .filter(([key]) => key !== './package.json')
  .map(([key, target]) => ({ find: new RegExp(`^opencad-site-kit${key.slice(1).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`), replacement: root + (typeof target === 'string' ? target : target.default).slice(2) }));

// 시험은 test/ 아래. 갈래 비교 시험(test/variants)은 .runtime/variants가 있을 때만 돈다(npm run variants로 앱 저장소에서 꺼낸다).
export default defineConfig({
  resolve: { alias },
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 120_000,
  },
});
