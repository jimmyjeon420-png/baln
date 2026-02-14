import { GoogleGenerativeAI } from '@google/generative-ai';
import * as Sentry from '@sentry/react-native';
import supabase from './supabase';

// ============================================================================
// [마켓플레이스] AI 종목 딥다이브 — 재무/기술/뉴스/AI 의견
// ============================================================================

import type {
  DeepDiveInput,
  DeepDiveResult,
  WhatIfInput,
  WhatIfResult,
  TaxReportInput,
  TaxReportResult,
  CFOChatInput,
} from '../types/marketplace';

// ⚠️ 보안 경고: EXPO_PUBLIC_ 접두사가 붙은 환경변수는 클라이언트 번들에 포함됩니다.
//    Gemini API 키는 현재 클라이언트에서 직접 호출하는 구조이므로 EXPO_PUBLIC_ 사용이 불가피하지만,
//    프로덕션에서는 Supabase Edge Function 등 서버 사이드 프록시를 통해 호출하는 것을 권장합니다.
//    절대 API 키를 소스 코드에 하드코딩하지 마세요. 반드시 .env 파일을 통해 주입하세요.
// 3중 방어: env → eas.json → 하드코딩 폴백 (EAS 빌드에서 env 누락 대비)
const FALLBACK_GEMINI_KEY = 'AIzaSyB49p1pv1PPo7_Lks6X2mRMDZNvhXdIKAg';
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || FALLBACK_GEMINI_KEY;
const MODEL_NAME = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';

// 🔍 디버그: API 키 로드 확인
if (!API_KEY) {
  console.error('❌ Gemini API 키가 로드되지 않았습니다!');
  console.error('  1. .env 파일 확인');
  console.error('  2. npx expo start --clear 실행');
  console.error('  3. 앱 완전히 재시작');
} else {
  // API 키가 정상적으로 로드됨 (보안상 키 내용은 로그에 출력하지 않음)
  console.log('✅ Gemini API 키 로드됨');
  console.log('✅ 사용 모델:', MODEL_NAME);
}

// ============================================================================
// [핵심] 한국어 → 티커 매핑 테이블 (UNKNOWN_ 이슈 해결)
// ============================================================================
const KOREAN_TO_TICKER_MAP: Record<string, string> = {
  // 미국 주식 - 일반
  '애플': 'AAPL',
  'Apple': 'AAPL',
  '테슬라': 'TSLA',
  'Tesla': 'TSLA',
  '엔비디아': 'NVDA',
  'NVIDIA': 'NVDA',
  '마이크로소프트': 'MSFT',
  'Microsoft': 'MSFT',
  '아마존': 'AMZN',
  'Amazon': 'AMZN',
  '메타': 'META',
  'Meta': 'META',
  '넷플릭스': 'NFLX',
  'Netflix': 'NFLX',

  // 미국 주식 - 특수 티커 (자주 오인식되는 종목)
  '버크셔 해서웨이 B': 'BRK.B',
  '버크셔 해서웨이': 'BRK.B',
  '버크셔해서웨이': 'BRK.B',
  'Berkshire Hathaway B': 'BRK.B',
  '버크셔B': 'BRK.B',
  '컨스틸레이션 에너지': 'CEG',
  '컨스텔레이션 에너지': 'CEG',
  'Constellation Energy': 'CEG',
  '알파벳 A': 'GOOGL',
  '알파벳A': 'GOOGL',
  '구글': 'GOOGL',
  '구글 A': 'GOOGL',
  'Alphabet A': 'GOOGL',
  'Alphabet': 'GOOGL',
  '알파벳 C': 'GOOG',
  '알파벳C': 'GOOG',
  '구글 C': 'GOOG',

  // ETF (자주 오인식되는 ETF)
  'GLD': 'GLD',
  'SPDR Gold': 'GLD',
  '금 ETF': 'GLD',
  'SPY': 'SPY',
  'S&P 500 ETF': 'SPY',
  'QQQ': 'QQQ',
  '나스닥 ETF': 'QQQ',
  'VOO': 'VOO',
  'VTI': 'VTI',
  'SCHD': 'SCHD',
  'JEPI': 'JEPI',
  'JEPQ': 'JEPQ',

  // 한국 주식
  '삼성전자': '005930.KS',
  '카카오': '035720.KS',
  '네이버': '035420.KS',
  'SK하이닉스': '000660.KS',
  'LG에너지솔루션': '373220.KS',
  '현대차': '005380.KS',
  '현대자동차': '005380.KS',
  '셀트리온': '068270.KS',
  'POSCO홀딩스': '005490.KS',
  '포스코홀딩스': '005490.KS',
  '삼성SDI': '006400.KS',
  '삼성바이오로직스': '207940.KS',
  'LG화학': '051910.KS',
  '기아': '000270.KS',

  // 암호화폐
  '비트코인': 'BTC',
  'Bitcoin': 'BTC',
  '이더리움': 'ETH',
  'Ethereum': 'ETH',
  '리플': 'XRP',
  '도지코인': 'DOGE',
  '솔라나': 'SOL',
  '에이다': 'ADA',
};

// 티커 매핑 함수 - UNKNOWN_ 접두사 제거 및 한국어 이름 변환
const resolveTickerFromName = (ticker: string, name: string): string => {
  // 1. 이미 유효한 티커인 경우 그대로 반환
  if (ticker && !ticker.startsWith('UNKNOWN_')) {
    // 매핑 테이블에 티커가 있으면 정규화된 티커 반환
    if (KOREAN_TO_TICKER_MAP[ticker]) {
      return KOREAN_TO_TICKER_MAP[ticker];
    }
    return ticker;
  }

  // 2. 이름으로 티커 찾기
  if (KOREAN_TO_TICKER_MAP[name]) {
    return KOREAN_TO_TICKER_MAP[name];
  }

  // 3. 부분 일치 검색 (공백 제거 후 비교)
  const normalizedName = name.replace(/\s+/g, '');
  for (const [key, value] of Object.entries(KOREAN_TO_TICKER_MAP)) {
    if (normalizedName.includes(key.replace(/\s+/g, '')) ||
        key.replace(/\s+/g, '').includes(normalizedName)) {
      return value;
    }
  }

  // 4. 매핑 실패 시 UNKNOWN_ 유지
  return ticker || `UNKNOWN_${name}`;
};

// ============================================================================
// [핵심] 평가금액 vs 단가 혼동 방지 로직
// ============================================================================

/**
 * 파싱된 자산 인터페이스
 *
 * [통화 안정성 규칙 - CRITICAL]
 * - 토스 증권 등 한국 금융앱은 미국 주식(NVDA, TSLA)도 KRW로 환산하여 표시
 * - OCR 단계에서 외부 환율 API 사용 금지 → 화면 표시 KRW 값을 그대로 신뢰
 * - price와 totalValue는 항상 화면에 표시된 KRW 금액
 *
 * [소수점 수량 지원 - IMPORTANT]
 * - 토스 증권은 소수점 주식 지원 (예: 229.4주, 51.9주)
 * - amount는 DECIMAL/FLOAT 타입으로 처리 (정수 반올림 금지)
 * - VIP 라운지 입장 검증 시 소수점 오차로 인한 오류 방지
 */
interface ParsedAsset {
  ticker: string;
  name: string;
  amount: number; // DECIMAL - 소수점 허용 (229.4, 51.9 등)
  price: number; // KRW 기준 단가 (화면 표시 값)
  totalValue?: number; // KRW 기준 평가금액 (화면 표시 값)
  currency?: 'KRW'; // 항상 KRW (화면 표시 통화)
  needsReview?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  correctedAssets: ParsedAsset[];
  totalCalculated: number;
  errorMessage?: string;
}

// 가격 보정 함수: 총 평가금액과 단가 혼동 감지 및 수정
const correctPriceConfusion = (
  assets: ParsedAsset[],
  reportedTotalValue?: number
): ParsedAsset[] => {
  // reportedTotalValue가 없으면 보정 불가 - 그대로 반환
  if (!reportedTotalValue || reportedTotalValue <= 0) {
    if (__DEV__) console.log('[가격 보정] 총 자산 정보 없음 - 보정 스킵');
    return assets;
  }

  if (__DEV__) console.log(`[가격 보정] 화면 총 자산: ${reportedTotalValue.toLocaleString()}원`);

  return assets.map(asset => {
    const calculatedValue = asset.amount * asset.price;

    // 핵심 로직: (수량 * 추출가격) > 총 자산이면, 추출가격은 사실 "총 평가금액"
    if (calculatedValue > reportedTotalValue) {
      const correctedPrice = asset.price / asset.amount;
      if (__DEV__) console.log(
        `[가격 보정] ${asset.name}: 가격 혼동 감지! ` +
        `${asset.price.toLocaleString()}원은 총 평가금액. ` +
        `단가 보정: ${correctedPrice.toLocaleString()}원`
      );
      return {
        ...asset,
        price: correctedPrice,
        needsReview: true, // 보정된 항목 표시
      };
    }

    // 추가 검증: 개별 자산 가치가 총 자산의 50% 이상이면 의심
    if (calculatedValue > reportedTotalValue * 0.5 && asset.amount > 1) {
      // 수량이 2 이상인데 개별 가치가 50% 넘으면 가격이 총액일 가능성
      const correctedPrice = asset.price / asset.amount;
      const correctedValue = asset.amount * correctedPrice;

      // 보정 후 값이 더 합리적인지 확인
      if (correctedValue < reportedTotalValue * 0.3) {
        if (__DEV__) console.log(
          `[가격 보정] ${asset.name}: 의심 항목 보정. ` +
          `${asset.price.toLocaleString()}원 → ${correctedPrice.toLocaleString()}원`
        );
        return {
          ...asset,
          price: correctedPrice,
          needsReview: true,
        };
      }
    }

    return asset;
  });
};

