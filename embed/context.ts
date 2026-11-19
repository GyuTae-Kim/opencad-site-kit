/**
 * 이 문서가 다른 페이지 안(iframe)에 있는지. 다른 사이트에 넣은 앱은 방문 통계·서비스 워커(오프라인·새 판 알림)를 쓰지 않는다 —
 * 남의 페이지 안에서 동의 상자·새로 고침 알림을 띄우지 않고, 그 사이트 방문을 이 사이트 통계에 섞지 않는다.
 */
export interface FrameWindow {
  readonly self: unknown;
  readonly top: unknown;
}

export function isFramed(w: FrameWindow | undefined = typeof window === 'undefined' ? undefined : window): boolean {
  if (!w) return false;
  try {
    return w.self !== w.top;
  } catch {
    // 다른 출처의 top을 읽지 못하면 안쪽이다
    return true;
  }
}
