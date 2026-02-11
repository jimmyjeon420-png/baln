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
    name: string;
    // 추가 필드는 나중에 확장
  };
}

type GeminiProxyRequest = MorningBriefingRequest | DeepDiveRequest;

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
        // TODO: Deep Dive 구현
        throw new Error('Deep Dive not implemented yet');

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
