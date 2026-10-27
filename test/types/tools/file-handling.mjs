/** 앱이 갖는 파일 다루기 정보(예: NC의 share_target·file_handlers) — 형 확인용 */
export function fileHandling(extensions) {
  return { file_handlers: [{ action: './', accept: { 'text/plain': extensions.map((e) => '.' + e) } }] };
}
