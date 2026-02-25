/**
 * villageTutorialService — 마을 첫 경험 튜토리얼 시스템
 *
 * 역할: "마을 가이드" — 신규 유저가 발른 마을에 처음 들어왔을 때
 *       8단계 미션을 통해 핵심 기능을 자연스럽게 체험하도록 안내
 *
 * 비유: 회사 신입 직원 온보딩 담당자 — "이 버튼은 이렇게 쓰는 거야"
 *       라고 직접 알려주되, 보상을 주며 즐겁게 익히도록 함
 *
 * 설계 원칙 (이승건):
 *   "보상(크레딧)으로 교육을 감싸면 사용자는 성장하는 줄도 모르고 따라온다"
 *
 * 사용처:
 * - app/roundtable/ 또는 app/(tabs)/village.tsx 에서 초기화
 * - src/components/village/VillageTutorialOverlay.tsx 에서 UI 표시
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// 상수
// ---------------------------------------------------------------------------

const TUTORIAL_KEY = 'village_tutorial_state';

// ---------------------------------------------------------------------------
// 타입
// ---------------------------------------------------------------------------

export interface TutorialStep {
  /** 고유 식별자 (스텝 완료 체크에 사용) */
  id: string;
  /** 순서 (1부터 시작) */
  order: number;
  /** 한국어 제목 */
  title: string;
  /** 영어 제목 */
  titleEn: string;
  /** 한국어 설명 */
  description: string;
  /** 영어 설명 */
  descriptionEn: string;
  /** 이 스텝을 안내하는 구루 ID */
  guruId: string;
  /** 하이라이트할 마을 구역 (없으면 전체 마을 표시) */
  targetZone?: string;
  /** 완료 조건 — 이 행동을 하면 스텝 완료 */
  targetAction?: 'tap_guru' | 'read_card' | 'vote_prediction' | 'open_letter' | 'check_weather';
  /** 스텝 완료 시 지급 보상 */
  reward?: {
    credits: number;
    message: string;
    messageEn: string;
  };
}

export interface TutorialState {
  completedSteps: string[]; // 완료된 스텝 ID 목록
  isComplete: boolean;      // 전체 튜토리얼 완료 여부
  skipped: boolean;         // 사용자가 건너뜀 여부
  startedAt: string;        // 튜토리얼 시작 일시 (ISO 8601)
  completedAt?: string;     // 전체 완료 일시 (ISO 8601)
}