// 데이터 무결성 검증 함수
export const validateAssetData = (
  assets: ParsedAsset[],
  reportedTotalValue: number,
  tolerance: number = 0.05 // 5% 오차 허용
): ValidationResult => {
  // 1. 가격 혼동 보정 먼저 수행
  const correctedAssets = correctPriceConfusion(assets, reportedTotalValue);

  // 2. 보정 후 총액 계산
  const totalCalculated = correctedAssets.reduce(
    (sum, asset) => sum + (asset.amount * asset.price),
    0
  );

  // 3. 오차율 계산: |( 계산값 / 화면값 ) - 1| < tolerance
  const errorRatio = Math.abs((totalCalculated / reportedTotalValue) - 1);
  const isValid = errorRatio < tolerance;

  if (__DEV__) console.log(
    `[무결성 검증] 화면 총액: ${reportedTotalValue.toLocaleString()}원, ` +
    `계산 총액: ${totalCalculated.toLocaleString()}원, ` +
    `오차율: ${(errorRatio * 100).toFixed(2)}%, ` +
    `결과: ${isValid ? '✓ 통과' : '✗ 실패'}`
  );

  return {
    isValid,
    correctedAssets,
    totalCalculated,
    errorMessage: isValid
      ? undefined
      : '데이터 인식 오류가 감지되었습니다. 수동 수정을 확인해 주세요.',
  };
};

const genAI = new GoogleGenerativeAI(API_KEY);

// 환경변수로 모델 설정 (기본값: gemini-2.5-flash)
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// ============================================================================
// [실시간 그라운딩] Google Search 도구 설정
// ============================================================================
// 실시간 뉴스/시장 데이터를 위한 Google Search 도구가 포함된 모델
// 참고: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini

// ⚠️ TEMPORARY FIX: google_search 도구가 네트워크 에러를 일으키면 임시로 제거
// TODO: Gemini 2.5-flash의 올바른 google_search 형식 확인 후 재활성화
const USE_GOOGLE_SEARCH = false; // Gemini 2.5-flash에서 google_search 불안정 → 비활성화

const modelWithSearch = genAI.getGenerativeModel(
  USE_GOOGLE_SEARCH
    ? {
        model: MODEL_NAME,
        tools: [
          {
            // SDK v0.24는 타입에 google_search가 없지만, tools 배열을 그대로
            // JSON으로 직렬화해서 REST API에 전달하므로 snake_case가 올바름
            // REST API: google_search: {} (snake_case 필수)
            // @ts-ignore - SDK 타입에는 없지만 REST API에서 인식함
            google_search: {},
          },
        ],
      }
    : { model: MODEL_NAME } // google_search 비활성화 시 일반 모델 사용
);

// ============================================================================
// [유틸리티] Gemini 호출 래퍼 + JSON 파서 (2.5 업그레이드)
// ============================================================================

/** Gemini 호출 + 타임아웃 + 재시도 래퍼 */
async function callGeminiSafe(
  targetModel: any,
  prompt: string | any[],
  options?: { timeoutMs?: number; maxRetries?: number }
): Promise<string> {
  const timeoutMs = options?.timeoutMs ?? 30000;
  const maxRetries = options?.maxRetries ?? 1;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const result = await targetModel.generateContent(prompt, { signal: controller.signal });
      clearTimeout(timer);

      const text = result.response.text();
      if (!text || text.trim().length === 0) {
        throw new Error('빈 응답');
      }
      return text;
    } catch (err: any) {
      if (attempt < maxRetries && (
        err.name === 'AbortError' ||
        err.message?.includes('429') ||
        err.message?.includes('503') ||
        err.message?.includes('RESOURCE_EXHAUSTED')
      )) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Gemini] 재시도 ${attempt + 1}/${maxRetries} (${delay}ms 후)`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`AI 분석 시간 초과 (${timeoutMs / 1000}초). 다시 시도해주세요.`);
        Sentry.captureException(timeoutErr, { tags: { service: 'gemini', type: 'timeout' } });
        throw timeoutErr;
      }
      // Gemini API 호출 실패를 Sentry에 기록
      Sentry.captureException(err, {
        tags: { service: 'gemini', type: 'api_error' },
        extra: { attempt, maxRetries, timeoutMs },
      });
      throw err;
    }
  }
  const exhaustedErr = new Error('AI 분석 실패. 잠시 후 다시 시도해주세요.');
  Sentry.captureException(exhaustedErr, { tags: { service: 'gemini', type: 'retries_exhausted' } });
  throw exhaustedErr;
}

/** JSON 응답 안전 파싱 (Gemini의 markdown 코드블록 제거) */
function parseGeminiJson<T = any>(text: string): T {
  let cleaned = text.trim();
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:json|javascript)?\s*/i, '').replace(/\s*```$/i, '');
  // Remove all remaining code block markers
  cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```javascript\s*/gi, '').replace(/```\s*/g, '');
  cleaned = cleaned.trim();
  // Remove markdown formatting inside JSON strings (*, _, #)
  cleaned = cleaned
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/^#+\s*/gm, '');
  // Find JSON boundaries
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    // Try array
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      cleaned = cleaned.substring(arrStart, arrEnd + 1);
    } else {
      throw new Error('JSON 형식을 찾을 수 없습니다');
    }
  } else {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  // Fix trailing commas
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  // Fix ₩ symbols before numbers in JSON number fields
  cleaned = cleaned.replace(/:\s*₩\s*([0-9])/g, ': $1');
  return JSON.parse(cleaned) as T;
}

export const getPortfolioAdvice = async (prompt: any) => {
  try {
    const msg = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    return await callGeminiSafe(model, msg);
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return "AI 응답 오류. 잠시 후 다시 시도해주세요.";
  }
};

export const summarizeChat = async (messages: any[]) => {
  try {
    const conversation = messages.map(m => `${m.user.name}: ${m.text}`).join('\n');
    const result = await model.generateContent(`Summarize this logic into 3 bullet points (Korean):\n${conversation}`);
    return result.response.text();
  } catch (error) {
    return "요약 실패";
  }
};

// 이미지 분석 옵션 인터페이스
export interface AnalyzeImageOptions {
  reportedTotalValue?: number; // 화면에 표시된 총 자산 (무결성 검증용)
  autoCorrectPrices?: boolean; // 가격 자동 보정 활성화 (기본: true)
}

