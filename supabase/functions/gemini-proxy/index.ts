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
const GEMINI_MODEL = 'gemini-3-flash-preview';

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
      guruStyle?: string;
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

interface InvestmentReportRequest {
  type: 'investment-report';
  data: {
    ticker: string;
    currentPrice?: number;
  };
}

interface ParseScreenshotRequest {
  type: 'parse-screenshot';
  data: {
    imageBase64: string;
    mimeType: string;  // 'image/jpeg' | 'image/png'
  };
}

interface ClassifyTickerRequest {
  type: 'classify-ticker';
  data: {
    ticker: string;
    name?: string;  // 이미 알고 있는 이름 (힌트)
  };
}

interface WhatIfRequest {
  type: 'what-if';
  data: {
    scenario: string;
    description: string;
    magnitude?: number;
    portfolio: Array<{
      ticker: string;
      name: string;
      currentValue: number;
      allocation: number;
    }>;
  };
}

interface TaxReportRequest {
  type: 'tax-report';
  data: {
    residency: 'KR' | 'US';
    annualIncome?: number;
    portfolio: Array<{
      ticker: string;
      name: string;
      currentValue: number;
      costBasis: number;
      purchaseDate: string;
      quantity: number;
    }>;
  };
}

interface InvestmentReport {
  executiveSummary: {
    recommendation: 'BUY' | 'SELL' | 'HOLD';
    rating: number; // 1-5
    targetPrice: number;
    expectedReturn: number;
    keyPoints: string[];
  };
  companyOverview: {
    name: string;
    founded: number;
    ceo: string;
    industry: string;
    marketCap: string;
    employees: number;
    headquarters: string;
  };
  businessModel: {
    revenueStreams: string;
    competitiveAdvantage: string;
    marketSize: string;
    growthStrategy: string;
  };
  financialAnalysis: {
    revenue: Array<{ year: number; value: number }>;
    operatingProfit: Array<{ year: number; value: number }>;
    netIncome: Array<{ year: number; value: number }>;
    roe: number;
    roic: number;
    debtRatio: number;
    cashFlow: string;
  };
  valuation: {
    currentPrice: number;
    fairValue: number;
    targetPrice: number;
    per: number;
    pbr: number;
    psr: number;
    industryAvgPer: number;
  };
  risks: {
    market: string[];
    competition: string[];
    regulation: string[];
    management: string[];
  };
  governance: {
    ceoRating: number;
    shareholderFriendly: string;
    dividendYield: number;
    esgRating: string;
  };
  debate: {
    warren: string;
    dalio: string;
    wood: string;
    kostolany?: string;
    summary: string;
  };
}

type GeminiProxyRequest =
  | MorningBriefingRequest
  | DeepDiveRequest
  | CFOChatRequest
  | InvestmentReportRequest
  | ParseScreenshotRequest
  | ClassifyTickerRequest
  | WhatIfRequest
  | TaxReportRequest;

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Gemini API 직접 호출 (내부 지식 기반 분석)
 * [수정 2026-02-16] gemini-3-flash-preview + 타임아웃 (30초) + 재시도 로직 (1회)
 */
async function callGeminiWithSearch(prompt: string, timeoutMs: number = 30000, maxRetries: number = 1): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    // google_search 비활성화 — Gemini 3-flash-preview에서 불안정 (타임아웃 발생)
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // AbortController로 타임아웃 구현
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        const statusCode = response.status;

        // 429/503은 재시도 가능
        if (attempt < maxRetries && (statusCode === 429 || statusCode === 503)) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[Gemini Proxy] 재시도 ${attempt + 1}/${maxRetries} (HTTP ${statusCode}, ${delay}ms 후)`);
          clearTimeout(timeoutId);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        throw new Error(`Gemini API Error (${statusCode}): ${errorText.substring(0, 200)}`);
      }

      const json = await response.json();

      // Gemini 응답 구조 방어적 파싱 (candidates 배열이 비어있을 수 있음)
      const candidates = json.candidates;
      if (!candidates || candidates.length === 0) {
        const blockReason = json.promptFeedback?.blockReason;
        if (blockReason) {
          throw new Error(`Gemini API 콘텐츠 차단: ${blockReason}`);
        }
        throw new Error('Gemini API returned no candidates');
      }

      const text = candidates[0]?.content?.parts?.[0]?.text;

      if (!text) {
        const finishReason = candidates[0]?.finishReason;
        throw new Error(`Gemini API returned empty response (finishReason: ${finishReason || 'unknown'})`);
      }

      return text;
    } catch (err: any) {
      clearTimeout(timeoutId);

      // 타임아웃/네트워크 에러는 재시도 가능
      if (attempt < maxRetries && (
        err.name === 'AbortError' ||
        err.message?.includes('RESOURCE_EXHAUSTED')
      )) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`[Gemini Proxy] 재시도 ${attempt + 1}/${maxRetries} (${err.name}, ${delay}ms 후)`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      // AbortController 타임아웃 에러를 사용자 친화적 메시지로 변환
      if (err.name === 'AbortError') {
        throw new Error(`Gemini API 타임아웃: ${timeoutMs / 1000}초 내에 응답하지 않았습니다.`);
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('Gemini API 호출 실패. 잠시 후 다시 시도해주세요.');
}

/**
 * Gemini 응답에서 순수 JSON만 추출 (강화된 파서)
 */
function cleanJsonResponse(text: string): any {
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```javascript\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // 마크다운 기호 제거 (JSON 문자열 내부의 *, _, # 등)
  cleaned = cleaned
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
    .replace(/^#+\s*/gm, '');

  // JSON 객체 경계 찾기
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
    // 배열 형태 시도
    const arrStart = cleaned.indexOf('[');
    const arrEnd = cleaned.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
      cleaned = cleaned.substring(arrStart, arrEnd + 1);
    } else {
      console.error('[cleanJsonResponse] JSON 객체를 찾을 수 없음. 원본 앞 200자:', text.substring(0, 200));
      throw new Error(`Gemini 응답이 JSON 형식이 아닙니다: "${text.substring(0, 80)}..."`);
    }
  } else {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  // trailing comma 제거 (Gemini가 종종 ,} 또는 ,] 형태로 응답)
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  // ₩ 기호 처리 — JSON 숫자 필드 앞의 ₩ 제거
  cleaned = cleaned.replace(/:\s*₩\s*([0-9])/g, ': $1');

  return JSON.parse(cleaned);
}

