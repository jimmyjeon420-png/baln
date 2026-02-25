/**
 * 마을 세계관 확장 타입 정의
 *
 * 역할: 발른 마을의 날씨, 구루 감정, 우정, 번영도, 이벤트, 브랜드 상점 등
 *       세계관 시스템 전체를 위한 타입 규격서
 * 비유: "마을 운영 매뉴얼" — 마을이 돌아가는 모든 규칙을 정의
 */

// ---------------------------------------------------------------------------
// Guru Mood (8가지 감정 — 기존 4표정에서 확장)
// ---------------------------------------------------------------------------

/**
 * 구루의 현재 기분 상태 (WORLD_DESIGN.md 섹션 26)
 *
 * 기존 moodEngine.ts / activityService.ts와 통일된 이름 사용.
 * WORLD_DESIGN.md 원본 이름과의 대응:
 *   joy = 기쁨(joyful), thinking = 고민(thoughtful),
 *   angry = 짜증(grumpy), sad = 슬픔
 */
export type GuruMood =
  | 'joy'         // 기쁨  — 담당 분야 상승
  | 'joyful'      // joy alias (moodEngine 호환)
  | 'excited'     // 흥분  — 담당 분야 급등 (+3%+)
  | 'calm'        // 평온  — 시장 보합 + 좋은 날씨
  | 'thinking'    // 고민  — 시장 불확실
  | 'thoughtful'  // thinking alias (moodEngine 호환)
  | 'worried'     // 걱정  — 담당 분야 하락
  | 'angry'       // 짜증  — 라이벌과 논쟁 중
  | 'grumpy'      // angry alias (moodEngine 호환)
  | 'sleepy'      // 졸림  — 밤 시간 OR 시장 휴장
  | 'surprised'   // 놀람  — 예상 밖 이벤트 발생
  | 'sad';        // 슬픔  — 담당 분야 급락

// ---------------------------------------------------------------------------
// Guru Activity (20가지 활동 — "살아있는 NPC" 느낌)
// ---------------------------------------------------------------------------

/** 구루가 지금 하고 있는 활동 (WORLD_DESIGN.md 섹션 24) */
export type GuruActivity =
  | 'walking'       // 산책
  | 'reading'       // 독서
  | 'meditating'    // 명상
  | 'fishing'       // 낚시
  | 'gardening'     // 정원 가꾸기
  | 'cooking'       // 요리
  | 'painting'      // 그림 그리기
  | 'stargazing'    // 별 보기
  | 'exercising'    // 운동
  | 'napping'       // 낮잠
  | 'dancing'       // 춤추기
  | 'singing'       // 노래 부르기
  | 'surfing'       // 서핑
  | 'writing'       // 글쓰기
  | 'chess'         // 체스
  | 'tea_ceremony'  // 차 마시기
  | 'debugging'     // 차트/데이터 분석 (머스크 스타일)
  | 'birdwatching'  // 새 관찰 (자연 활동)
  | 'yoga'          // 요가
  | 'photography';  // 사진 찍기

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

/**
 * 마을 날씨 조건
 *
 * 'clouds'와 'storm'은 OpenWeather API 원본 코드에서 사용,
 * 'rainbow'는 시장 급반등 후 마을 특수 날씨에서 사용.
 * 모든 기존 서비스/컴포넌트와 호환 유지.
 */
export type WeatherCondition =
  | 'clear'
  | 'cloudy'
  | 'clouds'        // OpenWeather 호환 (= cloudy)
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'storm'         // OpenWeather 호환 (= thunderstorm)
  | 'fog'
  | 'windy'
  | 'rainbow';      // 특수: 시장 급락 후 반등

/** 계절 (북반구 기준) */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * 기온 기반 의상 단계 (SVG 레이어 3)
 *
 * 문자열 기반 — weatherService.getClothingLevel()에서 반환
 * WeatherBadge.tsx의 CLOTHING_HINT_KO/EN Record에서 키로 사용
 */
export type ClothingLevel = 'summer' | 'light' | 'normal' | 'warm' | 'winter' | 'arctic';

/** 마을 날씨 상태 (실제 날씨 API + 시장 무드 블렌딩) */
export interface VillageWeather {
  /** 날씨 조건 코드 */
  condition: WeatherCondition;
  /** 기온 (섭씨) */
  temperature: number;
  /** 한국어 설명 (예: "맑음", "비") */
  description: string;
  /** 날씨 이모지 (예: "☀️", "🌧️") */
  emoji?: string;
  /** 날씨 아이콘 (emoji alias, WeatherBadge 호환) */
  icon?: string;
  /** true = OpenWeather API, false = 시뮬레이션 */
  isRealWeather?: boolean;
  /** 의상 단계 (기온 기반 자동 계산) */
  clothingLevel?: ClothingLevel;
  /** 현재 계절 (weatherService에서 항상 설정됨) */
  season: Season;
  /** 습도 (%) */
  humidity?: number;
  /** 풍속 (m/s) */
  windSpeed?: number;
  /** 마지막 업데이트 시각 (ISO 8601, weatherService에서 항상 설정됨) */
  updatedAt: string;

