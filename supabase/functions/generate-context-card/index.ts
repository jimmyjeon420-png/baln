// @ts-nocheck
// ============================================================================
// 맥락 카드 생성 전용 Edge Function (경량 버전)
// daily-briefing의 Task G만 독립 실행
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL = 'gemini-3-flash-preview';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// Gemini 호출
// ============================================================================

async function callGemini(prompt: string, timeoutMs: number = 30000): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 4096,
    },
  };

  // ★ AbortController로 타임아웃 추가 — 무한 대기 방지
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
      throw new Error(`Gemini API 에러 (${response.status}): ${errorText}`);
    }

    const data = await response.json();

    // ★ 빈 응답 검증
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('Gemini API가 빈 응답을 반환했습니다');
    }

    const rawText = data.candidates[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) {
      throw new Error('Gemini API 응답에 텍스트가 없습니다');
    }

    // JSON 추출
    let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const objStart = cleaned.indexOf('{');
    const objEnd = cleaned.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) {
      cleaned = cleaned.substring(objStart, objEnd + 1);
    }
    JSON.parse(cleaned); // 검증
    return cleaned;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Gemini API ${timeoutMs / 1000}초 타임아웃`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log(`[맥락 카드 생성] 시작: ${today}`);

    // Step 1: Gemini로 5겹 맥락 분석
    const prompt = `당신은 baln(발른) 앱의 맥락 카드 AI입니다.
오늘(${today}) 글로벌 금융 시장의 핵심 맥락을 분석하여 한국 개인투자자가 쉽게 이해할 수 있도록 설명하세요.

[핵심 원칙]
- "안심을 판다, 불안을 팔지 않는다." — 하락장에서도 맥락으로 이해를 돕는다.
- "급락", "폭락", "공포" 같은 감정적 표현 대신 "조정", "하락", "변동성 확대"를 사용한다.
- 과거 사례를 들 때는 회복 경험을 반드시 포함한다.
- 쉬운 한국어로 작성한다.

[political_context 작성 원칙 — 버핏+달리오 합의]
- 현재 미국 정치 이벤트(관세, 연준 압박, 규제 변화 등)를 역사적 유사 사례와 함께 설명한다.
- 반드시 "역사적으로 이런 패턴이 있었고, 이후 어떻게 됐는지"를 포함한다.
- 마지막 문장은 반드시 "당신의 포트폴리오에 미치는 영향은 [제한적/단기적]입니다"로 끝낸다.
- 정치적 편향 없이 시장 영향만 분석한다. 공포를 조장하지 않는다.
- 오늘 특별한 정치 이벤트가 없으면 최근 주요 정치 동향 1가지를 선택한다.

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운, 코드블록 금지.]
{
  "headline": "시장 핵심 한 줄 (20자 이내)",
  "sentiment": "calm 또는 caution 또는 alert 중 하나",
  "historical_context": "과거 유사 상황과 이후 회복 과정 2~3문장 (안심 톤)",
  "macro_chain": ["원인 이벤트", "중간 영향", "최종 결과", "투자자 시사점"],
  "political_context": "현재 미국 정치 이벤트 + 역사적 유사 사례 + 포트폴리오 영향 (제한적) 2~3문장",
  "institutional_behavior": "기관 투자자 동향 1~2문장",
  "market_summary": "주요 지수 동향 1~2문장"
}

[예시]
{
  "headline": "트럼프 관세로 변동성 확대",
  "sentiment": "caution",
  "historical_context": "2018~2019년 미중 무역전쟁 당시에도 코스피가 단기 조정을 받았으나, 협상 타결 후 6개월 만에 전고점을 회복한 바 있습니다.",
  "macro_chain": ["트럼프 중국산 관세 25% 발표", "글로벌 공급망 불안 확산", "반도체·IT 섹터 하락", "코스피 외국인 순매도"],
  "political_context": "트럼프 대통령이 주요 교역국에 대한 상호관세를 발표했습니다. 1930년 스무트-홀리 관세법 이후 유사한 보호무역 기조가 등장했을 때 시장은 단기 조정을 거쳤지만 2년 내 회복했습니다. 당신의 분산된 포트폴리오에 미치는 영향은 단기적이고 제한적입니다.",
  "institutional_behavior": "외국인이 코스피에서 3일 연속 순매도를 기록했으나, 이는 패닉이 아닌 분기말 리밸런싱 영향으로 분석됩니다.",
  "market_summary": "S&P 500 -0.5%, 코스피 -1.2% 하락. 달러 강세로 원화 약세 압력 지속."
}

[중요] 위 예시는 구조 참고용입니다. 반드시 오늘(${today})의 실제 시장 및 정치 상황을 기반으로 작성하세요.
`;

    let card: Record<string, unknown>;
    try {
      const raw = await callGemini(prompt);
      card = JSON.parse(raw);
    } catch (parseErr) {
      console.error('[맥락 카드 생성] Gemini 응답 파싱 실패 — 기본값 사용:', parseErr);
      card = {
        headline: '시장 분석 업데이트 중',
        sentiment: 'calm',
        historical_context: '시장 데이터를 수집하고 있습니다. 잠시 후 다시 확인해주세요.',
        macro_chain: ['데이터 수집 중'],
        political_context: '정치 동향을 분석 중입니다. 잠시 후 다시 확인해주세요.',
        institutional_behavior: '기관 투자자 동향을 분석 중입니다.',
        market_summary: '시장 데이터를 불러오는 중입니다.',
      };
    }

    // 필수 필드 검증
    if (!card.headline || typeof card.headline !== 'string') card.headline = '오늘의 시장 분석';
    if (!['calm', 'caution', 'alert'].includes(card.sentiment as string)) card.sentiment = 'calm';
    if (!Array.isArray(card.macro_chain) || (card.macro_chain as unknown[]).length === 0) card.macro_chain = ['시장 데이터 수집 중'];
    if (!card.political_context || typeof card.political_context !== 'string') card.political_context = '정치 동향 분석 중입니다.';

    console.log('[맥락 카드 생성] Gemini 응답 성공:', card.headline);

    // Step 2: DB에 저장 (upsert — 같은 날짜면 덮어쓰기)
    const { data: savedCard, error: insertError } = await supabase
      .from('context_cards')
      .upsert({
        date: today,
        headline: card.headline || '오늘의 시장 분석',
        sentiment: card.sentiment || 'calm',
        historical_context: card.historical_context || '',
        macro_chain: card.macro_chain || [],
        political_context: card.political_context || '',
        institutional_behavior: card.institutional_behavior || '',
      }, { onConflict: 'date' })
      .select()
      .single();

    if (insertError) {
      console.error('[맥락 카드 생성] DB 저장 실패:', insertError);
      throw insertError;
    }

    console.log('[맥락 카드 생성] DB 저장 성공:', savedCard?.id);

    return new Response(
      JSON.stringify({
        success: true,
        card: {
          id: savedCard?.id,
          date: today,
          headline: card.headline,
          sentiment: card.sentiment,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[맥락 카드 생성] 에러:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