// ---------------------------------------------------------------------------
// 튜토리얼 8단계 정의
// ---------------------------------------------------------------------------

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    order: 1,
    title: '마을에 오신 걸 환영해요!',
    titleEn: 'Welcome to Baln Village!',
    description: '여기는 발른 마을이에요. 투자 대가들이 모여 사는 곳이죠. 저 워렌 버핏이 함께 안내해 드릴게요.',
    descriptionEn: "Welcome to Baln Village! I'm Warren Buffett, and I'll be your guide through this village of investment masters.",
    guruId: 'buffett',
    targetZone: 'square',
    reward: {
      credits: 2,
      message: '마을 도착 기념 크레딧 지급!',
      messageEn: 'Welcome bonus credits awarded!',
    },
  },
  {
    id: 'tap_guru',
    order: 2,
    title: '구루에게 말 걸기',
    titleEn: 'Chat with a Guru',
    description: '아무 구루나 탭해보세요. 그들의 투자 철학과 생각을 직접 들을 수 있어요. 레이 달리오가 기다리고 있어요!',
    descriptionEn: "Tap any guru to start a conversation. You can hear their investment philosophy directly. Ray Dalio is waiting for you!",
    guruId: 'dalio',
    targetZone: 'guru_dalio',
    targetAction: 'tap_guru',
    reward: {
      credits: 1,
      message: '첫 대화 완료! 우정이 시작됐어요.',
      messageEn: 'First conversation complete! Friendship begins.',
    },
  },
  {
    id: 'read_card',
    order: 3,
    title: '맥락 카드 읽기',
    titleEn: 'Read the Context Card',
    description: '매일 아침 맥락 카드를 읽어보세요. 시장이 왜 움직이는지 5분 만에 이해할 수 있어요. 피터 린치가 설명해 줄 거예요.',
    descriptionEn: "Read the daily context card every morning. Peter Lynch will explain why the market moved today — in just 5 minutes.",
    guruId: 'lynch',
    targetZone: 'context_board',
    targetAction: 'read_card',
    reward: {
      credits: 2,
      message: '맥락 카드 첫 읽기! 지식이 쌓이기 시작했어요.',
      messageEn: 'First context card read! Your knowledge is growing.',
    },
  },
  {
    id: 'vote_prediction',
    order: 4,
    title: '내일을 예측해봐요',
    titleEn: 'Make a Prediction',
    description: "내일 시장이 어떻게 될지 예측해보세요! 캐시 우드가 예측 게임을 소개할 거예요. 맞추면 크레딧을 드려요.",
    descriptionEn: "Predict what the market will do tomorrow! Cathie Wood will show you the prediction game. Get it right and earn credits.",
    guruId: 'cathie_wood',
    targetZone: 'prediction_board',
    targetAction: 'vote_prediction',
    reward: {
      credits: 2,
      message: '첫 예측 완료! 내일 결과를 확인해보세요.',
      messageEn: 'First prediction made! Check the result tomorrow.',
    },
  },
  {
    id: 'check_weather',
    order: 5,
    title: '마을 날씨 확인하기',
    titleEn: 'Check the Village Weather',
    description: '마을 날씨는 실제 날씨와 연동돼요. 날씨에 따라 구루들 옷차림도 바뀌죠! 일론 머스크가 보여줄게요.',
    descriptionEn: "The village weather syncs with real weather! Guru outfits change accordingly. Elon Musk will show you.",
    guruId: 'musk',
    targetZone: 'weather_tower',
    targetAction: 'check_weather',
    reward: {
      credits: 1,
      message: '날씨 탐험 완료!',
      messageEn: 'Weather exploration complete!',
    },
  },
  {
    id: 'open_letter',
    order: 6,
    title: '우체통 확인하기',
    titleEn: 'Check the Mailbox',
    description: '우체통을 확인해보세요. 구루들이 직접 편지를 보내올 거예요. 하워드 막스의 첫 편지가 도착했어요!',
    descriptionEn: "Check your mailbox. Gurus will send you letters directly. Howard Marks' first letter has arrived!",
    guruId: 'marks',
    targetZone: 'mailbox',
    targetAction: 'open_letter',
    reward: {
      credits: 2,
      message: '첫 편지 수신 완료! 구루와 더 친해지세요.',
      messageEn: 'First letter received! Get closer to your guru.',
    },
  },
  {
    id: 'explore_zones',
    order: 7,
    title: '마을 구석구석 탐험하기',
    titleEn: 'Explore Village Zones',
    description: '마을 곳곳을 돌아다녀보세요. 짐 로저스가 브랜드 상점, 카페, 도서관 등 특별한 공간들을 안내해 줄 거예요.',
    descriptionEn: "Explore every corner of the village. Jim Rogers will guide you through brand shops, the cafe, the library, and more.",
    guruId: 'rogers',
    targetZone: 'brand_district',
    reward: {
      credits: 1,
      message: '마을 탐험 완료! 새 공간이 열렸어요.',
      messageEn: 'Village explored! New areas unlocked.',
    },
  },
  {
    id: 'complete',
    order: 8,
    title: '마을의 일원이 됐어요!',
    titleEn: "You're a Village Member!",
    description: '축하해요! 발른 마을의 정식 주민이 됐어요. 매일 방문하면 마을이 번영하고 구루들과 더 가까워질 수 있어요.',
    descriptionEn: "Congratulations! You're now an official Baln Village resident. Visit daily to prosper the village and grow closer to the gurus.",
    guruId: 'buffett',
    targetZone: 'square',
    reward: {
      credits: 5,
      message: '튜토리얼 완료 보너스! 마을이 번영하기 시작했어요.',
      messageEn: 'Tutorial complete bonus! The village begins to prosper.',
    },
  },
];

// ---------------------------------------------------------------------------
// 상태 I/O
// ---------------------------------------------------------------------------

/** 튜토리얼 상태 로드 (없으면 초기 상태 반환) */
export async function getTutorialState(): Promise<TutorialState> {
  try {
    const raw = await AsyncStorage.getItem(TUTORIAL_KEY);
    if (!raw) {
      return {
        completedSteps: [],
        isComplete: false,
        skipped: false,
        startedAt: new Date().toISOString(),
      };
    }
    return JSON.parse(raw) as TutorialState;
  } catch (err) {
    if (__DEV__) console.warn('[villageTutorial] 상태 로드 실패:', err);
    return {
      completedSteps: [],
      isComplete: false,
      skipped: false,
      startedAt: new Date().toISOString(),
    };
  }
}

