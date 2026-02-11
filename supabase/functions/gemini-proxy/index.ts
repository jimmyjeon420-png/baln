// @ts-nocheck
// ============================================================================
// Gemini API Proxy Edge Function
// 역할: 클라이언트 → Supabase Edge Function → Gemini API 프록시
// 이유: 클라이언트 측 네트워크 제한 우회 + API 키 보안 강화
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// ============================================================================
// 환경변수
// ============================================================================
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL = 'gemini-2.0-flash';

// ============================================================================
// 타입 정의
// ============================================================================

interface MorningBriefingRequest {
  type: 'morning-briefing';
  data: {
    portfolio: {
      ticker: string;
      name: string;
      currentValue: number;
      avgPrice: number;
      currentPrice: number;
      allocation?: string;
    }[];
    options?: {
      includeRealEstate?: boolean;
      realEstateContext?: string;
    };
  };
}

interface DeepDiveRequest {
  type: 'deep-dive';
  data: {
    ticker: string;
    currentPrice?: number;
    previousPrice?: number;
    percentChange?: number;
  };
}

interface CFOChatRequest {
  type: 'cfo-chat';
  data: {
    question: string;
    conversationHistory?: Array<{
      role: 'user' | 'assistant';
      text: string;
    }>;
  };
}

type GeminiProxyRequest = MorningBriefingRequest | DeepDiveRequest | CFOChatRequest;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Gemini API 직접 호출 (Google Search 그라운딩 활성화)
 */
async function callGeminiWithSearch(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error (${response.status}): ${errorText}`);
  }

  const json = await response.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini API returned empty response');
  }

  return text;
}

/**
 * Gemini 응답에서 순수 JSON만 추출
 */
function cleanJsonResponse(text: string): any {
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```javascript\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  return JSON.parse(cleaned);
}

// ============================================================================
// Morning Briefing 생성
// ============================================================================

