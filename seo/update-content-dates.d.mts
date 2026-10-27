/** 내용이 바뀌었으면 at으로 내용 수정일을 올려 historyFile(기본 'site/content-history.json')에 쓴다. 알림 글을 돌려준다 */
export function updateContentDates(options: { pageUrl: string; at: string | undefined; historyFile?: string | URL; root?: string }): string;