/** 튜토리얼 상태 저장 */
async function saveTutorialState(state: TutorialState): Promise<void> {
  try {
    await AsyncStorage.setItem(TUTORIAL_KEY, JSON.stringify(state));
  } catch (err) {
    if (__DEV__) console.warn('[villageTutorial] 상태 저장 실패:', err);
  }
}

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

/**
 * 스텝 완료 처리
 *
 * 1. 이미 완료된 스텝이면 무시
 * 2. 완료 목록에 추가하고 저장
 * 3. 다음 스텝과 보상을 반환
 */
export async function completeStep(
  stepId: string,
): Promise<{ nextStep: TutorialStep | null; reward?: TutorialStep['reward'] }> {
  const state = await getTutorialState();

  // 이미 완료된 스텝이면 건너뜀
  if (state.completedSteps.includes(stepId)) {
    return { nextStep: getNextStep(state.completedSteps) };
  }

  const step = TUTORIAL_STEPS.find(s => s.id === stepId);
  if (!step) {
    if (__DEV__) console.warn('[villageTutorial] 알 수 없는 스텝 ID:', stepId);
    return { nextStep: null };
  }

  const updatedCompleted = [...state.completedSteps, stepId];
  const allComplete = updatedCompleted.length >= TUTORIAL_STEPS.length;

  const nextState: TutorialState = {
    ...state,
    completedSteps: updatedCompleted,
    isComplete: allComplete,
    ...(allComplete ? { completedAt: new Date().toISOString() } : {}),
  };

  await saveTutorialState(nextState);

  if (__DEV__) {
    console.log(`[villageTutorial] 스텝 완료: ${stepId} (${updatedCompleted.length}/${TUTORIAL_STEPS.length})`);
  }

  return {
    nextStep: getNextStep(updatedCompleted),
    reward: step.reward,
  };
}

/**
 * 튜토리얼 건너뛰기 (사용자 의지)
 */
export async function skipTutorial(): Promise<void> {
  const state = await getTutorialState();
  const updatedState: TutorialState = {
    ...state,
    skipped: true,
    isComplete: true,
    completedAt: new Date().toISOString(),
  };
  await saveTutorialState(updatedState);

  if (__DEV__) console.log('[villageTutorial] 사용자가 튜토리얼을 건너뜀');
}

/**
 * 튜토리얼 초기화 (개발/테스트용)
 */
export async function resetTutorial(): Promise<void> {
  await AsyncStorage.removeItem(TUTORIAL_KEY);
  if (__DEV__) console.log('[villageTutorial] 튜토리얼 초기화 완료');
}

/**
 * 완료 목록 기준으로 다음 진행할 스텝 반환
 * 모든 스텝이 완료됐으면 null
 */
export function getNextStep(completedSteps: string[]): TutorialStep | null {
  const remaining = TUTORIAL_STEPS
    .filter(s => !completedSteps.includes(s.id))
    .sort((a, b) => a.order - b.order);

  return remaining[0] ?? null;
}

/**
 * 튜토리얼 진행률 (0 ~ 1)
 * 완료 스텝 수 / 전체 스텝 수
 */
export function getTutorialProgress(completedSteps: string[]): number {
  if (TUTORIAL_STEPS.length === 0) return 1;
  return Math.min(completedSteps.length / TUTORIAL_STEPS.length, 1);
}

/**
 * 특정 targetAction이 완료 조건인 스텝을 찾아 자동 완료 처리
 *
 * 사용 예:
 * ```
 * // 구루 탭 시
 * await autoCompleteByAction('tap_guru');
 * ```
 */
export async function autoCompleteByAction(
  action: NonNullable<TutorialStep['targetAction']>,
): Promise<{ reward?: TutorialStep['reward'] } | null> {
  const state = await getTutorialState();
  if (state.isComplete || state.skipped) return null;

  const matchingStep = TUTORIAL_STEPS.find(
    s => s.targetAction === action && !state.completedSteps.includes(s.id),
  );

  if (!matchingStep) return null;

  const result = await completeStep(matchingStep.id);
  return { reward: result.reward };
}
