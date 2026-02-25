/**
 * 콘텐츠 신선도 서비스
 *
 * 역할: "방문 이력 관리실" — 유저가 이미 본 마을 대화/이벤트/뉴스를 기억해두고,
 *       다음번엔 새로운 콘텐츠를 우선 보여주도록 필터링.
 * 비유: 동물의숲에서 이미 들었던 이웃 대사를 기억해 반복 안 시키는 시스템
 *
 * 저장: AsyncStorage (기기 로컬, 최대 200항목 per 타입)
 * 부하: 매우 가벼움 — JSON 직렬화/역직렬화만 수행, API 호출 없음
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const SEEN_CONTENT_KEY = '@baln:village_seen_content';
/** 타입별 최대 보관 개수 (초과 시 오래된 것부터 제거) */
const MAX_HISTORY = 200;
/** 정리 주기: 7일 이상 지나면 자동 cleanup */
const CLEANUP_INTERVAL_DAYS = 7;

// ---------------------------------------------------------------------------
// 내부 타입
// ---------------------------------------------------------------------------

interface SeenContent {
  /** 이미 본 대화 트리거 해시 목록 */
  conversations: string[];
  /** 이미 본 대화 라인 해시 목록 */
  dialogues: string[];
  /** 이미 참여/조회한 이벤트 ID 목록 */
  events: string[];
  /** 이미 본 뉴스 헤드라인 해시 목록 */
  newsTopics: string[];
  /** 마지막 cleanup 실행 일시 (ISO 8601) */
  lastCleanup: string;
}

type SeenContentType = keyof Omit<SeenContent, 'lastCleanup'>;

const EMPTY_SEEN: SeenContent = {
  conversations: [],
  dialogues: [],
  events: [],
  newsTopics: [],
  lastCleanup: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// 내부 헬퍼 — 스토리지 읽기/쓰기
// ---------------------------------------------------------------------------

async function loadSeen(): Promise<SeenContent> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_CONTENT_KEY);
    if (!raw) return { ...EMPTY_SEEN };
    const parsed = JSON.parse(raw) as SeenContent;
    // 누락 필드 보정 (버전 업 대비)
    return {
      conversations: parsed.conversations ?? [],
      dialogues: parsed.dialogues ?? [],
      events: parsed.events ?? [],
      newsTopics: parsed.newsTopics ?? [],
      lastCleanup: parsed.lastCleanup ?? new Date().toISOString(),
    };
  } catch {
    return { ...EMPTY_SEEN };
  }
}

async function saveSeen(seen: SeenContent): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_CONTENT_KEY, JSON.stringify(seen));
  } catch (err) {
    if (__DEV__) console.warn('[Freshness] 저장 실패:', err);
  }
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

/**
 * 특정 콘텐츠를 "이미 봤음"으로 기록
 *
 * @param type - 콘텐츠 종류 ('conversations' | 'dialogues' | 'events' | 'newsTopics')
 * @param contentId - 고유 식별자 (해시 또는 원본 ID)
 */
export async function markSeen(
  type: SeenContentType,
  contentId: string,
): Promise<void> {
  const seen = await loadSeen();
  const list = seen[type];

  if (!list.includes(contentId)) {
    list.push(contentId);
    // MAX_HISTORY 초과 시 오래된 항목 앞에서 제거
    if (list.length > MAX_HISTORY) {
      list.splice(0, list.length - MAX_HISTORY);
    }
    seen[type] = list;
    await saveSeen(seen);
  }
}

/**
 * 특정 콘텐츠를 최근에 본 적 있는지 확인
 *
 * @returns true = 이미 봄, false = 아직 안 봄 (신선 콘텐츠)
 */
export async function wasSeen(
  type: SeenContentType,
  contentId: string,
): Promise<boolean> {
  const seen = await loadSeen();
  return seen[type].includes(contentId);
}

/**
 * 목록에서 아직 안 본 신선 콘텐츠만 필터링해서 반환
 * 신선 항목이 하나도 없으면 전체 목록을 그대로 반환 (완전 고갈 방지)
 *
 * @param items - 전체 후보 목록
 * @param type - 콘텐츠 종류
 * @param getContentId - 아이템 → 콘텐츠 ID 변환 함수
 */
export async function filterFreshContent<T>(
  items: T[],
  type: SeenContentType,
  getContentId: (item: T) => string,
): Promise<T[]> {
  if (items.length === 0) return [];

  const seen = await loadSeen();
  const seenSet = new Set(seen[type]);

  const fresh = items.filter(item => !seenSet.has(getContentId(item)));

  if (__DEV__) {
    console.log(
      `[Freshness] ${type}: 전체 ${items.length}개 중 신선 ${fresh.length}개`,
    );
  }

  // 신선 콘텐츠가 없으면 전체 반환 (반복 허용 — 고갈 방지)
  return fresh.length > 0 ? fresh : items;
}