export const analyzeAssetImage = async (
  base64: string,
  options?: AnalyzeImageOptions
) => {
  try {
    if (__DEV__) console.log(`Gemini: 이미지 분석 요청 중... (${MODEL_NAME})`);

    const { reportedTotalValue, autoCorrectPrices = true } = options || {};

    // [핵심 개선] 한국 금융앱 특화 프롬프트 - 평가금액 vs 단가 구분 + 통화/소수점 규칙
    const prompt = `
당신은 한국 금융앱 스크린샷 전문 분석기입니다.
이 이미지는 한국 금융앱(토스 증권, 업비트, 키움증권, 삼성증권 등)의 자산 현황 스크린샷입니다.

**[최우선 규칙 1 - 통화 안정성 (CRITICAL)]**
⚠️ 토스 증권은 미국 주식(NVDA, TSLA 등)도 KRW로 환산하여 표시합니다.
- 화면에 표시된 KRW 금액을 그대로 추출하세요
- USD → KRW 환산을 시도하지 마세요
- 모든 price와 totalValue는 화면에 보이는 "원" 단위 숫자입니다

**[최우선 규칙 2 - 소수점 수량 (IMPORTANT)]**
⚠️ 토스 증권은 소수점 주식(fractional shares)을 지원합니다.
- 예: "229.4주", "51.9주", "0.5주" → 소수점 그대로 추출
- 정수로 반올림하지 마세요 (VIP 라운지 입장 검증 시 오류 발생)
- amount 필드는 소수점을 포함한 실제 수량입니다

**[최우선 규칙 3 - 가격 vs 평가금액 구분]**
⚠️ "평가금액"과 "현재가/단가"를 반드시 구분하세요!
- "평가금액" / "평가 금액" / "총액" = 수량 × 단가 (이미 계산된 값)
- "현재가" / "단가" / "1주당" = 주당/개당 가격

예시 (토스 증권):
- "버크셔 해서웨이 B" - 평가금액 56,789,000원, 보유 10주
  → price는 5,678,900원 (56,789,000 ÷ 10)이 아니라,
  → 화면에 별도로 표시된 "현재가"를 찾아야 함
  → 만약 현재가가 안 보이면 price에 0을 넣고, "totalValue"에 평가금액을 추가

**[분석 대상 한국어 키워드]**
- 자산명/종목명: 삼성전자, 카카오, 비트코인, 이더리움 등
- 평가금액/현재가: 숫자 뒤에 "원" 또는 ","가 붙음 (모두 KRW)
- 보유수량: "주", "개", "코인" 등의 단위 (소수점 포함!)
- 수익률: "+15.3%" 또는 "-2.1%" 형태 (무시)
- 평균단가/매입가: 구매 시 평균 가격

**[티커 매핑 규칙]**
한국 주식:
- 삼성전자 → 005930.KS
- 카카오 → 035720.KS
- 네이버 → 035420.KS
- SK하이닉스 → 000660.KS
- 현대차/현대자동차 → 005380.KS
- 기타 한국주식 → 종목코드.KS (6자리 숫자)

미국 주식 (자주 오인식되는 종목 주의):
- 버크셔 해서웨이 B / 버크셔해서웨이 → BRK.B
- 컨스틸레이션 에너지 / 컨스텔레이션 → CEG
- 알파벳 A / 구글 → GOOGL
- 알파벳 C → GOOG
- 애플/Apple → AAPL
- 테슬라/Tesla → TSLA
- 엔비디아/NVIDIA → NVDA

ETF:
- GLD / 금 ETF → GLD
- SPY / S&P 500 ETF → SPY
- QQQ / 나스닥 ETF → QQQ

암호화폐:
- 비트코인/BTC → BTC
- 이더리움/ETH → ETH
- 리플/XRP → XRP

**[숫자 정제 규칙]**
1. 모든 쉼표(,) 제거: "1,234,567" → 1234567
2. "원" 제거: "50,000원" → 50000
3. "주" 제거: "229.4주" → 229.4 (⚠️ 소수점 유지!)
4. 소수점은 반드시 유지: "51.9" → 51.9, "0.5" → 0.5

**[필수 출력 형식]**
반드시 아래 JSON 형태로만 응답하세요. 마크다운 코드블록 금지!

{
  "totalValueFromScreen": 166798463,
  "currency": "KRW",
  "assets": [
    {"ticker": "NVDA", "name": "엔비디아", "amount": 229.4, "price": 0, "totalValue": 45678900},
    {"ticker": "TSLA", "name": "테슬라", "amount": 51.9, "price": 0, "totalValue": 23456000},
    {"ticker": "BRK.B", "name": "버크셔 해서웨이 B", "amount": 10.5, "price": 650000, "totalValue": 6825000}
  ]
}

**[필드 설명]**
- totalValueFromScreen: 화면 상단 "내 투자" / "총 자산" 금액 (KRW)
- currency: 항상 "KRW" (화면 표시 통화)
- ticker: 종목 티커 (불확실하면 "UNKNOWN_종목명")
- name: 화면에 보이는 종목명 그대로
- amount: 보유 수량 (⚠️ 소수점 포함! 229.4, 51.9 등)
- price: 단가 (1주당 KRW 가격). 평가금액만 보이면 0
- totalValue: 해당 종목의 평가금액 (KRW, 화면 표시 값)

**[주의사항]**
- 모든 금액은 화면에 표시된 KRW 값 그대로 사용 (환율 변환 금지)
- 소수점 수량은 절대 정수로 반올림하지 않음 (229.4 → 229 금지)
- 화면에 "평가금액"만 보이면 totalValue에 넣고 price는 0
- ticker가 불확실하면 "UNKNOWN_" + 종목명
- 빈 배열 허용 안 됨 - 최소 1개 이상 추출
- JSON 외 다른 텍스트 절대 포함 금지
`;

    const imagePart = {
      inlineData: {
        data: base64,
        mimeType: 'image/jpeg',
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    if (__DEV__) console.log("Gemini 원본 응답:", responseText);

    // JSON 정제 (Markdown 코드블록 제거 + 앞뒤 공백 제거)
    let cleanText = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // JSON 객체 또는 배열 시작/끝 찾기
    const objStart = cleanText.indexOf('{');
    const objEnd = cleanText.lastIndexOf('}');
    const arrStart = cleanText.indexOf('[');
    const arrEnd = cleanText.lastIndexOf(']');

    // 객체 형태 우선 (새 포맷), 배열 형태도 지원 (레거시)
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart &&
        (arrStart === -1 || objStart < arrStart)) {
      cleanText = cleanText.substring(objStart, objEnd + 1);
    } else if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      cleanText = cleanText.substring(arrStart, arrEnd + 1);
    } else {
      // JSON 구조를 찾을 수 없는 경우 방어
      console.error('[Gemini] JSON 구조를 찾을 수 없음. 원본 응답 앞 200자:', cleanText.substring(0, 200));
      throw new Error(`Gemini 응답이 JSON 형식이 아닙니다: "${cleanText.substring(0, 100)}"`);
    }

    // trailing comma 제거 (Gemini가 종종 ,} 또는 ,] 형태로 응답)
    cleanText = cleanText.replace(/,\s*([\]}])/g, '$1');

    if (__DEV__) console.log("정제된 JSON:", cleanText);

    const parsedData = JSON.parse(cleanText);

    // ================================================================
    // [핵심] 데이터 후처리 - 티커 매핑 + 가격 보정
    // ================================================================

    // 1. 화면에서 추출된 총 자산 값 (AI가 추출) 또는 사용자 제공 값
    const screenTotalValue = parsedData.totalValueFromScreen || reportedTotalValue;

    // 2. assets 배열 추출 (새 포맷 또는 레거시 배열)
    const rawAssets: any[] = parsedData.assets || (Array.isArray(parsedData) ? parsedData : []);

    // 3. 기본 데이터 정제 + 티커 매핑
    // CRITICAL: 안전한 숫자 파싱 (19.2조원 오류 방지)
    let processedAssets: ParsedAsset[] = rawAssets.map((item: any) => {
      const rawTicker = item.ticker || `UNKNOWN_${item.name || 'ASSET'}`;
      const name = item.name || '알 수 없는 자산';

      // [CRITICAL] 수량 파싱 - 실패 시 0으로 설정 (1로 기본값 설정 금지!)
      // amount가 1로 기본설정되면 price = totalValue가 되어 19.2조원 오류 발생 가능
      let amount: number;
      if (typeof item.amount === 'number' && item.amount > 0) {
        amount = item.amount;
      } else {
        const parsedAmount = parseFloat(String(item.amount).replace(/[^0-9.]/g, ''));
        amount = (parsedAmount > 0 && Number.isFinite(parsedAmount)) ? parsedAmount : 0;
      }

      // 가격 처리: price가 0이고 totalValue가 있으면 계산
      let price: number;
      if (typeof item.price === 'number' && item.price > 0) {
        price = item.price;
      } else {
        const parsedPrice = parseFloat(String(item.price).replace(/[^0-9.]/g, ''));
        price = (parsedPrice > 0 && Number.isFinite(parsedPrice)) ? parsedPrice : 0;
      }

      // totalValue가 있고 price가 0이면, 단가 계산
      // CRITICAL: amount가 0이거나 매우 작은 경우 계산하지 않음 (0으로 나누기 방지)
      if (price === 0 && item.totalValue && amount > 0.0001) {
        price = item.totalValue / amount;
        if (__DEV__) console.log(`[단가 계산] ${name}: ${item.totalValue} / ${amount} = ${price}`);
      }

      // [SANITY CHECK] 비정상적으로 큰 가격 감지 (1억원/주 초과)
      const MAX_REASONABLE_PRICE = 100_000_000; // 1억원/주
      if (price > MAX_REASONABLE_PRICE && amount > 0) {
        console.warn(`[경고] ${name}: 비정상 단가 감지 (${price.toLocaleString()}원). 평가금액 혼동 의심.`);
        // needsReview 플래그로 표시
      }

      // 티커 매핑 (UNKNOWN_ 해결)
      const resolvedTicker = resolveTickerFromName(rawTicker, name);

      return {
        ticker: resolvedTicker,
        name,
        amount,
        price,
        totalValue: item.totalValue, // 원본 totalValue 보존
        needsReview: resolvedTicker.startsWith('UNKNOWN_') || price === 0 || amount === 0 || price > MAX_REASONABLE_PRICE,
      };
    });

    // 4. 가격 혼동 자동 보정 (옵션이 켜져 있고 총 자산 정보가 있을 때)
    if (autoCorrectPrices && screenTotalValue && screenTotalValue > 0) {
      processedAssets = correctPriceConfusion(processedAssets, screenTotalValue);
    }

    // 5. 무결성 검증 정보 추가 (총 자산 정보가 있을 때)
    let validationResult: ValidationResult | undefined;
    if (screenTotalValue && screenTotalValue > 0) {
      validationResult = validateAssetData(processedAssets, screenTotalValue);

      // 검증 통과 시 보정된 자산 사용
      if (validationResult.isValid) {
        processedAssets = validationResult.correctedAssets;
      }
    }

    // 6. 결과 반환 (확장된 형태)
    return {
      assets: processedAssets,
      totalValueFromScreen: screenTotalValue,
      validation: validationResult
        ? {
            isValid: validationResult.isValid,
            totalCalculated: validationResult.totalCalculated,
            errorMessage: validationResult.errorMessage,
          }
        : undefined,
    };

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return {
      error: `이미지 분석 실패: ${errorMessage}`,
      assets: [],
      validation: {
        isValid: false,
        errorMessage: '이미지 분석에 실패했습니다. 다시 시도해주세요.',
      },
    };
  }
};

// ============================================================================
// 타입 정의 Export
// ============================================================================

// 이미지 분석 결과 타입
export interface AnalyzeImageResult {
  assets: ParsedAsset[];
  totalValueFromScreen?: number;
  validation?: {
    isValid: boolean;
    totalCalculated?: number;
    errorMessage?: string;
  };
  error?: string;
}

// ParsedAsset 타입 export
export type { ParsedAsset };

// 레거시 호환: 배열 형태로 자산만 반환하는 헬퍼 함수
export const analyzeAssetImageLegacy = async (base64: string): Promise<ParsedAsset[]> => {
  const result = await analyzeAssetImage(base64);
  return result.assets || [];
};

// 티커 매핑 테이블 export (외부에서 확장 가능)
export { KOREAN_TO_TICKER_MAP };

// 포트폴리오 리스크 분석을 위한 타입 정의
export interface PortfolioAsset {
  ticker: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  allocation?: number; // 비중 (%)
}

export interface UserProfile {
  age: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentGoal: string;
  dependents: number; // 부양가족 수
}

// Panic Shield 5개 하위 지표 (CNN Fear & Greed 스타일 분해)
export interface PanicSubScores {
  portfolioLoss: number;       // 포트폴리오 손실률 (0-100)
  concentrationRisk: number;   // 자산 집중도 (0-100)
  volatilityExposure: number;  // 변동성 노출 (0-100)
  stopLossProximity: number;   // 손절선 근접도 (0-100)
  marketSentiment: number;     // 시장 심리 (0-100)
}

// FOMO Vaccine 3개 하위 지표 (종목별 경고 근거 분해)
export interface FomoSubScores {
  valuationHeat: number;    // 밸류에이션 과열도 (0-100, PER/PBR 기반)
  shortTermSurge: number;   // 단기 급등률 (0-100, 최근 1개월)
  marketOverheat: number;   // 시장 과열 신호 (0-100, RSI/공매도)
}