async function generateMorningBriefing(reqData: MorningBriefingRequest['data']) {
  const { portfolio, options } = reqData;

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  // 부동산 자산(RE_) 필터링
  const filteredPortfolio = portfolio.filter(p => !p.ticker?.startsWith('RE_'));

  // profit_loss_rate 계산
  const totalValue = filteredPortfolio.reduce((s, a) => s + a.currentValue, 0);
  const portfolioWithProfitLoss = filteredPortfolio.map(p => {
    const profitLossRate = p.avgPrice > 0
      ? ((p.currentPrice - p.avgPrice) / p.avgPrice) * 100
      : 0;
    return {
      ticker: p.ticker,
      name: p.name,
      value: p.currentValue,
      allocation: p.allocation || (totalValue > 0 ? ((p.currentValue / totalValue) * 100).toFixed(1) : '0'),
      profit_loss_rate: profitLossRate.toFixed(2) + '%',
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

${(options?.includeRealEstate && options?.realEstateContext) ? `
4. **부동산 인사이트 (realEstateInsight)**
   - 컨텍스트: ${options.realEstateContext}
   - 분석: 해당 부동산의 시세 동향 및 투자 관점 분석
   - 권장사항: 보유/매도/추가매수 관점 조언
` : `
**[금지] realEstateInsight 필드를 절대 생성하지 마세요. 포트폴리오에 부동산 자산이 있더라도 무시하세요.**
`}

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
  "realEstateInsight": null,
  "cfoWeather": {
    "emoji": "⛅",
    "status": "구름 조금: 관망 필요",
    "message": "[오늘 시장 상황 반영] 구체적 조언"
  }
}
`;

  // Gemini API 호출
  const responseText = await callGeminiWithSearch(prompt);

  // JSON 정제 및 파싱
  const briefing = cleanJsonResponse(responseText);

  // 부동산 인사이트 방어 로직
  if (!options?.includeRealEstate || !options?.realEstateContext) {
    delete briefing.realEstateInsight;
  }

  return {
    ...briefing,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Deep Dive: 개별 종목 AI 분석
// ============================================================================

async function generateDeepDive(reqData: DeepDiveRequest['data']) {
  const { ticker, currentPrice, previousPrice, percentChange } = reqData;

  // 가격 정보가 있으면 포함, 없으면 Gemini가 Google Search로 찾도록
  const priceInfo = currentPrice
    ? `현재 가격: ${currentPrice.toLocaleString()}원/달러 (어제 대비 ${percentChange?.toFixed(2)}%)`
    : '최신 가격 정보를 Google Search로 찾아주세요.';

  const prompt = `당신은 전문 투자 분석가입니다. 다음 종목을 Google Search로 최신 정보를 찾아 분석하고, JSON 형식으로 응답하세요.

**종목: ${ticker}**
${priceInfo}

Google Search로 찾아야 할 정보:
1. 종목 정식 명칭 (한글/영문)
2. 현재 주가 (최신)
3. 시가총액
4. PER (주가수익비율)
5. PBR (주가순자산비율)
6. 최근 실적 및 뉴스
7. 업종 및 주요 사업

분석 후 다음 JSON 형식으로 응답:

\`\`\`json
{
  "name": "종목 정식 명칭",
  "ticker": "${ticker}",
  "currentPrice": 현재가 (숫자),
  "change": 전일 대비 등락률 (%, 숫자),
  "overview": "회사 개요 및 주요 사업 (1-2문장)",
  "marketCap": "시가총액 (예: 450조원, $2.8T)",
  "per": PER 수치 (숫자, 적자면 음수),
  "pbr": PBR 수치 (숫자),
  "recommendation": "BUY" 또는 "SELL" 또는 "HOLD",
  "reason": "추천 이유 (2-3문장, 최근 실적/뉴스 반영)"
}
\`\`\`

**중요:**
- 모든 답변은 한국어로 작성
- recommendation은 반드시 "BUY", "SELL", "HOLD" 중 하나
- 최신 뉴스와 실적을 반영한 현실적인 분석
- reason은 구체적이고 근거 있게 작성
`;

  // Gemini API 호출
  const responseText = await callGeminiWithSearch(prompt);

  // JSON 정제 및 파싱
  const analysis = cleanJsonResponse(responseText);

  return {
    ...analysis,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Warren Buffett Chat: 대화형 투자 조언
// ============================================================================

async function generateCFOChat(reqData: CFOChatRequest['data']) {
  const { question, conversationHistory = [] } = reqData;

  // 대화 기록을 프롬프트에 포함
  let conversationContext = '';
  if (conversationHistory.length > 0) {
    conversationContext = '\n\n**이전 대화:**\n';
    conversationHistory.forEach(msg => {
      conversationContext += `${msg.role === 'user' ? '사용자' : 'AI 워렌 버핏'}: ${msg.text}\n`;
    });
  }

  const prompt = `당신은 세 명의 투자 거장(워렌 버핏, 레이 달리오, 캐시 우드)입니다. 사용자의 질문에 각자의 관점에서 답변하고, 마지막에 워렌 버핏이 정리합니다.${conversationContext}

**현재 질문: ${question}**

**각 투자자의 핵심 철학:**

1️⃣ **워렌 버핏** (Berkshire Hathaway)
   - 가치투자: 내재가치 < 현재 가격인 기업 매수
   - 장기투자: 10년 이상 보유 가능한 기업만
   - 경쟁우위(Moat): 진입장벽이 높고 독점적 사업
   - 이해 가능성: 복잡한 비즈니스 모델 회피
   - 톤: 차분하고 보수적, 숫자와 근거 중심

2️⃣ **레이 달리오** (Bridgewater Associates)
   - 분산투자: "계란을 한 바구니에 담지 말라"의 극대화
   - 리스크 패리티: All Weather 포트폴리오 (주식, 채권, 금, 원자재)
   - 경제 사이클: 부채 사이클, 인플레이션/디플레이션 대비
   - 원칙(Principles): 투명성, 철저한 분석, 감정 배제
   - 톤: 체계적이고 분석적, 거시경제 중심

3️⃣ **캐시 우드** (ARK Invest)
   - 혁신 성장주: 파괴적 혁신(Disruptive Innovation)
   - 5년 후 미래: 테슬라, AI, 유전체학, 블록체인
   - 기하급수적 성장: 라이트의 법칙, 무어의 법칙
   - 밸류에이션 무시: 현재 PER보다 미래 TAM(시장 규모)
   - 톤: 열정적이고 미래지향적, 기술 트렌드 중심

**답변 형식 (Google Search로 최신 정보 찾아서 반영):**

\`\`\`json
{
  "warren": "워렌 버핏의 의견 (2-3문장, 가치투자 관점)",
  "dalio": "레이 달리오의 의견 (2-3문장, 리스크 관리 관점)",
  "wood": "캐시 우드의 의견 (2-3문장, 혁신 성장 관점)",
  "summary": "워렌 버핏의 최종 정리 (3-4문장, 세 관점 종합 + 실행 가능한 조언)"
}
\`\`\`

**중요:**
- 각자 다른 의견 OK! 의견 충돌도 현실적으로 표현
- 구체적 숫자와 근거 필수 (예: "PER 12배", "3회 분할 매수", "포트폴리오 30% 비중")
- 최신 뉴스/실적 반영 (Google Search 활용)
- 한국어 자연스럽게, 존댓말 사용
`;

  // Gemini API 호출
  const responseText = await callGeminiWithSearch(prompt);

  // JSON 정제 및 파싱
  const chatResponse = cleanJsonResponse(responseText);

  return {
    ...chatResponse,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req: Request) => {
  // CORS 헤더
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // POST만 허용
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 요청 body 파싱
    const body = await req.json() as GeminiProxyRequest;

    console.log(`[Gemini Proxy] 요청 타입: ${body.type}`);

    let result: any;

    // 타입별 분기 처리
    switch (body.type) {
      case 'morning-briefing':
        result = await generateMorningBriefing(body.data);
        break;

      case 'deep-dive':
        result = await generateDeepDive(body.data);
        break;

      case 'cfo-chat':
        result = await generateCFOChat(body.data);
        break;

      default:
        throw new Error(`Unknown request type: ${(body as any).type}`);
    }

    // 성공 응답
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Gemini Proxy] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