// ============================================================================
// Classify Ticker: 동적 티커 스타일/섹터 분류
// ============================================================================

async function classifyTicker(reqData: ClassifyTickerRequest['data'], langInstruction = '한국어로 자연스럽게 작성한다.') {
  const { ticker, name } = reqData;

  const prompt = `당신은 금융 데이터 전문가입니다. 아래 주식/ETF 티커를 분류하고 JSON으로 응답하세요.

**티커: ${ticker}**${name ? `\n**알려진 이름: ${name}**` : ''}

분류 기준:
- sector: tech | finance | consumer | healthcare | energy | materials | telecom | industrial | etf_blend | crypto | commodity
- style: growth(성장주) | value(가치주/안정주) | dividend(배당주) | speculative(투기/테마주) | index(인덱스ETF/패시브)
- geo: us(미국) | kr(한국) | global(글로벌분산) | em(신흥국)

판단 기준:
- growth: 고성장 기술/혁신 기업, PER 높음, 배당 없음 (예: NVDA, TSLA, 카카오)
- value: 안정적 수익, 합리적 밸류에이션, Moat 보유 (예: AAPL, 삼성전자, BRK.B)
- dividend: 안정적 고배당, 성숙 산업 (예: KO, JNJ, 신한지주)
- speculative: 변동성 높음, 테마/이슈 의존, 수익성 불확실 (예: PLTR, 개별 바이오)
- index: ETF로 여러 종목 분산 (예: SPY, VOO, KODEX200)

JSON만 반환 (설명 없이):
{"ticker":"${ticker}","name":"한국어 회사명","sector":"...","style":"...","geo":"..."}`;

  const responseText = await callGeminiWithSearch(prompt, 15000, 1);
  return cleanJsonResponse(responseText);
}

// ============================================================================
// Morning Briefing 생성
// ============================================================================