export interface RiskAnalysisResult {
  panicShieldIndex: number; // 0-100 (높을수록 안전)
  panicShieldLevel: 'SAFE' | 'CAUTION' | 'DANGER';
  panicShieldReason?: string; // [NEW] 왜 이런 점수인지 한 줄 설명 (예: "현금 20%로 안정적")
  panicSubScores?: PanicSubScores; // 5개 하위 지표 (점수 분해)
  stopLossGuidelines: {
    ticker: string;
    name: string;
    suggestedStopLoss: number; // 손절가 (%)
    currentLoss: number; // 현재 손실률
    action: 'HOLD' | 'WATCH' | 'REVIEW';
  }[];
  fomoAlerts: {
    ticker: string;
    name: string;
    overvaluationScore: number; // 0-100 (높을수록 고평가)
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
    subScores?: FomoSubScores; // 3개 하위 지표 (경고 근거 분해)
  }[];
  personalizedAdvice: string[];
  portfolioSnapshot: {
    totalValue: number;
    totalGainLoss: number;
    gainLossPercent: number;
    diversificationScore: number; // 0-100
  };
}

// ============================================================================
// 시장 브리핑 - 아침 처방전
// ============================================================================

export interface MorningBriefingResult {
  macroSummary: {
    title: string;
    highlights: string[];
    interestRateProbability: string;
    marketSentiment: 'BULLISH' | 'NEUTRAL' | 'BEARISH';
  };
  portfolioActions: {
    ticker: string;
    name: string;
    action: 'BUY' | 'HOLD' | 'SELL' | 'WATCH';
    reason: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];
  realEstateInsight?: {
    title: string;
    analysis: string;
    recommendation: string;
  };
  cfoWeather: {
    emoji: string;
    status: string;
    message: string;
  };
  generatedAt: string;
}

/**
 * 시장 브리핑 생성
 * - 실시간 Google Search 그라운딩으로 최신 뉴스 반영
 * - 거시경제 요약
 * - 포트폴리오별 액션 (수익률 기반)
 * - 부동산 인사이트
 * - 투자 날씨
 */
export const generateMorningBriefing = async (
  portfolio: PortfolioAsset[],
  options?: {
    includeRealEstate?: boolean;
    realEstateContext?: string;
  }
): Promise<MorningBriefingResult> => {
  try {
    // [핵심] Supabase Edge Function으로 Gemini API 프록시 호출
    // 이유: 클라이언트 측 네트워크 제한 우회 + API 키 보안 강화
    const invokeResult = await Promise.race([
      supabase.functions.invoke('gemini-proxy', {
        body: {
          type: 'morning-briefing',
          data: {
            portfolio: portfolio.map(p => ({
              ticker: p.ticker,
              name: p.name,
              currentValue: p.currentValue,
              avgPrice: p.avgPrice,
              currentPrice: p.currentPrice,
              allocation: p.allocation,
            })),
            options,
          },
        },
      }),
      new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Edge Function 호출 30초 타임아웃' } }), 30000)
      ),
    ]);
    const { data, error } = invokeResult;

    if (error) {
      console.error('[Edge Function] Error object:', JSON.stringify(error, null, 2));
      throw new Error(`Edge Function Error: ${error.message || JSON.stringify(error)}`);
    }

    if (!data) {
      console.error('[Edge Function] No data returned');
      throw new Error('Edge Function returned no data');
    }

    if (!data.success) {
      console.error('[Edge Function] Unsuccessful response:', JSON.stringify(data, null, 2));
      throw new Error(`Edge Function Error: ${data.error || 'Unknown error'}`);
    }

    return data.data as MorningBriefingResult;

  } catch (error) {
    console.error("Morning Briefing Error:", error);
    // 에러를 그대로 전파 — 호출자가 null로 처리하도록 함
    // (에러 폴백 데이터를 반환하면 DB 캐시에 저장되어 반복적으로 에러 상태가 됨)
    throw error;
  }
};

// 포트폴리오 리스크 분석 (Panic Shield & FOMO Vaccine)
// [실시간 그라운딩] 최신 시장 데이터 기반 분석
export const analyzePortfolioRisk = async (
  portfolio: PortfolioAsset[],
  userProfile?: UserProfile
): Promise<RiskAnalysisResult> => {
  try {
    // 기본 사용자 프로필 (프로필 정보 없을 시 포트폴리오 데이터만으로 분석)
    const profile: UserProfile = userProfile || {
      age: 0,
      riskTolerance: 'moderate',
      investmentGoal: '사용자 프로필 정보 없음',
      dependents: 0,
    };

    // 포트폴리오 데이터 준비 - profit_loss_rate 명시적 계산
    const totalValue = portfolio.reduce((sum, asset) => sum + asset.currentValue, 0);
    const portfolioWithAllocation = portfolio.map(asset => {
      const profitLossRate = asset.avgPrice > 0
        ? ((asset.currentPrice - asset.avgPrice) / asset.avgPrice) * 100
        : 0;
      return {
        ...asset,
        allocation: totalValue > 0 ? (asset.currentValue / totalValue) * 100 : 0,
        profit_loss_rate: profitLossRate, // 수익률 (%)
        gainLossPercent: profitLossRate, // 동일 값 (호환성)
      };
    });

    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    const prompt = `
당신은 행동재무학 전문가입니다. 다음 포트폴리오를 분석하여 "Panic Shield"와 "FOMO Vaccine" 지표를 계산해주세요.

**[중요] 실시간 시장 데이터 활용:**
- Google Search로 각 종목의 *오늘* 시장 상황을 검색하세요
- 검색 키워드 예시: "${portfolioWithAllocation.map(p => p.ticker).join(' 주가')}", "VIX 지수", "공포탐욕지수"
- 실시간 뉴스를 기반으로 리스크 평가에 반영하세요

**오늘 날짜:** ${dateStr}

**사용자 프로필:**
${profile.age > 0 ? `- 나이: ${profile.age}세` : '- 나이: 정보 없음 (포트폴리오 데이터 기반으로 분석)'}
- 투자 성향: ${profile.riskTolerance}
- 투자 목표: ${profile.investmentGoal}
${profile.dependents > 0 ? `- 부양가족: ${profile.dependents}명` : '- 부양가족: 정보 없음'}

**포트폴리오 (수익률 포함):**
${JSON.stringify(portfolioWithAllocation.map(p => ({
  ticker: p.ticker,
  name: p.name,
  quantity: p.quantity,
  avgPrice: p.avgPrice,
  currentPrice: p.currentPrice,
  currentValue: p.currentValue,
  allocation: p.allocation.toFixed(1) + '%',
  profit_loss_rate: p.profit_loss_rate.toFixed(2) + '%', // 손익률 명시
})), null, 2)}

**수익률 기반 분석 지침:**
- profit_loss_rate > +30%: FOMO 고위험 (익절 검토)
- profit_loss_rate > +50%: FOMO 최고위험 (부분 익절 강력 권고)
- profit_loss_rate < -10%: Panic 주의 (손절선 확인)
- profit_loss_rate < -20%: Panic 위험 (즉각 행동 필요)

**분석 요청:**

1. **Panic Shield Index (0-100)**
   - 포트폴리오의 전반적인 안정성 점수
   - 70 이상: SAFE (안전)
   - 40-69: CAUTION (주의)
   - 40 미만: DANGER (위험)
   - 고려 요소: 분산도, 변동성 자산 비중, 손실 자산 비중, *실시간 시장 변동성*

2. **손절 가이드라인**
   - 각 자산별 권장 손절선 (%)
   - 현재 손실률(profit_loss_rate)과 비교하여 action 결정:
     - HOLD: 손절선 도달 전
     - WATCH: 손절선 근접 (5% 이내)
     - REVIEW: 손절선 초과 (점검 필요)
   - *실시간 뉴스*가 손절 판단에 영향을 미치면 reason에 명시

3. **FOMO Vaccine (고평가 경고)**
   - profit_loss_rate가 높은 자산 우선 분석
   - *최신 뉴스 기반* 고평가 여부 판단 (예: "어젯밤 실적 미달 발표")
   - overvaluationScore: 0-100
   - severity: LOW (0-30), MEDIUM (31-60), HIGH (61-100)
   - 구체적 사유 (예: "현재 +45% 수익 중, 최근 3개월 200% 상승")

4. **맞춤 조언**
   - ${profile.age > 0 ? `${profile.age}세 ${profile.dependents > 0 ? '가장' : '투자자'}의 관점에서` : '포트폴리오 데이터를 기반으로'} 3가지 핵심 조언
   - ${profile.dependents > 0 ? '가족 부양 책임을 고려한 실용적 조언' : '포트폴리오 구성에 기반한 실용적 조언'}
   - *오늘의 시장 상황*을 반영한 타이밍 조언

**출력 형식 (JSON만, 마크다운 코드블록 금지):**
{
  "panicShieldIndex": number,
  "panicShieldLevel": "SAFE" | "CAUTION" | "DANGER",
  "panicShieldReason": "왜 이런 점수인지 한 줄로 설명 (예: 현금 비중 20%로 안정적 / 손실 종목이 많아 위험 / 분산이 잘 되어 있음)",
  "panicSubScores": {
    "portfolioLoss": 0-100,
    "concentrationRisk": 0-100,
    "volatilityExposure": 0-100,
    "stopLossProximity": 0-100,
    "marketSentiment": 0-100
  },
  "stopLossGuidelines": [...],
  "fomoAlerts": [
    {
      "ticker": "NVDA",
      "name": "엔비디아",
      "overvaluationScore": 75,
      "severity": "HIGH",
      "reason": "설명",
      "subScores": {
        "valuationHeat": 0-100,
        "shortTermSurge": 0-100,
        "marketOverheat": 0-100
      }
    }
  ],
  "personalizedAdvice": ["[실시간 반영] 조언1", "조언2", "조언3"],
  "diversificationScore": number
}
`;

    // [핵심] Google Search 그라운딩이 활성화된 모델 사용 + 타임아웃/재시도
    const responseText = await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 30000, maxRetries: 1 });

    // JSON 정제 및 파싱 (통합 파서 사용)
    const analysisResult = parseGeminiJson(responseText);

    // 총 손익 계산
    const totalCostBasis = portfolio.reduce(
      (sum, asset) => sum + (asset.avgPrice * asset.quantity),
      0
    );
    const totalGainLoss = totalValue - totalCostBasis;
    const gainLossPercent = totalCostBasis > 0
      ? (totalGainLoss / totalCostBasis) * 100
      : 0;

    return {
      panicShieldIndex: analysisResult.panicShieldIndex || 50,
      panicShieldLevel: analysisResult.panicShieldLevel || 'CAUTION',
      panicShieldReason: analysisResult.panicShieldReason || undefined,
      panicSubScores: analysisResult.panicSubScores || undefined,
      stopLossGuidelines: analysisResult.stopLossGuidelines || [],
      fomoAlerts: (analysisResult.fomoAlerts || []).map((alert: any) => ({
        ...alert,
        subScores: alert.subScores || undefined,
      })),
      personalizedAdvice: analysisResult.personalizedAdvice || [],
      portfolioSnapshot: {
        totalValue,
        totalGainLoss,
        gainLossPercent,
        diversificationScore: analysisResult.diversificationScore || 50,
      },
    };

  } catch (error) {
    console.error("Portfolio Risk Analysis Error:", error);

    // 🔍 상세 에러 로그 (디버깅용)
    if (error instanceof Error) {
      console.error('에러 메시지:', error.message);
      console.error('에러 스택:', error.stack);
    }

    // API 키 확인
    if (!API_KEY) {
      console.error('❌ API 키가 없습니다. .env 파일을 확인하고 앱을 재시작하세요.');
    }

    // 에러 시 기본값 반환
    const totalValue = portfolio.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalCostBasis = portfolio.reduce(
      (sum, asset) => sum + (asset.avgPrice * asset.quantity),
      0
    );

    // 에러 종류에 따른 맞춤 메시지
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isNetworkError = errorMessage.includes('Network request failed');
    const isAPIKeyError = errorMessage.includes('API_KEY_INVALID') || !API_KEY;

    let adviceMessages = [
      '포트폴리오 분석 중 오류가 발생했습니다.',
      '잠시 후 다시 시도해주세요.',
    ];

    if (isNetworkError) {
      adviceMessages = [
        '⚠️ 네트워크 연결 오류',
        'Wi-Fi 또는 모바일 데이터 연결을 확인해주세요.',
        '앱을 완전히 종료 후 재시작해보세요.',
      ];
    } else if (isAPIKeyError) {
      adviceMessages = [
        '⚠️ API 설정 오류',
        '앱을 재시작해주세요. (설정 → 앱 강제 종료)',
        '문제가 지속되면 개발자에게 문의해주세요.',
      ];
    }

    return {
      panicShieldIndex: 50,
      panicShieldLevel: 'CAUTION',
      stopLossGuidelines: [],
      fomoAlerts: [],
      personalizedAdvice: adviceMessages,
      portfolioSnapshot: {
        totalValue,
        totalGainLoss: totalValue - totalCostBasis,
        gainLossPercent: totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0,
        diversificationScore: 50,
      },
    };
  }
};