/**
 * 문자열 콘텐츠를 간단한 해시 ID로 변환
 * (긴 대화 문장을 짧은 키로 저장하기 위해 사용)
 *
 * 사용 예: hashContent("시장이 이렇게 무섭다니...") → "f3a2b1"
 */
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    // 32비트 정수 범위 유지
    hash = hash & hash;
  }
  // 양수 hex 문자열로 변환 (6자리)
  return Math.abs(hash).toString(16).padStart(6, '0').substring(0, 6);
}

/**
 * 오래된 이력 정리 — 각 타입별로 MAX_HISTORY 초과분 제거
 * CLEANUP_INTERVAL_DAYS 이상 지난 경우에만 실행 (불필요한 I/O 방지)
 */
export async function cleanupHistory(): Promise<void> {
  const seen = await loadSeen();

  const lastCleanupDate = new Date(seen.lastCleanup).getTime();
  const daysSince = (Date.now() - lastCleanupDate) / (1000 * 60 * 60 * 24);

  if (daysSince < CLEANUP_INTERVAL_DAYS) {
    if (__DEV__) {
      console.log(`[Freshness] cleanup 불필요 (마지막 정리 ${daysSince.toFixed(1)}일 전)`);
    }
    return;
  }

  const types: SeenContentType[] = ['conversations', 'dialogues', 'events', 'newsTopics'];
  let cleaned = false;

  for (const type of types) {
    if (seen[type].length > MAX_HISTORY) {
      seen[type] = seen[type].slice(-MAX_HISTORY);
      cleaned = true;
    }
  }

  seen.lastCleanup = new Date().toISOString();
  await saveSeen(seen);

  if (__DEV__) {
    console.log(`[Freshness] cleanup 완료 (정리됨: ${cleaned})`);
  }
}

/**
 * 마을 신선도 점수 계산 (0~100)
 * 아직 안 본 콘텐츠의 비율을 기반으로 계산
 *
 * 100 = 모든 콘텐츠가 새로움
 * 0   = 모든 콘텐츠를 이미 봄
 *
 * @param availableConversations - 현재 로드된 대화 수
 * @param availableEvents - 현재 활성 이벤트 수
 */
export async function calculateFreshnessScore(
  availableConversations: number,
  availableEvents: number,
): Promise<number> {
  if (availableConversations === 0 && availableEvents === 0) return 50;

  const seen = await loadSeen();

  const totalAvailable = availableConversations + availableEvents;
  const totalSeen = new Set([
    ...seen.conversations,
    ...seen.events,
  ]).size;

  // 본 콘텐츠 비율 계산 (100 = 모두 새것, 0 = 모두 봄)
  const seenRatio = Math.min(totalSeen / Math.max(totalAvailable, 1), 1);
  const score = Math.round((1 - seenRatio) * 100);

  if (__DEV__) {
    console.log(
      `[Freshness] 점수: ${score} (총 ${totalAvailable}개 중 ${totalSeen}개 봄)`,
    );
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Gemini 프롬프트에 주입할 "중복 방지" 접미사 생성
 *
 * 최근에 본 대화 주제 해시 목록을 Gemini 프롬프트에 포함시켜,
 * 모델이 유사한 주제를 반복 생성하지 않도록 유도.
 *
 * 사용 예:
 *   const suffix = await getFreshnessPromptSuffix();
 *   const prompt = `대화를 생성해주세요.\n${suffix}`;
 */
export async function getFreshnessPromptSuffix(): Promise<string> {
  try {
    const seen = await loadSeen();
    const recentConversations = seen.conversations.slice(-20);
    const recentNews = seen.newsTopics.slice(-10);

    if (recentConversations.length === 0 && recentNews.length === 0) {
      return '';
    }

    const parts: string[] = [];

    if (recentConversations.length > 0) {
      parts.push(
        `[중복 방지] 최근 생성된 대화 트리거 해시: ${recentConversations.join(', ')}. 이와 유사한 주제는 피해주세요.`,
      );
    }

    if (recentNews.length > 0) {
      parts.push(
        `[뉴스 중복 방지] 최근 다룬 뉴스 해시: ${recentNews.join(', ')}. 같은 뉴스 반응은 피해주세요.`,
      );
    }

    return parts.join('\n');
  } catch {
    return '';
  }
}

/**
 * 모든 신선도 이력 초기화 (디버그/테스트용)
 * 프로덕션에서는 사용자 계정 탈퇴 시만 호출
 */
export async function resetFreshnessHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEEN_CONTENT_KEY);
    if (__DEV__) console.log('[Freshness] 이력 초기화 완료');
  } catch (err) {
    if (__DEV__) console.warn('[Freshness] 초기화 실패:', err);
  }
}
