import type { ContentHistory, SiteMetadata } from './site-metadata.mjs';
/** 빌드 결과(root, 기본 'dist')의 검색 정보·내용 수정일 확인. 어긋나면 던지고, 통과하면 통과 글을 돌려준다 */
export function checkSeo(options: { metadata: SiteMetadata; history: ContentHistory; root?: string }): string;