// ============================================================================
// [배분 최적화] AI 기반 포트폴리오 최적 배분 제안
// ============================================================================

/**
 * AI 배분 최적화 입력 인터페이스
 */
export interface OptimalAllocationInput {
  assets: PortfolioAsset[];
  currentHealthScore: number;
  targetAllocation?: Record<string, number>; // 목표 배분 (optional)
}

/**
 * AI 배분 최적화 결과 인터페이스
 */
export interface OptimalAllocationResult {
  summary: string; // 전체 요약
  recommendations: {
    ticker: string;
    name: string;
    currentAllocation: number; // 현재 비중 (%)
    suggestedAllocation: number; // 제안 비중 (%)
    adjustmentPercent: number; // 조정률 (-50% ~ +100%)
    reason: string; // 조정 이유
  }[];
  expectedHealthScore: number; // 예상 건강 점수
  expectedImprovement: number; // 예상 개선 점수
  generatedAt: string;
}

/**
 * AI 기반 포트폴리오 최적 배분 계산
 *
 * 목표: 건강 점수를 최대화하는 자산 배분 제안
 * 제약: 500 토큰 이하 (비용 절감)
 */
export const generateOptimalAllocation = async (
  input: OptimalAllocationInput
): Promise<OptimalAllocationResult> => {
  try {
    const totalValue = input.assets.reduce((s, a) => s + a.currentValue, 0);

    // 자산 정보 요약 (상위 5개만, 토큰 절약)
    const assetsSummary = input.assets.slice(0, 5).map(a => ({
      ticker: a.ticker,
      name: a.name,
      allocation: totalValue > 0 ? ((a.currentValue / totalValue) * 100).toFixed(1) : '0',
      value: a.currentValue,
    }));

    const prompt = `
당신은 포트폴리오 최적화 전문가입니다. 다음 포트폴리오의 건강 점수를 최대화하는 배분을 제안하세요.

**현재 포트폴리오 (상위 5개):**
${JSON.stringify(assetsSummary, null, 2)}

**현재 건강 점수:** ${input.currentHealthScore}점

**최적화 목표:**
1. 건강 점수 최대화 (목표: 80점 이상)
2. 배분 이탈도 최소화 (균형 잡힌 포트폴리오)
3. 리스크 분산 (단일 자산 과도 집중 방지)

**제안 규칙:**
- 각 자산의 조정률: -50% ~ +100%
- 최소 2개, 최대 5개 자산만 조정
- 조정 이유는 구체적으로 (예: "집중도 완화", "목표 배분 회귀")

**출력 형식 (JSON만):**
{
  "summary": "전체 요약 1-2문장",
  "recommendations": [
    {
      "ticker": "NVDA",
      "name": "엔비디아",
      "currentAllocation": 25.0,
      "suggestedAllocation": 20.0,
      "adjustmentPercent": -20,
      "reason": "집중도 완화로 리스크 분산"
    }
  ],
  "expectedHealthScore": 90,
  "expectedImprovement": 10
}

중요: 유효한 JSON만 반환. 마크다운 금지. 한국어 작성.
`;

    const text = await callGeminiSafe(model, prompt);

    // JSON 정제 및 파싱 (통합 파서 사용)
    const optimizationResult = parseGeminiJson(text);

    return {
      ...optimizationResult,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error('배분 최적화 생성 오류:', error);
    throw new Error('배분 최적화 분석에 실패했습니다');
  }
};

export const generateDeepDive = async (
  input: DeepDiveInput
): Promise<DeepDiveResult> => {
  // 팩트 데이터가 있으면 프롬프트에 주입
  const fundamentals = input.fundamentals;
  const hasFundamentals = fundamentals != null && fundamentals.marketCap != null;

  // 환율 정보
  const exchangeRate = fundamentals?.exchangeRate;
  const isUSD = fundamentals?.currency !== 'KRW' && fundamentals?.currency != null;

  // KRW 금액 포맷 헬퍼
  const fmtKRW = (v: number): string => {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `약 ${(v / 1e12).toFixed(1)}조원`;
    if (abs >= 1e8) return `약 ${(v / 1e8).toFixed(0)}억원`;
    return `₩${v.toLocaleString()}`;
  };

  // --- 팩트 데이터 섹션 (API 조회 성공 시) ---
  const factDataSection = hasFundamentals ? `
[★★★ 실제 API 조회 데이터 — 이 숫자를 그대로 사용하세요 ★★★]
아래 데이터는 Yahoo Finance API에서 실시간 조회한 팩트 데이터입니다.
이 숫자들을 임의로 변경하거나 추측하지 마세요. 그대로 metrics에 반영하세요.
${isUSD && exchangeRate ? `\n[적용 환율] 1 USD = ${exchangeRate.toFixed(2)} KRW (실시간 조회)` : ''}
${isUSD ? '\n[★ 원화 표기 규칙] 미국 주식이므로 모든 금액(시가총액, 매출, 영업이익, 순이익 등)을 원화(₩)로 환산하여 표시하세요.' : ''}

시가총액: ${fundamentals!.marketCapKRW != null ? fmtKRW(fundamentals!.marketCapKRW) : fundamentals!.marketCap!.toLocaleString() + '원'}${isUSD && fundamentals!.marketCap ? ` ($${(fundamentals!.marketCap / 1e9).toFixed(1)}B)` : ''}
${fundamentals!.currentPrice != null ? (isUSD && exchangeRate ? `현재 주가: ₩${Math.round(fundamentals!.currentPrice * exchangeRate).toLocaleString()} ($${fundamentals!.currentPrice.toLocaleString()})` : `현재 주가: ₩${fundamentals!.currentPrice.toLocaleString()}`) : ''}
${fundamentals!.trailingPE != null ? `PER (Trailing): ${fundamentals!.trailingPE.toFixed(2)}` : 'PER: 데이터 없음 — Google Search로 조회하세요'}
${fundamentals!.forwardPE != null ? `PER (Forward): ${fundamentals!.forwardPE.toFixed(2)}` : ''}
${fundamentals!.priceToBook != null ? `PBR: ${fundamentals!.priceToBook.toFixed(2)}` : 'PBR: 데이터 없음 — Google Search로 조회하세요'}
${fundamentals!.returnOnEquity != null ? `ROE: ${(fundamentals!.returnOnEquity * 100).toFixed(2)}%` : ''}
${fundamentals!.operatingMargins != null ? `영업이익률: ${(fundamentals!.operatingMargins * 100).toFixed(2)}%` : ''}
${fundamentals!.profitMargins != null ? `순이익률: ${(fundamentals!.profitMargins * 100).toFixed(2)}%` : ''}
${fundamentals!.revenueGrowth != null ? `매출성장률(YoY): ${(fundamentals!.revenueGrowth * 100).toFixed(2)}%` : ''}
${fundamentals!.debtToEquity != null ? `부채비율: ${fundamentals!.debtToEquity.toFixed(2)}%` : ''}
${fundamentals!.quarterlyEarnings && fundamentals!.quarterlyEarnings.length > 0
    ? '\n분기별 실적 (API 조회, 원화 환산):\n' + fundamentals!.quarterlyEarnings.map(q => {
        const revDisplay = q.revenueKRW != null ? fmtKRW(q.revenueKRW) : (q.revenue != null ? `$${q.revenue.toLocaleString()}` : 'N/A');
        const earnDisplay = q.earningsKRW != null ? fmtKRW(q.earningsKRW) : (q.earnings != null ? `$${q.earnings.toLocaleString()}` : 'N/A');
        return `- ${q.quarter}: 매출 ${revDisplay}, 순이익 ${earnDisplay}`;
      }).join('\n')
    : ''}

[중요] 위 데이터를 financial.metrics에 그대로 사용하고, marketCap/per/pbr 필드에도 그대로 넣으세요.
없는 항목만 Google Search로 보완하세요.
${isUSD ? `[중요] marketCap 필드에는 원화 환산값(숫자)을 넣으세요. quarterlyData의 매출/영업이익/순이익도 모두 원화(₩)로 환산하세요. 환율: ${exchangeRate?.toFixed(2) || '1450'}원.` : ''}
` : `
[★★★ 데이터 정확성 — 최우선 원칙 ★★★]
API 데이터 조회에 실패하여 Google Search를 활용합니다.

1. **시가총액**: 반드시 Google Search로 "${input.ticker} market cap"을 검색하여 최신 USD 시가총액을 확인하세요.
   - 참고: Tesla ~$1.1T, Samsung Electronics ~$350B, Apple ~$3.4T, NVIDIA ~$3.2T
   - USD → KRW 환산 시 실시간 환율 적용 (없으면 1,450원)
   - 테슬라가 2조원이 될 수 없습니다 (실제 ~1,600조원). 반드시 검증하세요.
   - **모든 금액은 원화(₩)로 환산하여 표시하세요**

2. **PER/PBR**: "${input.ticker} PE ratio PBR" 검색하여 실제 값 사용

3. **분기 실적**: "${input.name} quarterly earnings 2024" 검색하여 실제 발표 실적 사용
   - 가짜 숫자를 만들지 마세요.
   - **매출, 영업이익, 순이익은 원화(₩)로 환산하여 표시**
`;

  const prompt = `
당신은 CFA 자격을 보유한 골드만삭스 수석 애널리스트입니다.
${hasFundamentals
    ? '아래 제공된 실제 API 데이터를 기반으로 분석 리포트를 작성하세요. 기술적 분석과 뉴스는 Google Search를 활용하세요.'
    : 'Google Search를 활용하여 **실시간 데이터**를 조회한 후 분석 리포트를 작성하세요.'}

[분석 대상]
- 종목: ${input.name} (${input.ticker})
${input.currentPrice ? `- 현재가: ₩${input.currentPrice.toLocaleString()}` : ''}
${input.avgPrice ? `- 평균 매수가: ₩${input.avgPrice.toLocaleString()}` : ''}
${input.quantity ? `- 보유 수량: ${input.quantity}주` : ''}

${factDataSection}

[★ 점수 산정 기준 — 4인 전문가 라운드테이블 합의 (Goldman Sachs PM + Cathie Wood + Buffett + Dalio)]

overallScore, financial.score, technical.score, quality.score는 반드시 아래 기준에 따라 종목별로 다르게 산출하세요.
각 항목의 계산 과정을 내부적으로 수행한 후 최종 점수만 출력하세요.

■ financial.score (재무 점수, 0-100):
  기본 40점에서 시작:

  [밸류에이션 — 최대 ±20점]
  - PER: ★업종 평균을 반드시 Google Search로 확인 후, Forward PER(없으면 Trailing PER)을 업종 평균과 비교
    → Forward PER < 업종 평균 × 0.7: 저평가(+15)
    → Forward PER 업종 평균 × 0.7~1.3: 적정(+5)
    → Forward PER 업종 평균 × 1.3~2.0: 고평가(-5)
    → Forward PER > 업종 평균 × 2.0: 초고평가(-10)
    ※ 적자기업(PER 음수/N/A): 매출성장률 30%+ → 중립(0), 그 외 → (-15)
  - PBR: ★업종 유형에 따라 다른 기준 적용
    → 자산집약 업종(금융/제조/유틸리티/건설): PBR<1(+10) / 1~2(+5) / 2~3(0) / 3+(-5)
    → 자산경량 업종(SW/플랫폼/SaaS/바이오/콘텐츠): PBR<5(+5) / 5~15(0) / 15~30(-3) / 30+(-5)

  [수익성 — 최대 ±25점]
  - ROE (★3년 평균 우선, 없으면 최근 실적):
    → 20%+(+15) / 15~20%(+10) / 10~15%(+5) / 5~10%(0) / 5%미만(-10)
  - 영업이익률: ★업종 평균 대비 판단 (Google Search로 확인)
    → 업종 평균의 1.5배 이상(+10) / 업종 평균 이상(+5) / 업종 평균 미만(0) / 적자(-10)
    ※ 확인 불가 시: 20%+(+10) / 10~20%(+5) / 0~10%(0) / 적자(-10)
  - 잉여현금흐름(FCF): Google Search로 최근 연간 FCF 확인
    → FCF 양수 + 증가 추세(+10) / FCF 양수(+5) / FCF 음수(-5) / FCF 음수 + 악화(-10)

  [성장성 — 최대 ±20점]
  - 매출성장률 YoY: ★가속/감속 반드시 구분
    → 30%+ AND 가속(전년보다 성장률 상승)(+15) / 30%+ AND 감속(+10)
    → 20~30%(+8) / 10~20%(+5) / 0~10%(0)
    → 마이너스 AND 일시적(업황 사이클)(-5) / 마이너스 AND 구조적(-10)

  [안정성 — 최대 ±15점]
  - 부채비율: 50%미만(+8) / 50~100%(+3) / 100~200%(0) / 200%초과(-7)
  - 이익 안정성: 최근 4분기 영업이익 모두 흑자(+5) / 혼합(0) / 연속 적자(-5)
    ※ 고성장 적자기업(매출성장 30%+): 적자 패널티 면제(0)

■ technical.score (기술 보조 점수, 0-100):
  기본 50점에서 시작:
  - 이동평균(20/60/120일): 정배열(+15) / 역배열(-15) / 혼합(0)
  - 현재가 vs 120일 이평: 120일선 위 10%+(+5) / 위(+3) / 아래(-3) / 아래 20%+(-5)
  - RSI(14일): 40~60(+5) / 60~70(+8) / 30~40(-3) / 70+(과매수 -8) / 30미만(역발상 +10)
  - MACD: 골든크로스(+7) / 데드크로스(-7) / 중립(0)
  - 거래량: 20일 평균 대비 200%+(+5) / 50%미만(-5) / 보통(0)
  - 볼린저밴드: 하단 접근(+5) / 상단 돌파(-3) / 중앙(+2)

■ quality.score (투자 품질 점수, 0-100) ★신규:
  기본 50점에서 시작:
  - 경쟁우위(Moat): 브랜드파워/네트워크효과/전환비용/원가우위/규모의경제 중
    → 2개 이상 보유(+20) / 1개 보유(+10) / 판별 불가(0) / 진입장벽 낮음(-10)
  - 경영진 신뢰도: 주주환원(배당/자사주) + CEO 실행력
    → 우수(+10) / 보통(0) / 우려(-10)
  - 산업 성장성: 해당 업종의 향후 3~5년 전망
    → 고성장 산업(+10) / 성숙 산업(0) / 쇠퇴 산업(-10)

■ overallScore (종합 점수):
  = financial.score × 0.55 + technical.score × 0.15 + news_score × 0.15 + quality.score × 0.15

  ※ news_score 산정 (5단계):
    - VERY_POSITIVE(90): 실적 서프라이즈, M&A, 대형 수주 등 구조적 호재
    - POSITIVE(70): 목표가 상향, 업종 호재
    - NEUTRAL(50): 특이사항 없음
    - NEGATIVE(30): 실적 미달, 업종 악재
    - VERY_NEGATIVE(10): 회계 이슈, 대형 소송, 규제 충격 등 구조적 악재

■ recommendation (분석 의견 — 투자 자문이 아닌 분석 등급):
  78+: VERY_POSITIVE / 63~77: POSITIVE / 42~62: NEUTRAL / 28~41: NEGATIVE / 27 이하: VERY_NEGATIVE

[필수 분석 항목]
1. 재무 분석 (financial): PER, PBR, ROE, 매출성장률, 영업이익률, 부채비율 + 시가총액 + 최근 4분기 매출/영업이익/순이익
2. 기술적 분석 (technical): RSI, MACD, 이동평균선(20/60/120일), 볼린저밴드, 거래량 추이
3. 뉴스/이벤트 분석 (news): 최근 주요 뉴스 3개 이상 + 센티먼트
4. AI 종합 의견 (aiOpinion): 매수/매도 의견, 목표가, 강세/약세 시나리오
5. 분기별 실적 (quarterlyData): 최근 4분기 매출/영업이익/순이익 (실제 실적 발표 기준)
6. 최신 분기 상세 (quarterDetail): 사업부별 매출 비중, 주요 비용, 워터폴 흐름
7. 밸류에이션 (marketCap, per, pbr): 시가총액(원), PER, PBR 숫자값
8. 데이터 출처 (dataSources): 사용한 데이터의 출처 목록

[출력 형식] 반드시 아래 JSON 구조로 반환 (값은 실제 분석 결과로 채우세요):
{
  "ticker": "${input.ticker}",
  "name": "${input.name}",
  "overallScore": <0-100 위 기준으로 계산한 실제 점수>,
  "recommendation": "<VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE>",
  "sections": {
    "financial": {
      "title": "재무 분석",
      "score": <0-100 위 기준으로 계산한 실제 점수>,
      "highlights": ["실제 재무 분석 내용 3개 이상"],
      "metrics": [
        {"label": "PER", "value": "<실제값>", "status": "<good|neutral|bad>"},
        {"label": "PBR", "value": "<실제값>", "status": "<good|neutral|bad>"},
        {"label": "ROE", "value": "<실제값>%", "status": "<good|neutral|bad>"},
        {"label": "영업이익률", "value": "<실제값>%", "status": "<good|neutral|bad>"},
        {"label": "매출성장률", "value": "<실제값>% (가속/감속 명시)", "status": "<good|neutral|bad>"},
        {"label": "FCF", "value": "<양수/음수, 약 X억원>", "status": "<good|neutral|bad>"},
        {"label": "부채비율", "value": "<실제값>%", "status": "<good|neutral|bad>"},
        {"label": "시가총액", "value": "<약 X조원 형태>", "status": "neutral"}
      ]
    },
    "technical": {
      "title": "기술적 분석",
      "score": <0-100 위 기준으로 계산한 실제 점수>,
      "highlights": ["실제 기술적 분석 내용 3개 이상"],
      "signals": [
        {"indicator": "RSI", "signal": "<과매수|중립|과매도>", "value": "<실제값>"},
        {"indicator": "MACD", "signal": "<골든크로스|데드크로스|중립>", "value": "<실제값>"},
        {"indicator": "이동평균", "signal": "<정배열|역배열|혼합>", "value": "<20일/60일/120일 수치>"},
        {"indicator": "볼린저밴드", "signal": "<상단|중앙|하단>", "value": "<실제 위치>"},
        {"indicator": "거래량", "signal": "<급증|보통|급감>", "value": "<평균 대비 비율>"}
      ]
    },
    "news": {
      "title": "뉴스 분석",
      "sentiment": "<VERY_POSITIVE|POSITIVE|NEUTRAL|NEGATIVE|VERY_NEGATIVE>",
      "highlights": ["실제 뉴스 기반 분석 3개 이상"],
      "recentNews": [
        {"title": "<실제 뉴스 제목>", "impact": "<긍정적|중립|부정적>", "date": "<YYYY-MM-DD>"}
      ]
    },
    "quality": {
      "title": "투자 품질",
      "score": <0-100 위 기준으로 계산>,
      "highlights": ["경쟁우위/경영진/산업 분석 3개 이상"],
      "metrics": [
        {"label": "경쟁우위(Moat)", "value": "<강력|보통|약함>", "status": "<good|neutral|bad>", "detail": "<보유한 Moat 설명>"},
        {"label": "경영진", "value": "<우수|보통|우려>", "status": "<good|neutral|bad>", "detail": "<주주환원/실행력>"},
        {"label": "산업 성장성", "value": "<고성장|성숙|쇠퇴>", "status": "<good|neutral|bad>", "detail": "<3~5년 전망>"}
      ]
    },
    "aiOpinion": {
      "title": "AI 종합 의견",
      "summary": "<종합 분석 요약 2-3문장>",
      "bullCase": ["강세 시나리오 2개 이상"],
      "bearCase": ["약세 시나리오 2개 이상"],
      "targetPrice": "<목표 주가>",
      "timeHorizon": "<투자 기간>"
    }
  },
  "generatedAt": "${new Date().toISOString()}",

  "quarterlyData": [
    {"quarter": "2024 Q1", "revenue": <매출액(원)>, "operatingIncome": <영업이익(원)>, "netIncome": <순이익(원)>},
    {"quarter": "2024 Q2", "revenue": <매출액>, "operatingIncome": <영업이익>, "netIncome": <순이익>},
    {"quarter": "2024 Q3", "revenue": <매출액>, "operatingIncome": <영업이익>, "netIncome": <순이익>},
    {"quarter": "2024 Q4", "revenue": <매출액>, "operatingIncome": <영업이익>, "netIncome": <순이익>}
  ],
  "quarterDetail": {
    "quarter": "<가장 최근 실적 발표 분기, 예: 2024 Q4>",
    "revenueSegments": [
      {"name": "<사업부명>", "amount": <매출액(원)>, "percentage": <비중%>, "color": "#6366F1", "growth": <전년동기대비 성장률%>},
      {"name": "<사업부명>", "amount": <매출액>, "percentage": <비중%>, "color": "#8B5CF6", "growth": <성장률%>},
      {"name": "<사업부명>", "amount": <매출액>, "percentage": <비중%>, "color": "#EC4899", "growth": <성장률%>}
    ],
    "costItems": [
      {"name": "매출원가", "amount": <금액(원)>, "percentage": <매출대비 비중%>},
      {"name": "판관비", "amount": <금액>, "percentage": <비중%>},
      {"name": "연구개발비", "amount": <금액>, "percentage": <비중%>}
    ],
    "waterfall": [
      {"label": "매출", "amount": <총매출(원)>, "type": "revenue"},
      {"label": "매출원가", "amount": <매출원가(원)>, "type": "cost"},
      {"label": "매출총이익", "amount": <매출총이익(원)>, "type": "subtotal"},
      {"label": "판관비", "amount": <판관비(원)>, "type": "cost"},
      {"label": "영업이익", "amount": <영업이익(원)>, "type": "income"},
      {"label": "기타손익", "amount": <기타손익(원)>, "type": "cost"},
      {"label": "순이익", "amount": <순이익(원)>, "type": "income"}
    ],
    "operatingMargin": <영업이익률(%)>,
    "netMargin": <순이익률(%)>,
    "keyTakeaway": "<이번 분기 핵심 포인트 한 문장>"
  },
  "marketCap": <시가총액(원, 숫자만. 예: 테슬라 약 1600000000000000, 삼성전자 약 500000000000000)>,
  "per": <PER(숫자만)>,
  "pbr": <PBR(숫자만)>,
  "dataSources": [
    ${hasFundamentals ? '{"name": "Yahoo Finance API", "detail": "시가총액, PER, PBR, ROE, 영업이익률, 매출성장률, 부채비율, 분기실적' + (isUSD && exchangeRate ? ` (환율 ${exchangeRate.toFixed(2)}원 적용)` : '') + '", "date": "' + (fundamentals?.fetchedAt || new Date().toISOString()) + '"},' : ''}
    {"name": "Google Search", "detail": "기술적 분석, 뉴스, 사업부별 상세", "date": "${new Date().toISOString().split('T')[0]}"}
  ]
}

★★★ 절대 규칙 ★★★
1. 유효한 JSON만 반환. 마크다운 코드블록이나 설명 텍스트 없이 JSON만 출력.
2. overallScore, financial.score, technical.score는 반드시 종목별로 실제 데이터 기반으로 다르게 산출.
3. 예시 숫자(75, 80, 65)를 그대로 사용하면 안 됨. 실제 계산 결과를 넣으세요.
4. recommendation은 overallScore 기준에 따라 결정 (분석 의견이며 투자 권유가 아님).
5. 한국어로 작성.
6. quarterlyData는 실제 실적 발표 기준으로 작성. 사업보고서/분기보고서 기반 데이터 사용.
7. quarterDetail.revenueSegments의 color 필드에는 "#6366F1", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6" 중에서 순서대로 배정.
8. marketCap, per, pbr, revenue, operatingIncome, netIncome 등 JSON 숫자 필드는 반드시 **숫자만** 입력 (₩, $, 원, 조, 억 등 문자 붙이지 말 것). 예: "marketCap": 1600000000000000 (테슬라 원화 환산값)
9. dataSources에 사용한 데이터 출처를 반드시 2개 이상 명시하세요.
10. 시가총액 검증: 미국 대형주(TSLA, AAPL, NVDA 등)는 최소 수백조원 이상이어야 합니다. 조 단위 미만이면 재검색하세요.
11. **원화 환산 규칙**: 미국 주식의 금액은 모두 원화(₩) 환산값을 사용. ${isUSD && exchangeRate ? `환율 ${exchangeRate.toFixed(2)}원 적용.` : '실시간 환율 적용.'} 단, JSON 숫자 필드에는 ₩ 기호를 붙이지 마세요. metrics의 "value" 문자열에만 "약 1,600조원" 형태로 표기.
${hasFundamentals ? '12. API 제공 데이터(시가총액, PER, PBR, ROE 등)는 반드시 그대로 사용하세요. 임의로 수정하지 마세요.' : ''}
`;

  // ★ Google Search 모델 → 실패 시 일반 모델 폴백 (2단계 시도)
  let text: string;
  try {
    // 1차: Google Search 그라운딩 활성화 모델 (60초)
    console.log('[DeepDive] 1차 시도: Google Search 모델');
    text = await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 60000, maxRetries: 0 });
  } catch (searchErr: any) {
    console.warn('[DeepDive] Google Search 모델 실패:', searchErr.message?.substring(0, 100));
    console.log('[DeepDive] 2차 시도: 일반 모델 (Google Search 없이)');
    // 2차: 일반 모델 폴백 (Google Search 없이, 60초)
    text = await callGeminiSafe(model, prompt, { timeoutMs: 60000, maxRetries: 1 });
  }

  try {
    if (__DEV__) {
      console.log('[DeepDive] Gemini 원본 응답 길이:', text.length);
      console.log('[DeepDive] 응답 앞 200자:', text.substring(0, 200));
    }

    // JSON 정제 및 파싱 (통합 파서 사용)
    return parseGeminiJson<DeepDiveResult>(text);
  } catch (parseErr) {
    console.error('[DeepDive] JSON 파싱 실패. 원본 응답 앞 500자:', text.substring(0, 500));
    console.error('[DeepDive] JSON 파싱 에러:', parseErr);
    throw new Error('AI 응답 형식 오류 — 재시도해주세요');
  }
};