  // --- WeatherBadge 호환 필드 (블렌딩 전 원본 데이터) ---
  /** 실제 날씨 코드 (API 원본, 블렌딩 전) */
  realWeather?: WeatherCondition;
  /** 실제 기온 (API 원본, 섭씨) */
  realTemp?: number;
  /** 시장 무드 블렌딩 후 최종 날씨 코드 (마을 표시용) */
  blendedWeather?: string;
}

// ---------------------------------------------------------------------------
// Friendship (구루 우정 시스템 — WORLD_DESIGN.md 섹션 12)
// ---------------------------------------------------------------------------

/** 우정 등급 (내부 0~200+ 점수를 7단계 티어로 매핑) */
export type FriendshipTier =
  | 'stranger'      // 0~19  "주민님"
  | 'acquaintance'  // 20~49 "이웃님"
  | 'friend'        // 50~99 이름 부르기
  | 'close_friend'  // 100~149 별명
  | 'best_friend'   // 150~199 "제자여"
  | 'mentor'        // 150~199 사제 관계 (스승 구루 전용)
  | 'soulmate';     // 200+  고유 호칭 (전설)

/** 개별 구루와의 우정 상태 */
export interface GuruFriendship {
  guruId: string;
  score: number;                // 0~200+
  tier: FriendshipTier;
  totalInteractions: number;
  lastInteraction: string;      // ISO 8601 날짜
  unlockedDialogues: string[];  // 해금된 특별 대화 ID 목록
  giftsGiven: number;
  lettersSent: number;
  lettersReceived: number;
}

// ---------------------------------------------------------------------------
// Village Prosperity (마을 번영도 — WORLD_DESIGN.md 섹션 4)
// ---------------------------------------------------------------------------

/** 마을 번영도 전체 상태 */
export interface VillageProsperity {
  level: number;  // 1~10 (황무지~전설의 마을)
  score: number;  // 0~1000+
  dailyContributions: ProsperityContribution[];
  milestones: ProsperityMilestone[];
  currentEvent?: VillageEvent;
}

/** 번영도 기여 기록 (개별 행동) */
export interface ProsperityContribution {
  source:
    | 'context_card_read'   // 맥락 카드 읽기 +10
    | 'prediction_vote'     // 예측 투표 +5
    | 'prediction_correct'  // 예측 적중 +15
    | 'quiz_complete'       // 퀴즈 완료 +10
    | 'community_post'      // 카페 글 작성 +5
    | 'guru_chat'           // 구루 대화 +3
    | 'streak_maintained'   // 연속 출석 유지 +5
    | 'share'               // 공유 +5
    | 'roundtable_join';    // 라운드테이블 참가 +10
  points: number;
  timestamp: string; // ISO 8601
}

/** 번영도 마일스톤 (특정 레벨 도달 보상) */
export interface ProsperityMilestone {
  level: number;
  name: string;       // 한국어 (예: "첫 번째 불꽃")
  nameEn: string;     // 영어
  reward: string;     // 보상 설명
  unlockedAt?: string; // 해금 일시 (ISO 8601, 미해금이면 undefined)
}

// ---------------------------------------------------------------------------
// Village Events (마을 이벤트 — WORLD_DESIGN.md 섹션 27)
// ---------------------------------------------------------------------------

/** 마을 이벤트 유형 */
export type VillageEventType =
  | 'festival'     // 축제 (계절/특별)
  | 'market'       // 장터/마켓
  | 'competition'  // 대회/경쟁
  | 'celebration'  // 축하/기념
  | 'emergency'    // 긴급 상황 (시장 급변)
  | 'seasonal';    // 계절 이벤트

/** 마을 이벤트 */
export interface VillageEvent {
  id: string;
  type: VillageEventType;
  title: string;         // 한국어 제목
  titleEn: string;       // 영어 제목
  description: string;   // 한국어 설명
  descriptionEn: string; // 영어 설명
  duration: number;      // 지속 시간 (분)
  startTime?: string;    // 시작 시간 (ISO 8601)
  participants: string[]; // 참가 구루 ID 목록
  rewards?: {
    credits: number;
    badge?: string;      // 뱃지 ID (있으면)
  };
}

// ---------------------------------------------------------------------------
// Guru Schedule (구루 일과표 — WORLD_DESIGN.md 섹션 11)
// ---------------------------------------------------------------------------

/** 구루 일과 시간표 항목 */
export interface GuruScheduleEntry {
  hour: number;          // 0~23 KST
  activity: GuruActivity;
  location: string;      // 마을 내 위치 한국어 (예: "광장", "카페", "병원")
  locationEn?: string;   // 마을 내 위치 영어 (예: "Square", "Cafe", "Clinic")
  mood: GuruMood;
  dialogue?: string;     // 한국어 대사
  dialogueEn?: string;   // 영어 대사
}

// ---------------------------------------------------------------------------
// Guru News Reaction (뉴스에 대한 구루 반응)
// ---------------------------------------------------------------------------

