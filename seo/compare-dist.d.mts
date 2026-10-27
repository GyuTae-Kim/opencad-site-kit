export interface DistDifference { file: string; status: 'same' | 'same-but-asset-names' | 'changed' | 'added' | 'removed'; line?: number; column?: number; before?: string; after?: string }
/** 자산 이름의 내용 지문을 '#'로 */
export function normalizeAssetNames(text: string): string;
/** 두 빌드 결과(dist)를 파일마다 견준다(자산 이름 지문은 맞춘 뒤) */
export function compareDist(before: string, after: string): DistDifference[];
export function formatComparison(rows: DistDifference[]): string;