// ============================================================================
// [마켓플레이스] What-If 시뮬레이터 — 시나리오별 포트폴리오 영향 분석
// ============================================================================

export const generateWhatIf = async (
  input: WhatIfInput
): Promise<WhatIfResult> => {
  const portfolioStr = input.portfolio
    .map(a => `${a.name}(${a.ticker}): ₩${a.currentValue.toLocaleString()} / 비중 ${a.allocation}%`)
    .join('\n');

  const magnitude = input.magnitude || -20;

  const prompt = `
당신은 골드만삭스 출신 리스크 관리 전문가(CRM)입니다.
사용자의 포트폴리오에 특정 시나리오가 발생할 경우, 자산별로 **서로 다른 영향도**를 분석하세요.

[시나리오]
- 유형: ${input.scenario}
- 상세: ${input.description}
- 기준 변동폭: ${magnitude}%

[현재 포트폴리오]
${portfolioStr}

[★★★ 핵심 규칙: 자산 클래스별 감응도(Beta) ★★★]
시나리오의 기준 변동폭(${magnitude}%)을 자산 클래스별 beta로 곱해서 각각 다르게 계산하세요.
절대로 모든 자산에 동일한 퍼센트를 적용하지 마세요.

자산 클래스별 감응도 참고표 (시장 폭락 시나리오 기준):
- 고변동 기술주 (NVDA, TSLA, META): beta 1.3~1.5 → 시장보다 더 크게 하락
- 대형 가치주 (AAPL, MSFT, GOOGL): beta 0.9~1.1 → 시장과 유사
- 방어주/가치주 (BRK.B, JNJ, KO): beta 0.5~0.7 → 시장보다 덜 하락
- 금/금ETF (GLD, IAU): beta -0.2~-0.4 → 반대로 상승
- 채권ETF (TLT, AGG, BND): beta -0.1~-0.3 → 소폭 상승
- 암호화폐 (BTC, ETH, XRP): beta 1.5~2.0 → 가장 크게 하락
- 에너지 (XOM, CEG): beta 0.7~1.0 → 시나리오 따라 다름
- 리츠/부동산 (VNQ, O): beta 0.8~1.0 → 금리 시나리오에 민감
- 삼성전자/한국주식: beta 1.0~1.3 → 신흥국 프리미엄 반영

계산 예시 (시장 폭락 ${magnitude}% 시나리오):
- NVDA(기술주): ${magnitude}% × 1.4 = ${(magnitude * 1.4).toFixed(1)}%
- BRK.B(가치주): ${magnitude}% × 0.6 = ${(magnitude * 0.6).toFixed(1)}%
- GLD(금): ${magnitude}% × -0.3 = ${(magnitude * -0.3).toFixed(1)}% (상승!)
- BTC(암호화폐): ${magnitude}% × 1.8 = ${(magnitude * 1.8).toFixed(1)}%

[★ 절대 규칙 ★]
1. 각 자산의 changePercent가 모두 동일하면 실패입니다
2. 금/채권은 시장 폭락 시 반드시 양수(상승)여야 합니다
3. 암호화폐는 기술주보다 더 크게 하락해야 합니다
4. projectedValue = currentValue × (1 + changePercent/100) 으로 정확히 계산

[분석 항목]
1. 전체 영향 요약 (totalImpact) — 포트폴리오 가중평균 변동률
2. 자산별 영향 분석 (assetImpacts) — 자산마다 다른 changePercent
3. 리스크 평가 + 헤지 전략 (riskAssessment)

[출력 형식] 반드시 아래 JSON 구조만 반환 (설명 텍스트 없이):
{
  "scenario": "${input.description}",
  "summary": "전체 요약 (어떤 자산이 가장 취약하고, 어떤 자산이 방어적인지 명시)",
  "totalImpact": {
    "currentTotal": (포트폴리오 총 현재가치),
    "projectedTotal": (시나리오 후 예상 총 가치),
    "changePercent": (가중평균 변동률),
    "changeAmount": (원화 변동액)
  },
  "assetImpacts": [
    {
      "ticker": "종목코드",
      "name": "종목명",
      "currentValue": (현재가치),
      "projectedValue": (예상가치),
      "changePercent": (자산별 개별 변동률 — 모두 다른 값!),
      "impactLevel": "HIGH/MEDIUM/LOW",
      "explanation": "이 자산이 왜 이만큼 영향받는지 1문장"
    }
  ],
  "riskAssessment": {
    "overallRisk": "HIGH/MEDIUM/LOW",
    "vulnerabilities": ["취약점 2~3개"],
    "hedgingSuggestions": ["구체적 헤지 전략 2~3개"]
  },
  "generatedAt": "${new Date().toISOString()}"
}

중요: 유효한 JSON만 반환. 금액은 숫자로, 한국어로 작성. 설명 텍스트를 JSON 앞뒤에 붙이지 마세요.
`;

  try {
    const text = await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 30000, maxRetries: 1 });
    return parseGeminiJson<WhatIfResult>(text);
  } catch (error) {
    console.error('What-If 시뮬레이션 오류:', error);
    throw new Error('What-If 시뮬레이션에 실패했습니다');
  }
};

