import { GoogleGenerativeAI } from '@google/generative-ai';

// 환경변수에서 API 키와 모델명 가져오기
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL_NAME = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';

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
    console.log('[가격 보정] 총 자산 정보 없음 - 보정 스킵');
    return assets;
  }

  console.log(`[가격 보정] 화면 총 자산: ${reportedTotalValue.toLocaleString()}원`);

  return assets.map(asset => {
    const calculatedValue = asset.amount * asset.price;

    // 핵심 로직: (수량 * 추출가격) > 총 자산이면, 추출가격은 사실 "총 평가금액"
    if (calculatedValue > reportedTotalValue) {
      const correctedPrice = asset.price / asset.amount;
      console.log(
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
        console.log(
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

  console.log(
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

// 환경변수로 모델 설정 (기본값: gemini-2.0-flash)
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// ============================================================================
// [실시간 그라운딩] Google Search 도구 설정
// ============================================================================
// 실시간 뉴스/시장 데이터를 위한 Google Search 도구가 포함된 모델
// 참고: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/gemini
const modelWithSearch = genAI.getGenerativeModel({
  model: MODEL_NAME,
  tools: [
    {
      // @ts-ignore - Gemini 2.0 Google Search Tool (google_search_retrieval은 deprecated)
      google_search: {},
    },
  ],
});

export const getPortfolioAdvice = async (prompt: any) => {
  try {
    const msg = typeof prompt === 'string' ? prompt : JSON.stringify(prompt);
    const result = await model.generateContent(msg);
    return result.response.text();
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
    console.log(`Gemini: 이미지 분석 요청 중... (${MODEL_NAME})`);

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
    console.log("Gemini 원본 응답:", responseText);

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
    }

    console.log("정제된 JSON:", cleanText);

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
        console.log(`[단가 계산] ${name}: ${item.totalValue} / ${amount} = ${price}`);
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

export interface RiskAnalysisResult {
  panicShieldIndex: number; // 0-100 (높을수록 안전)
  panicShieldLevel: 'SAFE' | 'CAUTION' | 'DANGER';
  stopLossGuidelines: {
    ticker: string;
    name: string;
    suggestedStopLoss: number; // 손절가 (%)
    currentLoss: number; // 현재 손실률
    action: 'HOLD' | 'WATCH' | 'CONSIDER_SELL';
  }[];
  fomoAlerts: {
    ticker: string;
    name: string;
    overvaluationScore: number; // 0-100 (높을수록 고평가)
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    reason: string;
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
// CFO Morning Briefing - 아침 처방전
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
 * CFO Morning Briefing 생성
 * - 실시간 Google Search 그라운딩으로 최신 뉴스 반영
 * - 거시경제 요약
 * - 포트폴리오별 액션 (수익률 기반)
 * - 부동산 인사이트
 * - CFO 날씨
 */
export const generateMorningBriefing = async (
  portfolio: PortfolioAsset[],
  options?: {
    includeRealEstate?: boolean;
    realEstateContext?: string;
  }
): Promise<MorningBriefingResult> => {
  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

    // [핵심] profit_loss_rate 계산하여 프롬프트에 주입
    const portfolioWithProfitLoss = portfolio.map(p => {
      const profitLossRate = p.avgPrice > 0
        ? ((p.currentPrice - p.avgPrice) / p.avgPrice) * 100
        : 0;
      const totalValue = portfolio.reduce((s, a) => s + a.currentValue, 0);
      return {
        ticker: p.ticker,
        name: p.name,
        value: p.currentValue,
        allocation: p.allocation || (totalValue > 0 ? ((p.currentValue / totalValue) * 100).toFixed(1) : '0'),
        profit_loss_rate: profitLossRate.toFixed(2) + '%', // 손익률 추가
        avgPrice: p.avgPrice,
        currentPrice: p.currentPrice,
      };
    });

    const prompt = `
당신은 한국의 고액자산가 전담 CFO입니다. 오늘(${dateStr}) 아침 브리핑을 작성해주세요.

**[중요] 실시간 정보 활용 지침:**
- Google Search를 통해 *지난 24시간* 이내의 최신 뉴스를 반드시 검색하세요
- 검색 키워드 예시: "오늘 나스닥 종가", "Fed 금리 전망 ${today.getMonth() + 1}월", "Kevin Warsh 연준", "S&P 500 overnight"
- 각 종목(${portfolioWithProfitLoss.map(p => p.ticker).join(', ')})의 최신 뉴스도 검색하세요
- 검색 결과를 바탕으로 구체적인 수치와 이벤트를 인용하세요

**포트폴리오 (수익률 포함):**
${JSON.stringify(portfolioWithProfitLoss, null, 2)}

**수익률 기반 맞춤 조언 규칙:**
각 종목의 profit_loss_rate를 확인하고:
- +30% 이상 수익: 일부 익절 검토 권고 (FOMO 경고)
- +10~30% 수익: 목표가 설정 권고
- -10% 이상 손실: 손절선 재검토 권고 (Panic Shield)
- -20% 이상 손실: 적극적 리밸런싱 검토

**브리핑 작성 규칙:**

1. **거시경제 요약 (macroSummary)**
   - *오늘 실제로 발생한* 글로벌 이슈 3가지 (Google Search 결과 기반)
   - 미국 금리 인하/동결/인상 확률 예측 (CME FedWatch 참조)
   - 시장 심리 (BULLISH/NEUTRAL/BEARISH)
   - 구체적 수치 포함 (예: "나스닥 전일 종가 -1.2%", "10년물 국채 4.25%")

2. **포트폴리오 액션 (portfolioActions)**
   - 각 보유 종목별 오늘의 권장 행동
   - action: BUY(추가 매수), HOLD(보유), SELL(매도 검토), WATCH(관찰)
   - priority: HIGH(즉시 행동), MEDIUM(이번 주), LOW(참고)
   - **수익률 반영**: profit_loss_rate가 높은 종목은 익절, 낮은 종목은 손절 관점
   - 최신 뉴스 기반 근거 (예: "어젯밤 NVDA 실적 발표 - 예상치 상회")

3. **CFO 날씨 (cfoWeather)**
   - emoji: 포트폴리오 상태를 나타내는 이모지 (☀️/⛅/🌧️/⛈️/❄️)
   - status: 한 줄 상태 (예: "맑음: 안정적")
   - message: 오늘의 한 마디 조언 (실시간 뉴스 반영)

${options?.includeRealEstate ? `
4. **부동산 인사이트 (realEstateInsight)**
   - 컨텍스트: ${options.realEstateContext || '야탑동 매화마을1차 재건축/리모델링'}
   - 분석: 재건축 vs 리모델링 경제성 비교
   - 권장사항: 인테리어(6천만) vs 분담금(1.5억) 의사결정 조언
` : ''}

**출력 형식 (JSON만, 마크다운 금지):**
{
  "macroSummary": {
    "title": "오늘의 시장 핵심",
    "highlights": ["[실시간] 구체적 이슈1", "[실시간] 구체적 이슈2", "[실시간] 구체적 이슈3"],
    "interestRateProbability": "동결 65% / 인하 30% / 인상 5%",
    "marketSentiment": "NEUTRAL"
  },
  "portfolioActions": [
    {"ticker": "NVDA", "name": "엔비디아", "action": "HOLD", "reason": "[실시간 뉴스 기반] 구체적 근거", "priority": "LOW"}
  ],
  "realEstateInsight": {
    "title": "야탑동 매화마을1차 분석",
    "analysis": "재건축 예상 분담금 1.5억 vs 리모델링 인테리어 6천만",
    "recommendation": "현재 시점에서는..."
  },
  "cfoWeather": {
    "emoji": "⛅",
    "status": "구름 조금: 관망 필요",
    "message": "[오늘 시장 상황 반영] 구체적 조언"
  }
}
`;

    // [핵심] Google Search 그라운딩이 활성화된 모델 사용
    const result = await modelWithSearch.generateContent(prompt);
    const responseText = result.response.text();

    // JSON 정제
    let cleanText = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
    }

    const briefing = JSON.parse(cleanText);

    return {
      ...briefing,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    console.error("Morning Briefing Error:", error);

    // 에러 시 기본값 반환
    return {
      macroSummary: {
        title: "시장 분석 중...",
        highlights: ["데이터를 불러오는 중입니다", "잠시 후 다시 시도해주세요"],
        interestRateProbability: "분석 중",
        marketSentiment: 'NEUTRAL',
      },
      portfolioActions: portfolio.map(p => ({
        ticker: p.ticker,
        name: p.name,
        action: 'HOLD' as const,
        reason: "분석 데이터 로딩 중",
        priority: 'LOW' as const,
      })),
      cfoWeather: {
        emoji: "🔄",
        status: "분석 중",
        message: "네트워크 연결을 확인해주세요",
      },
      generatedAt: new Date().toISOString(),
    };
  }
};

// 포트폴리오 리스크 분석 (Panic Shield & FOMO Vaccine)
// [실시간 그라운딩] 최신 시장 데이터 기반 분석
export const analyzePortfolioRisk = async (
  portfolio: PortfolioAsset[],
  userProfile?: UserProfile
): Promise<RiskAnalysisResult> => {
  try {
    // 기본 사용자 프로필 (38세 가장 페르소나)
    const profile: UserProfile = userProfile || {
      age: 38,
      riskTolerance: 'moderate',
      investmentGoal: '자녀 교육비 및 노후 대비',
      dependents: 2,
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
- 나이: ${profile.age}세
- 투자 성향: ${profile.riskTolerance}
- 투자 목표: ${profile.investmentGoal}
- 부양가족: ${profile.dependents}명

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
     - CONSIDER_SELL: 손절선 초과
   - *실시간 뉴스*가 손절 판단에 영향을 미치면 reason에 명시

3. **FOMO Vaccine (고평가 경고)**
   - profit_loss_rate가 높은 자산 우선 분석
   - *최신 뉴스 기반* 고평가 여부 판단 (예: "어젯밤 실적 미달 발표")
   - overvaluationScore: 0-100
   - severity: LOW (0-30), MEDIUM (31-60), HIGH (61-100)
   - 구체적 사유 (예: "현재 +45% 수익 중, 최근 3개월 200% 상승")

4. **맞춤 조언**
   - ${profile.age}세 ${profile.dependents > 0 ? '가장' : '투자자'}의 관점에서 3가지 핵심 조언
   - 가족 부양 책임을 고려한 실용적 조언
   - *오늘의 시장 상황*을 반영한 타이밍 조언

**출력 형식 (JSON만, 마크다운 코드블록 금지):**
{
  "panicShieldIndex": number,
  "panicShieldLevel": "SAFE" | "CAUTION" | "DANGER",
  "stopLossGuidelines": [...],
  "fomoAlerts": [...],
  "personalizedAdvice": ["[실시간 반영] 조언1", "조언2", "조언3"],
  "diversificationScore": number
}
`;

    // [핵심] Google Search 그라운딩이 활성화된 모델 사용
    const result = await modelWithSearch.generateContent(prompt);
    const responseText = result.response.text();

    // JSON 정제
    let cleanText = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
    }

    const analysisResult = JSON.parse(cleanText);

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
      stopLossGuidelines: analysisResult.stopLossGuidelines || [],
      fomoAlerts: analysisResult.fomoAlerts || [],
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

    // 에러 시 기본값 반환
    const totalValue = portfolio.reduce((sum, asset) => sum + asset.currentValue, 0);
    const totalCostBasis = portfolio.reduce(
      (sum, asset) => sum + (asset.avgPrice * asset.quantity),
      0
    );

    return {
      panicShieldIndex: 50,
      panicShieldLevel: 'CAUTION',
      stopLossGuidelines: [],
      fomoAlerts: [],
      personalizedAdvice: [
        '포트폴리오 분석 중 오류가 발생했습니다.',
        '잠시 후 다시 시도해주세요.',
        '네트워크 연결을 확인해주세요.',
      ],
      portfolioSnapshot: {
        totalValue,
        totalGainLoss: totalValue - totalCostBasis,
        gainLossPercent: totalCostBasis > 0 ? ((totalValue - totalCostBasis) / totalCostBasis) * 100 : 0,
        diversificationScore: 50,
      },
    };
  }
};