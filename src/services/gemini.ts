import { GoogleGenerativeAI } from '@google/generative-ai';

// 환경변수에서 API 키와 모델명 가져오기
const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const MODEL_NAME = process.env.EXPO_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';

const genAI = new GoogleGenerativeAI(API_KEY);

// 환경변수로 모델 설정 (기본값: gemini-2.0-flash)
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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

export const analyzeAssetImage = async (base64: string) => {
  try {
    console.log(`Gemini: 이미지 분석 요청 중... (${MODEL_NAME})`);

    // [핵심] 한국 금융앱(토스, 업비트) 특화 프롬프트
    const prompt = `
당신은 한국 금융앱 스크린샷 전문 분석기입니다.
이 이미지는 한국 금융앱(토스 증권, 업비트, 키움증권, 삼성증권 등)의 자산 현황 스크린샷입니다.

**[분석 대상 한국어 키워드]**
- 자산명/종목명: 삼성전자, 카카오, 비트코인, 이더리움 등
- 평가금액/현재가: 숫자 뒤에 "원" 또는 ","가 붙음
- 보유수량: "주", "개", "코인" 등의 단위
- 수익률: "+15.3%" 또는 "-2.1%" 형태
- 평균단가/매입가: 구매 시 평균 가격

**[티커 매핑 규칙]**
한국 주식:
- 삼성전자 → 005930.KS
- 카카오 → 035720.KS
- 네이버 → 035420.KS
- SK하이닉스 → 000660.KS
- LG에너지솔루션 → 373220.KS
- 현대차 → 005380.KS
- 셀트리온 → 068270.KS
- POSCO홀딩스 → 005490.KS
- 기타 한국주식 → 종목코드.KS (6자리 숫자)

암호화폐 (업비트/빗썸):
- 비트코인/Bitcoin/BTC → BTC
- 이더리움/Ethereum/ETH → ETH
- 리플/XRP → XRP
- 도지코인/DOGE → DOGE
- 솔라나/SOL → SOL
- 에이다/ADA → ADA

미국 주식:
- 애플/Apple → AAPL
- 테슬라/Tesla → TSLA
- 엔비디아/NVIDIA → NVDA
- 마이크로소프트/Microsoft → MSFT
- 아마존/Amazon → AMZN
- 구글/알파벳/Alphabet → GOOGL

**[숫자 정제 규칙 - 매우 중요!]**
1. 모든 쉼표(,) 제거: "1,234,567" → 1234567
2. "원" 제거: "50,000원" → 50000
3. "주" 제거: "10주" → 10
4. "%" 제거 (수익률 무시)
5. 소수점은 유지: "0.5" → 0.5
6. 가격이 보이지 않으면 0으로 설정

**[필수 출력 형식]**
반드시 아래 JSON 배열 형태로만 응답하세요. 마크다운 코드블록(\`\`\`) 사용 금지!

[
  {"ticker": "005930.KS", "name": "삼성전자", "amount": 10, "price": 72000},
  {"ticker": "BTC", "name": "비트코인", "amount": 0.5, "price": 85000000}
]

**[주의사항]**
- ticker가 불확실하면 자산명 그대로 사용 (예: "UNKNOWN_삼성SDI")
- amount(수량)이 불확실하면 1로 설정
- price(가격)가 불확실하면 0으로 설정
- 빈 배열 []은 허용되지 않음 - 최소 1개 이상 추출 시도
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
    console.log("Gemini 원본 응답:", responseText); // 전체 응답 로그

    // JSON 정제 (Markdown 코드블록 제거 + 앞뒤 공백 제거)
    let cleanText = responseText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // JSON 배열 시작/끝 찾기 (혹시 앞뒤에 불필요한 텍스트가 있을 경우)
    const jsonStart = cleanText.indexOf('[');
    const jsonEnd = cleanText.lastIndexOf(']');

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
    }

    console.log("정제된 JSON:", cleanText);

    const parsedData = JSON.parse(cleanText);

    // 데이터 후처리: null/undefined 값 정제
    if (Array.isArray(parsedData)) {
      return parsedData.map((item: any) => ({
        ticker: item.ticker || `UNKNOWN_${item.name || 'ASSET'}`,
        name: item.name || '알 수 없는 자산',
        amount: typeof item.amount === 'number' ? item.amount : parseFloat(item.amount) || 1,
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price).replace(/[^0-9.]/g, '')) || 0,
        needsReview: !item.ticker || !item.price, // 사용자 확인 필요 플래그
      }));
    }

    return parsedData;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // 더 상세한 에러 메시지
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    return { error: `이미지 분석 실패: ${errorMessage}` };
  }
};