// ============================================================================
// [마켓플레이스] 세금 최적화 리포트 — 절세 전략 + 매도 타이밍
// ============================================================================

export const generateTaxReport = async (
  input: TaxReportInput
): Promise<TaxReportResult> => {
  const portfolioStr = input.portfolio
    .map(a =>
      `${a.name}(${a.ticker}): 현재 ₩${a.currentValue.toLocaleString()} / ` +
      `매수 ₩${a.costBasis.toLocaleString()} / ${a.quantity}주 / 매수일 ${a.purchaseDate}`
    )
    .join('\n');

  const residencyLabel = input.residency === 'KR' ? '한국' : '미국';

  const prompt = `
당신은 세무 전문가(CPA/세무사)입니다. 사용자의 포트폴리오에 대한 세금 최적화 분석을 제공하세요.

[사용자 정보]
- 거주지: ${residencyLabel}
${input.annualIncome ? `- 연 소득: ₩${input.annualIncome.toLocaleString()}` : '- 연 소득: 미입력'}

[보유 포트폴리오]
${portfolioStr}

[분석 항목]
1. 세금 요약 (예상 양도세, 종합소득세, 실효세율)
2. 절세 전략 (우선순위별, 예상 절세 금액 포함)
3. 종목별 매도 타이밍 권장 (SELL_NOW / HOLD_FOR_TAX / TAX_LOSS_HARVEST)
4. 분기별 연간 플랜

${input.residency === 'KR' ?
  '[한국 세법 적용]\n- 해외주식 양도소득세: 연 250만원 공제 후 22%\n- 금융소득종합과세: 2000만원 초과 시\n- ISA/연금저축 활용 여부 검토' :
  '[미국 세법 적용]\n- Long-term vs Short-term Capital Gains\n- Tax-Loss Harvesting\n- Wash Sale Rule 주의'}

[출력 형식] 반드시 아래 JSON 구조로 반환:
{
  "residency": "${input.residency}",
  "taxSummary": {
    "estimatedCapitalGainsTax": 금액,
    "estimatedIncomeTax": 금액,
    "totalTaxBurden": 총금액,
    "effectiveTaxRate": 12.5
  },
  "strategies": [
    {
      "title": "전략명",
      "description": "설명...",
      "potentialSaving": 절세금액,
      "priority": "HIGH",
      "actionItems": ["구체적 실행 항목1", "..."]
    }
  ],
  "sellTimeline": [
    {
      "ticker": "AAPL",
      "name": "애플",
      "suggestedAction": "HOLD_FOR_TAX",
      "reason": "장기보유 세율 적용까지 3개월 남음",
      "optimalTiming": "2026년 5월 이후"
    }
  ],
  "annualPlan": [
    {"quarter": "Q1 2026", "actions": ["ISA 계좌 개설", "..."]},
    {"quarter": "Q2 2026", "actions": ["..."]},
    {"quarter": "Q3 2026", "actions": ["..."]},
    {"quarter": "Q4 2026", "actions": ["연말 손실 확정 매도"]}
  ],
  "generatedAt": "${new Date().toISOString()}"
}

중요: 유효한 JSON만 반환. 금액은 숫자(KRW). 한국어 작성. 실제 세법 기반 정확한 계산.
`;

  try {
    const text = await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 30000, maxRetries: 1 });
    return parseGeminiJson<TaxReportResult>(text);
  } catch (error) {
    console.error('세금 리포트 생성 오류:', error);
    throw new Error('세금 최적화 리포트 생성에 실패했습니다');
  }
};

