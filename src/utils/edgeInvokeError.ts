/**
 * Edge Function 호출 오류 분류 유틸
 *
 * 모바일 환경(iOS 백그라운드 전환, 네트워크 스위칭)에서는
 * "Failed to send a request to the Edge Function" 같은 일시 오류가 빈번합니다.
 * 해당 오류는 기능 폴백/재시도로 처리하고, 불필요한 치명 알림은 줄입니다.
 */

const TRANSIENT_EDGE_PATTERNS: RegExp[] = [
  /Failed to send a request to the Edge Function/i,
  /network request failed/i,
  /failed to fetch/i,
  /load failed/i,
  /timed out/i,
  /타임아웃/i,
  /connection.+offline/i,
  /internet connection appears to be offline/i,
  /AbortError/i,
];

export function edgeInvokeErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || String(error);

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function isTransientEdgeInvokeError(error: unknown): boolean {
  const message = edgeInvokeErrorMessage(error);
  return TRANSIENT_EDGE_PATTERNS.some((pattern) => pattern.test(message));
}

