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
const GEMINI_MODEL = 'gemini-2.5-flash';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// Gemini 호출
// ============================================================================

async function callGemini(prompt: string): Promise<string> {
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
    throw new Error(`Gemini API 에러 (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // JSON 추출
  let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    cleaned = cleaned.substring(objStart, objEnd + 1);
  }
  JSON.parse(cleaned); // 검증
  return cleaned;
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

    // Step 1: Gemini로 4겹 맥락 분석
    const prompt = `
당신은 baln(발른) 앱의 시장 분석 AI입니다.
오늘(${today}) 글로벌 금융 시장의 핵심 맥락을 분석해주세요.

다음 JSON 형식으로 응답하세요:
{
  "headline": "오늘의 핵심 시장 이벤트 한 줄 요약 (20자 이내)",
  "sentiment": "calm 또는 caution 또는 alert 중 하나",
  "historical_context": "과거 유사 상황 설명 (2-3문장, 안심 톤)",
  "macro_chain": ["원인 이벤트", "중간 영향", "최종 결과", "투자자 시사점"],
  "institutional_behavior": "기관 투자자 동향 요약 (1-2문장)",
  "market_summary": "오늘의 주요 지수 동향 요약 (1-2문장)"
}

원칙:
- "안심을 판다, 불안을 팔지 않는다" (워렌 버핏)
- 공포 마케팅 금지, 맥락 제공으로 이해를 돕는 톤
- 한국어로 작성
- 반드시 유효한 JSON으로만 응답
`;

    const raw = await callGemini(prompt);
    const card = JSON.parse(raw);

    console.log('[맥락 카드 생성] Gemini 응답 성공:', card.headline);

    // Step 2: DB에 저장 (upsert — 같은 날짜면 덮어쓰기)
    const { data: savedCard, error: insertError } = await supabase
      .from('context_cards')
      .upsert({
        date: today,
        headline: card.headline || '시장 분석 준비 중',
        sentiment: card.sentiment || 'calm',
        historical_context: card.historical_context || '',
        macro_chain: card.macro_chain || [],
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