// ============================================================================
// [마켓플레이스] AI 버핏과 티타임 1:1 채팅 — 포트폴리오 컨텍스트 포함
// ============================================================================

export const generateAICFOResponse = async (
  input: CFOChatInput,
  conversationHistory: { role: string; content: string }[]
): Promise<string> => {
  const historyStr = conversationHistory
    .slice(-10) // 최근 10개 메시지만
    .map(m => `${m.role === 'user' ? '사용자' : 'AI 버핏'}: ${m.content}`)
    .join('\n');

  const portfolioContext = input.portfolioContext
    ? `
[사용자 포트폴리오 컨텍스트]
- 총 자산: ₩${input.portfolioContext.totalAssets.toLocaleString()}
- 투자 등급: ${input.portfolioContext.tier}
- 주요 보유: ${input.portfolioContext.topHoldings.map(h => `${h.name}(${h.ticker}) ${h.allocation}%`).join(', ')}
`
    : '';

  const prompt = `
당신은 AI 투자 어드바이저입니다. 사용자의 재무 상담에 친절하고 전문적으로 응답하세요.

${portfolioContext}

[대화 히스토리]
${historyStr || '(첫 대화)'}

[사용자 질문]
${input.message}

[응답 규칙]
1. 한국어로 친절하게 답변
2. 사용자의 포트폴리오 상황을 고려한 맞춤 조언
3. 구체적 수치와 근거 제시
4. 법적 면책: "투자 권유가 아닌 정보 제공 목적"
5. 너무 길지 않게, 핵심 위주로 (300자 내외)
6. 마크다운 없이 순수 텍스트로 응답
`;

  try {
    return await callGeminiSafe(modelWithSearch, prompt, { timeoutMs: 30000, maxRetries: 1 });
  } catch (error) {
    console.error('AI 버핏 응답 오류:', error);
    throw new Error('AI 버핏 응답 생성에 실패했습니다');
  }
};