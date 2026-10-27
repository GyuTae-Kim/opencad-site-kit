/** 내용 수정일 기록 하나(site/content-history.json) */
export interface ContentRecord { lastmod: string; fingerprint: string; }
export function digest(bytes: string | Uint8Array): string;
/** 쪽 내용(제목·대표 주소·공유 정보·구조화 자료·main 본문·main 그림)의 지문. 날짜와 스크립트·스타일은 빼서 다시 빌드해도 같다 */
export function contentFingerprint(html: string, assetBytes: (pathname: string) => string | Uint8Array, pageUrl?: string): string;
/** YYYY-MM-DDTHH:mm:ssZ 꼴의 지나간 UTC 시각인지 본다(아니면 던진다) */
export function validateDate(value: unknown, now?: Date): string;
/** 기록한 지문이 지금 지문과 같은지 본다(다르면 update:content-dates를 하라고 던진다) */
export function assertContentDate(path: string, record: ContentRecord | undefined, fingerprint: string): void;
/** 지문이 바뀐 쪽만 at으로 날짜를 올린 새 기록 */
export function updatedHistory(history: Record<string, ContentRecord>, fingerprints: Record<string, string>, at: string, now?: Date): Record<string, ContentRecord>;