/**
 * 뉴스 리액션 감정 값
 *
 * 대문자: 라운드테이블/분석용 ('BULLISH', 'BEARISH' 등)
 * 소문자: 마을 감정 표현용 ('joy', 'calm', 'excited' 등)
 * 기존 서비스(newsReactionService)는 소문자 사용, 향후 통일 예정
 */
export type ReactionSentiment =
  | 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS'
  | 'joy' | 'joyful' | 'calm' | 'excited' | 'worried' | 'thinking'
  | 'thoughtful' | 'grumpy' | 'sleepy' | 'sad' | 'angry' | 'surprised';

/** 뉴스/시장 이벤트에 대한 구루의 반응 */
export interface GuruNewsReaction {
  guruId: string;
  sentiment: ReactionSentiment;
  reaction: string;        // 한국어 반응 (1~2문장)
  reactionEn?: string;     // 영어 반응
  emoji?: string;          // 구루 이모지 (예: "🦉")

  // --- 확장 필드 (모든 기존 코드에서 optional) ---
  headline?: string;       // 한국어 헤드라인
  headlineEn?: string;     // 영어 헤드라인
  mood?: GuruMood;
  confidence?: number;     // 0~100 (확신도)

  // --- VillageNewspaper 컴포넌트 호환 ---
  moodEmoji?: string;      // 감정 이모지
  comment?: string;        // 구루 코멘트 (reaction alias)
}

// ---------------------------------------------------------------------------
// Brand Shop (브랜드 월드 — WORLD_DESIGN.md 섹션 31)
// ---------------------------------------------------------------------------

/** 마을 브랜드 상점 카테고리 */
export type BrandCategory =
  | 'tech'
  | 'fashion'
  | 'food'
  | 'finance'
  | 'auto'
  | 'entertainment';

/** 마을 브랜드 상점 정보 */
export interface BrandShop {
  brandId: string;
  realName: string;       // 실제 기업명 (예: "Nike")
  villageName: string;    // 마을 내 패러디명 한국어 (예: "발자국 운동화")
  villageNameEn: string;  // 마을 내 패러디명 영어 (예: "Pawprint Sneakers")
  animal: string;         // 상점 주인 동물 (한국어, 예: "치타")
  animalEn?: string;      // 상점 주인 동물 (영어, 예: "Cheetah")
  emoji: string;          // 대표 이모지
  category: BrandCategory;
  ticker?: string;        // 주식 티커 (해당 시)
  description: string;    // 한국어 상점 설명
  descriptionEn: string;  // 영어 상점 설명
}

// ---------------------------------------------------------------------------
// Guru Letter (편지 시스템 — WORLD_DESIGN.md 섹션 13)
// ---------------------------------------------------------------------------

/** 구루가 유저에게 보내는 편지 */
export interface GuruLetter {
  id: string;
  fromGuruId: string;
  subject: string;       // 한국어 제목
  subjectEn?: string;    // 영어 제목
  body: string;          // 한국어 본문
  bodyEn?: string;       // 영어 본문
  timestamp: string;     // ISO 8601
  isRead: boolean;
  attachedItem?: string; // 가상 선물 (도토리 등)
  friendshipRequired: FriendshipTier; // 이 편지를 받으려면 필요한 최소 우정 티어

  // --- villageLetterService 호환 필드 ---
  /** 편지 템플릿 ID */
  templateId?: string;
  /** 수신 시각 (ISO 8601) */
  receivedAt?: string;
  /** 구루 ID (fromGuruId alias) */
  guruId?: string;
}

// ---------------------------------------------------------------------------
// Village Newspaper (마을 신문 — WORLD_DESIGN.md 섹션 19)
// ---------------------------------------------------------------------------

/** 마을 신문 기사 카테고리 */
export type NewspaperCategory =
  | 'market'    // 주식 시장
  | 'crypto'    // 암호화폐
  | 'politics'  // 정치/정책
  | 'economy'   // 거시경제
  | 'village'   // 마을 소식
  | 'tech'      // 기술/혁신 (newsReactionService 호환)
  | 'global'    // 글로벌 (newsReactionService 호환)
  | 'consumer'; // 소비재 (newsReactionService 호환)

/** 마을 신문 기사 */
export interface NewspaperArticle {
  id: string;
  category: NewspaperCategory;
  headline: string;        // 한국어 헤드라인
  headlineEn?: string;     // 영어 헤드라인
  summary?: string;        // 한국어 요약
  summaryEn?: string;      // 영어 요약
  publishedAt?: string;    // ISO 8601

  /** 구루 반응 목록 (정규 필드명) */
  guruReactions?: GuruNewsReaction[];
  /** 구루 반응 목록 (기존 컴포넌트 호환 alias) */
  reactions?: GuruNewsReaction[];

  /** 관련 예측 ID */
  relatedPrediction?: string;
  /** 관련 예측 ID (VillageNewspaper 컴포넌트 호환 alias) */
  relatedPredictionId?: string;

  /** 생성 시각 (newsReactionService 호환) */
  createdAt?: string;
}