async function generateMorningBriefing(reqData: MorningBriefingRequest['data'], langInstruction = '한국어로 자연스럽게 작성한다.') {
  const { portfolio, options } = reqData;
  const isKorean = langInstruction.includes('한국어');

  const today = new Date();
  const dateStr = isKorean
    ? `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
    : today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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

  const briefingPersona = isKorean
    ? `당신은 한국의 고액자산가 전담 투자 어드바이저입니다. 오늘(${dateStr}) 아침 브리핑을 작성해주세요.`
    : `You are a dedicated investment advisor for high-net-worth individuals. Please write today's (${dateStr}) morning briefing.`;

  const prompt = `
${briefingPersona}

**포트폴리오 (수익률 포함):**
${JSON.stringify(portfolioWithProfitLoss, null, 2)}

${options?.guruStyle ? `
**[투자 철학 우선순위]** 이 사용자는 "${options.guruStyle}" 투자 철학을 선택했습니다.
${options.guruStyle === 'buffett' ? '- 버핏 철학: 가치주(value)와 배당주(dividend) 종목을 우선 BUY/HOLD 추천. 투기주(PLTR, COIN 등)는 신중하게 WATCH 이하로 추천. 높은 ROE, 넓은 해자(Moat) 강조.' : ''}
${options.guruStyle === 'cathie_wood' ? '- 캐시우드 철학: 파괴적 혁신 성장주(NVDA, TSLA, ARKK 등)를 우선 BUY 추천. 현금·채권은 최소화 지향. 5년 후 미래 기술 관점 분석.' : ''}
${options.guruStyle === 'dalio' ? '- 달리오 철학: 자산군 균형(All Weather) 유지. 주식·채권·금·원자재·코인 분산 강조. 한 자산군 집중 시 리밸런싱 BUY/SELL 추천.' : ''}
${options.guruStyle === 'kostolany' ? '- 코스톨라니 철학: 시장 사이클(달걀 모형) 기반. 극단적 비관론에서 매수(BUY), 대중이 흥분할 때 매도(SELL) 관점. 인내(HOLD)가 핵심.' : ''}
portfolioActions의 action과 reason을 위 철학에 맞게 우선순위화하세요.
` : ''}

**수익률 기반 맞춤 조언 규칙:**
각 종목의 profit_loss_rate를 확인하고:
- +30% 이상 수익: 일부 익절 검토 권고 (FOMO 경고)
- +10~30% 수익: 목표가 설정 권고
- -10% 이상 손실: 손절선 재검토 권고 (Panic Shield)
- -20% 이상 손실: 적극적 리밸런싱 검토

**브리핑 작성 규칙:**

1. **거시경제 요약 (macroSummary)**
   - 현재 글로벌 시장에 영향을 주는 주요 이슈 3가지
   - 미국 금리 인하/동결/인상 확률 예측
   - 시장 심리 (BULLISH/NEUTRAL/BEARISH)
   - 구체적 수치 포함 (예: "금리 동결 65%", "인플레이션 둔화 추세")

2. **포트폴리오 액션 (portfolioActions)**
   - 각 보유 종목별 오늘의 권장 행동
   - action: BUY(추가 매수), HOLD(보유), SELL(매도 검토), WATCH(관찰)
   - priority: HIGH(즉시 행동), MEDIUM(이번 주), LOW(참고)
   - **수익률 반영**: profit_loss_rate가 높은 종목은 익절, 낮은 종목은 손절 관점
   - 종목 펀더멘털 기반 근거

3. **투자 날씨 (cfoWeather)**
   - emoji: 포트폴리오 상태를 나타내는 이모지 (☀️/⛅/🌧️/⛈️/❄️)
   - status: 한 줄 상태 (예: "맑음: 안정적")
   - message: 오늘의 한 마디 조언

${(options?.includeRealEstate && options?.realEstateContext) ? `
4. **부동산 인사이트 (realEstateInsight)**
   - 컨텍스트: ${options.realEstateContext}
   - 분석: 해당 부동산의 시세 동향 및 투자 관점 분석
   - 권장사항: 보유/매도/추가매수 관점 조언
` : `
**[금지] realEstateInsight 필드를 절대 생성하지 마세요.**
`}

**출력 형식 (JSON만, 마크다운 금지):**
{
  "macroSummary": {
    "title": "오늘의 시장 핵심 (한 줄 제목)",
    "highlights": ["주요 이슈1", "주요 이슈2", "주요 이슈3"],
    "interestRateProbability": "동결 65% / 인하 30% / 인상 5%",
    "marketSentiment": "NEUTRAL"
  },
  "portfolioActions": [
    {"ticker": "NVDA", "name": "엔비디아", "action": "HOLD", "reason": "구체적 근거", "priority": "LOW"}
  ],
  "realEstateInsight": null,
  "cfoWeather": {
    "emoji": "⛅",
    "status": "구름 조금: 관망 필요",
    "message": "구체적 조언"
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

async function generateDeepDive(reqData: DeepDiveRequest['data'], langInstruction = '한국어로 자연스럽게 작성한다.') {
  const { ticker, currentPrice, previousPrice, percentChange } = reqData;

  // 가격 정보가 있으면 포함
  const priceInfo = currentPrice
    ? `현재 가격: ${currentPrice.toLocaleString()}원/달러 (어제 대비 ${percentChange?.toFixed(2)}%)`
    : '보유 중인 학습 데이터를 기반으로 최신 정보를 분석해주세요.';

  const prompt = `당신은 전문 투자 분석가입니다. 다음 종목을 분석하고, JSON 형식으로 응답하세요.

**종목: ${ticker}**
${priceInfo}

분석해야 할 정보:
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
- ${langInstruction}
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
// What-If: 시나리오 기반 포트폴리오 영향 분석
// ============================================================================

async function generateWhatIfAnalysis(reqData: WhatIfRequest['data'], langInstruction = '한국어로 자연스럽게 작성한다.') {
  const magnitude = Number.isFinite(reqData.magnitude as number) ? Number(reqData.magnitude) : -20;
  const portfolioStr = (reqData.portfolio || [])
    .map((asset) => `${asset.name}(${asset.ticker}) ₩${Number(asset.currentValue || 0).toLocaleString()} / ${asset.allocation}%`)
    .join('\n');

  const prompt = `당신은 포트폴리오 리스크 분석가입니다.
아래 시나리오에서 자산별 영향도를 계산해 JSON만 반환하세요.

[시나리오]
- 유형: ${reqData.scenario}
- 설명: ${reqData.description}
- 기준 변동폭: ${magnitude}%

[포트폴리오]
${portfolioStr}

규칙:
1) 모든 자산의 changePercent를 동일하게 만들지 말 것
2) projectedValue = currentValue * (1 + changePercent/100)
3) 합계 값(currentTotal/projectedTotal/changePercent/changeAmount)은 자산별 값과 일치해야 함
4) ${langInstruction} 숫자 필드는 숫자만

반드시 아래 JSON 구조만 반환:
{
  "scenario": "${reqData.description}",
  "summary": "요약",
  "totalImpact": {
    "currentTotal": 0,
    "projectedTotal": 0,
    "changePercent": 0,
    "changeAmount": 0
  },
  "assetImpacts": [
    {
      "ticker": "AAPL",
      "name": "애플",
      "currentValue": 0,
      "projectedValue": 0,
      "changePercent": 0,
      "impactLevel": "HIGH",
      "explanation": "근거"
    }
  ],
  "riskAssessment": {
    "overallRisk": "HIGH",
    "vulnerabilities": ["취약점"],
    "hedgingSuggestions": ["헤지 전략"]
  },
  "generatedAt": "${new Date().toISOString()}"
}`;

  const responseText = await callGeminiWithSearch(prompt, 30000, 1);
  return cleanJsonResponse(responseText);
}

// ============================================================================
// Tax Report: 세금 최적화 리포트
// ============================================================================

async function generateTaxReportAnalysis(reqData: TaxReportRequest['data'], langInstruction = '한국어로 자연스럽게 작성한다.') {
  const residency = reqData.residency === 'US' ? 'US' : 'KR';
  const portfolioStr = (reqData.portfolio || [])
    .map((asset) =>
      `${asset.name}(${asset.ticker}) 현재가치 ₩${Number(asset.currentValue || 0).toLocaleString()} / ` +
      `취득가 ₩${Number(asset.costBasis || 0).toLocaleString()} / 수량 ${Number(asset.quantity || 0)} / 취득일 ${asset.purchaseDate}`
    )
    .join('\n');

  const prompt = `당신은 세무 전문가(CPA)입니다.
아래 포트폴리오의 연간 세금 추정과 절세 전략을 JSON으로 반환하세요.

[거주지] ${residency}
${Number.isFinite(reqData.annualIncome as number) ? `[연소득] ₩${Number(reqData.annualIncome).toLocaleString()}` : '[연소득] 미입력'}

[포트폴리오]
${portfolioStr}

반드시 아래 JSON 구조만 반환:
{
  "residency": "${residency}",
  "taxSummary": {
    "estimatedCapitalGainsTax": 0,
    "estimatedIncomeTax": 0,
    "totalTaxBurden": 0,
    "effectiveTaxRate": 0
  },
  "strategies": [
    {
      "title": "전략명",
      "description": "설명",
      "potentialSaving": 0,
      "priority": "HIGH",
      "actionItems": ["실행 항목"]
    }
  ],
  "sellTimeline": [
    {
      "ticker": "AAPL",
      "name": "애플",
      "suggestedAction": "HOLD_FOR_TAX",
      "reason": "근거",
      "optimalTiming": "2026년 12월"
    }
  ],
  "annualPlan": [
    { "quarter": "Q1 ${new Date().getFullYear()}", "actions": ["실행"] },
    { "quarter": "Q2 ${new Date().getFullYear()}", "actions": ["실행"] },
    { "quarter": "Q3 ${new Date().getFullYear()}", "actions": ["실행"] },
    { "quarter": "Q4 ${new Date().getFullYear()}", "actions": ["실행"] }
  ],
  "generatedAt": "${new Date().toISOString()}"
}

주의:
- ${langInstruction}
- 숫자 필드는 숫자만
- JSON 외 텍스트 금지`;

  const responseText = await callGeminiWithSearch(prompt, 30000, 1);
  return cleanJsonResponse(responseText);
}

// ============================================================================
// Investment Report: 전문 투자심사보고서 생성
// ============================================================================

async function generateInvestmentReport(reqData: InvestmentReportRequest['data'], langInstruction = '한국어로 자연스럽게 작성한다.') {
  const { ticker, currentPrice } = reqData;

  const priceInfo = currentPrice
    ? `현재 가격: ${currentPrice.toLocaleString()}원/달러`
    : '보유 중인 학습 데이터를 기반으로 최신 정보를 분석해주세요.';

  const prompt = `당신은 블랙록(BlackRock) Aladdin 팀의 시니어 애널리스트입니다. 한국 증권사 리서치센터 스타일로 전문 투자심사보고서를 작성하세요.

**종목: ${ticker}**
${priceInfo}

**분석에 반드시 포함할 정보:**
1. 기업 공식 IR 자료 (최근 분기 실적, 재무제표)
2. 최신 뉴스 및 시장 동향
3. 증권사 리포트 (목표주가, 컨센서스)
4. 경쟁사 비교 (시가총액, 밸류에이션)
5. 업종 평균 PER/PBR
6. CEO/경영진 이력 및 평판
7. ESG 평가 (MSCI, Sustainalytics 등)

---

## 7개 섹션 필수 포함 (순서 엄수)

### 1️⃣ Executive Summary (투자 의견 요약)
\`\`\`json
"executiveSummary": {
  "recommendation": "BUY" or "SELL" or "HOLD",
  "rating": 1~5 (5=매우 긍정, 1=매우 부정),
  "targetPrice": 목표주가 (숫자, 증권사 컨센서스 반영),
  "expectedReturn": 기대수익률 (%, 숫자),
  "keyPoints": [
    "핵심 투자 포인트 1 (구체적 근거)",
    "핵심 투자 포인트 2 (구체적 근거)",
    "핵심 투자 포인트 3 (구체적 근거)"
  ]
}
\`\`\`

### 2️⃣ Company Overview (기업 개요)
\`\`\`json
"companyOverview": {
  "name": "정식 기업명 (한글/영문)",
  "founded": 설립연도 (숫자),
  "ceo": "CEO 이름",
  "industry": "업종 (예: 반도체, 전기차, AI 소프트웨어)",
  "marketCap": "시가총액 (예: ₩450조, $2.8T)",
  "employees": 직원 수 (숫자),
  "headquarters": "본사 위치"
}
\`\`\`

### 3️⃣ Business Model (사업 구조 분석)
\`\`\`json
"businessModel": {
  "revenueStreams": "주요 매출원 3가지 (비중 포함, 예: 반도체 65%, 디스플레이 25%, 기타 10%)",
  "competitiveAdvantage": "경쟁우위 (Moat) 분석 (2-3문장, 기술력/네트워크 효과/규모의 경제 등)",
  "marketSize": "TAM (Total Addressable Market) 규모 (예: AI 칩 시장 $500B, CAGR 25%)",
  "growthStrategy": "성장 전략 (M&A, 신규 사업, 지역 확장 등)"
}
\`\`\`

### 4️⃣ Financial Analysis (재무 분석)
\`\`\`json
"financialAnalysis": {
  "revenue": [
    {"year": 2022, "value": 매출액 (억원/백만달러)},
    {"year": 2023, "value": 매출액},
    {"year": 2024, "value": 매출액 (최신)}
  ],
  "operatingProfit": [
    {"year": 2022, "value": 영업이익},
    {"year": 2023, "value": 영업이익},
    {"year": 2024, "value": 영업이익}
  ],
  "netIncome": [
    {"year": 2022, "value": 순이익},
    {"year": 2023, "value": 순이익},
    {"year": 2024, "value": 순이익}
  ],
  "roe": 자기자본이익률 (%, 숫자),
  "roic": 투하자본이익률 (%, 숫자),
  "debtRatio": 부채비율 (%, 숫자),
  "cashFlow": "현금흐름 상태 (예: 영업CF 3년 연속 증가, 잉여현금 풍부)"
}
\`\`\`

### 5️⃣ Valuation (밸류에이션 분석)
\`\`\`json
"valuation": {
  "currentPrice": 현재가 (숫자),
  "fairValue": 적정주가 (DCF/PER 평균법 등, 숫자),
  "targetPrice": 12개월 목표주가 (숫자),
  "per": 현재 PER (숫자),
  "pbr": 현재 PBR (숫자),
  "psr": 현재 PSR (숫자),
  "industryAvgPer": 업종 평균 PER (숫자)
}
\`\`\`

**밸류에이션 판단 기준:**
- PER < 업종 평균 → 저평가
- PER > 업종 평균 1.5배 → 고평가
- PBR < 1 → 청산가치 이하 (위험 신호)
- ROE > 15% + PBR < 2 → 가치투자 후보

### 6️⃣ Risks (리스크 분석)
\`\`\`json
"risks": {
  "market": ["시장 리스크 1 (예: 반도체 업황 사이클)", "시장 리스크 2"],
  "competition": ["경쟁사 리스크 (예: TSMC 기술 격차 확대)", "신규 진입자"],
  "regulation": ["규제 리스크 (예: 미-중 무역 분쟁, EU AI 규제)"],
  "management": ["경영 리스크 (예: CEO 건강 이슈, 지배구조 문제)"]
}
\`\`\`

### 7️⃣ Governance & ESG (지배구조 & ESG)
\`\`\`json
"governance": {
  "ceoRating": CEO 평가 (1-5, 5=탁월한 리더십),
  "shareholderFriendly": "주주친화 정책 (배당, 자사주 매입, 소수주주 보호 등, 2-3문장)",
  "dividendYield": 배당수익률 (%, 숫자),
  "esgRating": "ESG 등급 (예: MSCI A등급)"
}
\`\`\`

---

## 💬 3인 투자 거장 라운드테이블 토론

🎭 **연기 지침**: 세 사람이 실제로 같은 테이블에 앉아 토론하는 것처럼 작성하세요.

**1️⃣ 워렌 버핏** — 90대 오마하의 느긋한 할아버지
- 관점: 가치투자 (ROE, FCF, Moat, 내재가치)
- 🗣️ 말투: 반말+존대 혼합 ("~일세", "~하시게", "~라네"), 느긋한 도입("허허, 자네..."), 일상 비유 필수(슈퍼마켓, 야구, 농사), 자기비하 유머, 찰리 멍거 언급
- ❌ 금지: "~합니다" 격식체, 교과서 설명

**2️⃣ 레이 달리오** — 냉철한 헤지펀드 기계
- 관점: 거시경제 사이클, 리스크 패리티, 부채 사이클
- 🗣️ 말투: 격식체("~입니다", "~하십시오"), 원칙/시스템 도입("원칙 제N조를 적용하면..."), 번호 매기기("첫째... 둘째..."), 역사 인용(1930년대, 2008년), 냉정한 경고, 영어 전문용어(risk parity, deleveraging)
- ❌ 금지: 비유, 유머, 감정적 표현

**3️⃣ 캐시 우드** — 열정 넘치는 혁신 전도사
- 관점: 파괴적 혁신, Wright's Law, 5년 후 미래, TAM
- 🗣️ 말투: 친근한 존대("~예요!", "~거든요!"), 흥분된 도입("와, 이건 정말 exciting해요!"), 영어 감탄사(incredible!, game-changer!), "우리 ARK에서는...", 미래 시제, 느낌표 많이!
- ❌ 금지: 비관론, 느긋한 태도, 과거 중심 분석

**4️⃣ 앙드레 코스톨라니** — 유럽의 냉소적 철학자 투기꾼
- 관점: 달걀 모형(6단계 사이클), 시장 심리 읽기, 대중의 반대편, 금리와 주식의 역관계, 인내의 미학
- 🗣️ 말투: 유럽 귀족 지식인("나의 경험으로 보건대...", "그렇죠, 하지만..."), 냉소적 관찰("대중은 항상 틀립니다"), 프랑스어/독일어 단어 자연스럽게("mon ami", "Ja, ja", "mais oui"), 달걀 모형 인용("지금은 제N국면"), 잔인한 역설("손실이 두려우면 투자하지 마십시오. 하지만 그러면 인플레이션이 훔쳐갑니다")
- ❌ 금지: 구체적 수치 집착, 흥분된 말투, 기술적 전문용어 남발

\`\`\`json
"debate": {
  "warren": "워렌 버핏 (3-4문장, 반말+존대 할아버지 말투, 비유 필수, '허허' 도입)",
  "dalio": "레이 달리오 (3-4문장, 격식체 기계 말투, 원칙 번호 + 역사 인용)",
  "wood": "캐시 우드 (3-4문장, 흥분 에너지 말투, 영어 섞기 + 미래 비전 + 느낌표!)",
  "kostolany": "앙드레 코스톨라니 (3-4문장, 유럽 냉소 귀족 말투, mon ami + 달걀모형 + 대중심리 반대)",
  "summary": "워렌 버핏 정리 (3-4문장, '달리오 친구 말도 일리가 있고, 캐시 아가씨 열정도 대단하고, 코스톨라니 노인장 말씀도 새겨들을 만하지만...' 식으로 종합)"
}
\`\`\`

**토론 규칙:**
- **말투가 섞이면 실패!** 버핏이 "~입니다"하거나 달리오가 비유를 쓰면 안 됨
- 서로 가볍게 반박/인정하면 더 생동감 있음 (예: "달리오 자네 말이 맞기도 하지만..." / "캐시 우드 씨의 낙관론은 통계적으로 위험합니다")
- 구체적 숫자와 근거 필수 (예: "ROE 18%", "PER 12배로 저평가")
- 최신 뉴스/실적 반영

---

## 🔥 출력 형식 (JSON만, 마크다운/설명 절대 금지)

\`\`\`json
{
  "executiveSummary": { ... },
  "companyOverview": { ... },
  "businessModel": { ... },
  "financialAnalysis": { ... },
  "valuation": { ... },
  "risks": { ... },
  "governance": { ... },
  "debate": { ... }
}
\`\`\`

**[CRITICAL] 주의사항:**
- 7개 섹션 모두 필수! 누락 시 에러
- 모든 숫자는 검증된 최신 데이터
- 추측 금지, 근거 없는 수치 금지
- JSON 형식 엄수 (주석, 마크다운 절대 금지)
- ${langInstruction}
`;

  // Gemini API 호출
  const responseText = await callGeminiWithSearch(prompt);

  // JSON 정제 및 파싱
  const report = cleanJsonResponse(responseText);

  return {
    ...report,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Screenshot Parser: 증권사 스크린샷 자동 파싱
// ============================================================================

async function parsePortfolioScreenshot(imageBase64: string, mimeType: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: mimeType,
            data: imageBase64,
          }
        },
        {
          text: `이 이미지는 증권사 또는 거래소 앱의 보유자산 스크린샷입니다.
각 자산의 정보를 추출하여 JSON으로 반환하세요.

필수 추출 정보:
- name: 종목명 (한글 또는 영문)
- ticker: 티커 (예: 005930, NVDA, BTC)
- quantity: 보유 수량 (숫자)
- totalCostKRW: 총 매수금액 또는 평균단가×수량 (원화, 숫자)
- currentValueKRW: 현재 평가금액 (원화, 숫자, 없으면 null)

반환 형식:
{"assets": [{"name":"삼성전자","ticker":"005930","quantity":100,"totalCostKRW":7200000,"currentValueKRW":7500000}]}

주의:
- 달러 금액이 있으면 현재 환율 약 1450으로 원화 변환
- 인식 불가한 자산은 제외
- JSON만 반환 (설명 없이)`
        }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Gemini Vision Error: ${resp.status}`);
    const json = await resp.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No response from Gemini Vision');
    return cleanJsonResponse(text);
  } finally {
    clearTimeout(timeout);
  }
}

// ============================================================================
// Warren Buffett Chat: 대화형 투자 조언
// ============================================================================

async function generateCFOChat(reqData: CFOChatRequest['data'], langInstruction = '한국어로 자연스럽게 작성한다.') {
  const { question, conversationHistory = [] } = reqData;

  // 대화 기록을 프롬프트에 포함
  let conversationContext = '';
  if (conversationHistory.length > 0) {
    conversationContext = '\n\n**이전 대화:**\n';
    conversationHistory.forEach(msg => {
      conversationContext += `${msg.role === 'user' ? '사용자' : 'AI 워렌 버핏'}: ${msg.text}\n`;
    });
  }

  const prompt = `당신은 네 명의 투자 거장을 완벽하게 연기하는 배우입니다. 사용자의 질문에 **네 사람이 실제로 대화하는 것처럼** 각자의 독특한 말투로 답변하세요.${conversationContext}

**현재 질문: ${question}**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 캐릭터 연기 지침 (이것이 가장 중요합니다!)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ **워렌 버핏** — 90대 오마하의 느긋한 할아버지

📌 핵심 성격: 시골 현인. 복잡한 것을 동네 슈퍼마켓에 비유해서 설명하는 사람.
📌 투자 철학: 가치투자, 장기투자, 경쟁우위(Moat), 내가 이해 못 하면 안 산다

🗣️ 말투 규칙 (반드시 지킬 것):
- 반말+존대 혼합: "~일세", "~하시게", "~한 거라네", "~아닌가 말이야"
- 첫 문장은 반드시 느긋한 도입: "허허, 자네..." / "음, 내가 어제 체리콜라를 마시다가 생각했는데..." / "자네, 우리 동네 이발사도 비슷한 말을 하더군..."
- 비유 필수 (최소 1개): 야구("3할 타자"), 농장("씨앗을 심고 기다리는 거지"), 가족사업("장모님 반찬가게"), 슈퍼마켓, 낚시
- 자기비하 유머: "나도 한때 IBM에서 돈 날렸다네, 허허" / "찰리가 살아있었으면 날 바보라고 했을 걸세"
- 어투 핵심: 느릿느릿, 여유롭게, 할아버지가 손자에게 이야기하듯
- 숫자는 항상 쉽게: "PER이 12배라는 건, 투자금 회수에 12년 걸린다는 뜻이지"

❌ 절대 금지: "~합니다", "~입니다" 같은 딱딱한 존댓말. 교과서 같은 설명.

✅ 예시:
"허허, 자네. 분할 매수라... 내가 우리 동네 슈퍼마켓에서 코카콜라를 사는 걸 생각해보게. 어제 1,200원이던 게 오늘 900원이면? 당연히 더 사지! 근데 내일 800원이 될 수도 있으니, 한 번에 다 사지 말고 나눠서 사는 거라네. 찰리가 살아있었으면 '워렌, 그건 상식이지 원칙이 아니야'라고 했겠지만, 허허."

---

2️⃣ **레이 달리오** — 냉철한 헤지펀드 기계

📌 핵심 성격: 감정 없는 분석 기계. 모든 것을 시스템과 원칙으로 환원하는 사람. 불편한 진실도 직설적으로.
📌 투자 철학: All Weather, 리스크 패리티, 부채 사이클, 분산투자

🗣️ 말투 규칙 (반드시 지킬 것):
- 격식체 존대: "~입니다", "~하십시오", "~해야 합니다"
- 첫 문장은 반드시 원칙/시스템 도입: "원칙 제47조를 적용하면..." / "이 문제를 시스템적으로 분석하면..." / "경제라는 기계(machine)의 관점에서 보면..."
- 번호 매기기 습관: "첫째, ... 둘째, ... 셋째, ..."
- 역사적 사례 인용 필수: "1937년에도 똑같은 패턴이..." / "2008년 리먼 사태 당시..."
- 수식 같은 표현: "고통 + 성찰 = 성장", "리스크 = 모르는 것의 크기"
- 냉정한 경고: "대부분의 투자자는 이 사실을 외면합니다" / "통계적으로 95%가 실패합니다"
- 영어 전문용어 자연스럽게 섞기: "risk parity", "deleveraging", "paradigm shift"

❌ 절대 금지: 비유, 유머, 감정적 표현. "좋습니다"나 "재밌네요" 같은 가벼운 반응.

✅ 예시:
"이 문제를 시스템적으로 분석하겠습니다. 첫째, 분할 매수는 timing risk를 분산하는 메커니즘입니다. 1973-74년 베어마켓에서 일시 투자자 대비 분할 투자자의 최대 손실폭이 34% 줄었습니다. 둘째, 핵심은 비중 배분입니다. 전체 자산의 20%를 주식에 투자한다면, 이를 4~5회로 나누십시오. 감정을 배제하고, 기계처럼 실행하는 것이 원칙입니다."

---

3️⃣ **캐시 우드** — 열정 넘치는 실리콘밸리 혁신 전도사

📌 핵심 성격: 미래 기술에 대한 광적인 확신. TED 강연자 에너지. 현재보다 5년 후를 보는 사람.
📌 투자 철학: 파괴적 혁신, Wright's Law, 기하급수적 성장, TAM

🗣️ 말투 규칙 (반드시 지킬 것):
- 친근한 존대: "~예요!", "~거든요!", "~잖아요!", "~할 거예요!"
- 첫 문장은 반드시 흥분된 도입: "오, 이 질문 정말 좋아요!" / "와, 이건 제가 가장 passionate한 주제예요!" / "여러분, 지금이 정말 exciting한 시점이에요!"
- 영어 감탄사 섞기: "incredible!", "absolutely!", "game-changer!", "exponential!"
- "우리(we)" 표현: "우리 ARK에서 분석한 바로는..." / "우리가 주목하는 건..."
- 미래 시제 필수: "5년 후에는...", "2030년이 되면...", "이 기술이 mature해지면..."
- 혁신 프레임워크 언급: "Wright's Law에 따르면", "S-curve 채택 곡선", "convergence"
- 반론에 대한 자신감: "시장이 틀렸어요. 단기적으로요." / "skeptic들이 항상 있었죠, 인터넷 때도요!"
- 느낌표 많이 사용!

❌ 절대 금지: 비관적 전망, 느긋한 태도, 과거 중심 분석.

✅ 예시:
"오, 분할 매수요? 특히 disruptive innovation 기업에 투자할 때 absolutely 필수 전략이에요! 왜냐면요, Tesla를 보세요 — 2019년에 우리 ARK가 매수할 때 모두가 crazy하다고 했거든요. 하지만 Wright's Law에 따르면 배터리 원가는 누적 생산량이 2배가 될 때마다 18% 하락해요. 지금 AI도 같은 곡선 위에 있어요! 5년에 걸쳐 분할 매수하면, 이 exponential growth의 수혜를 온전히 받을 수 있습니다!"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**답변 형식 (최신 정보 반영):**

\`\`\`json
{
  "warren": "워렌 버핏 (3-4문장, 위 예시처럼 할아버지 반말 + 비유 + 자기비하 유머)",
  "dalio": "레이 달리오 (3-4문장, 위 예시처럼 원칙 번호 + 역사 인용 + 냉정한 격식체)",
  "wood": "캐시 우드 (3-4문장, 위 예시처럼 흥분 + 영어 섞기 + 미래 비전 + 느낌표!)",
  "kostolany": "앙드레 코스톨라니 (3-4문장, 유럽 냉소 귀족 + mon ami + 달걀모형 + 대중심리 반대 + 인내의 미학)",
  "summary": "워렌 버핏의 정리 (3-4문장, 네 관점 종합하되 할아버지 톤 유지, '달리오 친구 말이 맞기도 하고, 캐시 아가씨 말도 일리가 있고, 코스톨라니 노인장 말씀도 새기면서...' 식으로)"
}
\`\`\`

**중요:**
- **말투가 섞이면 실패입니다!** 버핏이 "~입니다"라고 하거나 달리오가 비유를 쓰면 안 됩니다
- 각자 다른 의견 OK! 서로 가볍게 반박하면 더 좋음 (예: 달리오가 캐시에게 "과도한 낙관은 위험합니다")
- 구체적 숫자와 근거 필수 (예: "PER 12배", "3회 분할 매수", "포트폴리오 30% 비중")
- 최신 뉴스/실적 반영
- ${langInstruction}
`;

  // Gemini API 호출 (AI 버핏과 티타임 채팅은 30초 타임아웃)
  const responseText = await callGeminiWithSearch(prompt, 30000);

  // JSON 정제 및 파싱 (강화된 폴백 처리)
  let chatResponse: any;
  try {
    chatResponse = cleanJsonResponse(responseText);

    // 파싱 성공했지만 필수 필드가 비어있는 경우 보완
    if (!chatResponse.warren || chatResponse.warren.trim().length === 0) {
      throw new Error('warren 필드가 비어있음');
    }
    if (!chatResponse.dalio || chatResponse.dalio.trim().length === 0) {
      // dalio가 비어있으면 텍스트에서 추출 시도
      chatResponse.dalio = '이 문제를 시스템적으로 분석하면, 추가적인 맥락이 필요합니다. 감정을 배제하고 원칙에 따라 판단하십시오.';
    }
    if (!chatResponse.wood || chatResponse.wood.trim().length === 0) {
      chatResponse.wood = '이 주제에 대해 더 분석이 필요해요! 하지만 disruptive innovation 관점에서 보면 항상 기회가 있답니다!';
    }
    if (!chatResponse.kostolany || chatResponse.kostolany.trim().length === 0) {
      chatResponse.kostolany = 'Mon ami, 나의 경험으로 보건대 이 질문은 달걀 모형으로 설명됩니다. 대중이 두려워할 때 용감하고, 대중이 용감할 때 두려워하십시오. Ja, ja. 인내심만이 답입니다.';
    }
    if (!chatResponse.summary || chatResponse.summary.trim().length === 0) {
      chatResponse.summary = chatResponse.warren; // warren 응답으로 대체
    }
  } catch (parseError) {
    // Gemini가 JSON 대신 일반 텍스트를 반환한 경우 → 구조화된 폴백
    console.warn('[AI 버핏과 티타임] JSON 파싱 실패, 구조화된 폴백 응답 생성:', parseError);

    // 텍스트를 4등분하여 각 캐릭터에 배분 (빈칸 방지)
    const trimmedText = responseText.trim();
    const quarter = Math.ceil(trimmedText.length / 4);

    chatResponse = {
      warren: trimmedText.slice(0, quarter) || '허허, 잠시 생각을 정리하고 있다네. 곧 답변을 드리겠네.',
      dalio: trimmedText.slice(quarter, quarter * 2) || '시스템적으로 재분석이 필요합니다. 잠시 후 다시 시도하십시오.',
      wood: trimmedText.slice(quarter * 2, quarter * 3) || 'Hmm, 잠시 기술적인 이슈가 있어요! 곧 돌아올게요!',
      kostolany: trimmedText.slice(quarter * 3) || 'Mon ami, 잠시 생각을 정리하고 있습니다. 인내심을 가지십시오.',
      summary: trimmedText.length > 0
        ? trimmedText.slice(0, 500)
        : '응답 처리 중 문제가 발생했습니다. 다시 시도해주세요.',
      answer: trimmedText,
    };
  }

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

    // 언어 설정: 클라이언트에서 전달한 lang 값으로 프롬프트 언어 결정
    const lang = ((body as any).lang as string) || 'ko';
    const langInstruction = lang === 'ko' ? '한국어로 자연스럽게 작성한다.' : 'Write naturally in English.';

    // ========================================================================
    // 인증 확인: 로그인한 사용자만 Gemini API 호출 허용
    // Supabase 클라이언트가 자동으로 Authorization 헤더에 JWT를 포함하므로
    // JWT 존재 + 서명 검증으로 미인증 남용을 차단
    // ========================================================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: '인증이 필요합니다. 로그인 후 다시 시도해주세요.', errorType: 'auth' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // JWT 유효성 검증 (Supabase auth.getUser로 서명 + 만료 확인)
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ success: false, error: '세션이 만료되었습니다. 다시 로그인해주세요.', errorType: 'auth' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Gemini Proxy] 요청 타입: ${body.type}, 사용자: ${authUser.id}`);

    let result: any;

    // 타입별 분기 처리
    switch (body.type) {
      case 'morning-briefing':
        result = await generateMorningBriefing(body.data, langInstruction);
        break;

      case 'deep-dive':
        result = await generateDeepDive(body.data, langInstruction);
        break;

      case 'cfo-chat':
        result = await generateCFOChat(body.data, langInstruction);
        break;

      case 'investment-report':
        result = await generateInvestmentReport(body.data, langInstruction);
        break;

      case 'parse-screenshot':
        result = await parsePortfolioScreenshot(body.data.imageBase64, body.data.mimeType);
        break;

      case 'classify-ticker':
        result = await classifyTicker((body as ClassifyTickerRequest).data, langInstruction);
        break;

      case 'what-if':
        result = await generateWhatIfAnalysis((body as WhatIfRequest).data, langInstruction);
        break;

      case 'tax-report':
        result = await generateTaxReportAnalysis((body as TaxReportRequest).data, langInstruction);
        break;

      case 'health-check': {
        // [2026-02-14] 실제 Gemini API 호출 테스트 (단순 OK 반환 → 실제 검증으로 업그레이드)
        const checks: Record<string, any> = {
          timestamp: new Date().toISOString(),
          model: GEMINI_MODEL,
          apiKeySet: !!GEMINI_API_KEY,
          apiKeyLength: GEMINI_API_KEY?.length || 0,
        };

        // 실제 Gemini API 미니 호출 (최소 토큰으로 테스트)
        try {
          const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
          const testBody = {
            contents: [{ parts: [{ text: 'Reply with only the word OK' }] }],
            generationConfig: { maxOutputTokens: 5 },
          };
          const testController = new AbortController();
          const testTimeout = setTimeout(() => testController.abort(), 10000);
          const testResp = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testBody),
            signal: testController.signal,
          });
          clearTimeout(testTimeout);

          if (testResp.ok) {
            const testJson = await testResp.json();
            const testText = testJson?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            checks.geminiApi = 'OK';
            checks.geminiResponse = testText.substring(0, 50);
          } else {
            const errText = await testResp.text();
            checks.geminiApi = `ERROR ${testResp.status}`;
            checks.geminiError = errText.substring(0, 200);
          }
        } catch (testErr: any) {
          checks.geminiApi = testErr.name === 'AbortError' ? 'TIMEOUT (10s)' : `EXCEPTION: ${testErr.message?.substring(0, 100)}`;
        }

        checks.status = checks.geminiApi === 'OK' ? 'ok' : 'degraded';
        result = checks;
        break;
      }

      // ════════════════════════════════════════════════════════════════════
      // 범용 프롬프트 패스스루 (마을 대화, 뉴스 반응, 라운드테이블 등)
      // body: { prompt, systemPrompt, type, lang }
      // ════════════════════════════════════════════════════════════════════
      case 'village_conversation':
      case 'news_reaction':
      case 'roundtable':
      case 'guru_chat': {
        const genericPrompt = (body as any).prompt || '';
        const genericSystemPrompt = (body as any).systemPrompt || '';
        const fullPrompt = genericSystemPrompt
          ? `${genericSystemPrompt}\n\n${genericPrompt}`
          : genericPrompt;
        const responseText = await callGeminiWithSearch(fullPrompt, 30000, 1);
        // 클라이언트가 data.result로 접근하므로 { result: text } 형태로 반환
        result = { result: responseText };
        break;
      }

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

    // 에러 유형 분류 (클라이언트에서 활용)
    const errorMsg = error.message || 'Unknown error';
    let errorType = 'unknown';
    if (errorMsg.includes('타임아웃') || errorMsg.includes('timeout') || errorMsg.includes('AbortError')) {
      errorType = 'timeout';
    } else if (errorMsg.includes('Gemini API Error')) {
      errorType = 'gemini_api';
    } else if (errorMsg.includes('JSON') || errorMsg.includes('파싱')) {
      errorType = 'parse_error';
    } else if (errorMsg.includes('콘텐츠 차단') || errorMsg.includes('block')) {
      errorType = 'content_blocked';
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        errorType,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
