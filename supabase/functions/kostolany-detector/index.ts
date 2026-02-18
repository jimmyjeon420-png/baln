/**
 * kostolany-detector — 코스톨라니 달걀 모형 국면 자동 감지 Edge Function
 *
 * [역할]
 * Gemini AI + Google Search Grounding으로 현재 거시경제 상황을 분석
 * 코스톨라니 달걀 모형 6개 국면(A~F) 중 현재 위치를 판단
 * confidence > 70% AND 국면 변화 시에만 DB 업데이트 (주 1회 트리거)
 *
 * [호출 방법]
 * 1. 수동: curl -X POST https://ruqeinfcqhgexrckonsy.supabase.co/functions/v1/kostolany-detector \
 *      -H "Authorization: Bearer <service_role_key>"
 * 2. daily-briefing Task I로 주 1회 자동 호출
 *
 * [코스톨라니 달걀 국면]
 * A = 바닥 (Bottom): 극도의 비관론, 주가 최저점, 거래량 극소
 * B = 상승 (Rising): 주가 상승 시작, 기관 진입, 추세 형성
 * C = 과열 (Overheated): 모두가 낙관, 개인투자자 몰림, 최고점 근접
 * D = 하락 초기 (Early Decline): 추세 꺾임, 실망 매도
 * E = 패닉 (Panic): 강제 청산, 패닉 매도, 거래량 폭증
 * F = 극비관 (Extreme Pessimism): 무관심, 주식 뉴스 실종, A 직전
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-3-flash-preview';

// 코스톨라니 국면별 추천 배분
const KOSTOLANY_TARGETS: Record<string, Record<string, number>> = {
  A: { large_cap: 55, bond: 10, bitcoin: 10, gold: 15, commodity: 5,  altcoin: 3, cash: 2,  realestate: 0 },
  B: { large_cap: 65, bond: 5,  bitcoin: 15, gold: 5,  commodity: 3,  altcoin: 5, cash: 2,  realestate: 0 },
  C: { large_cap: 30, bond: 10, bitcoin: 5,  gold: 20, commodity: 10, altcoin: 2, cash: 23, realestate: 0 },
  D: { large_cap: 35, bond: 20, bitcoin: 5,  gold: 20, commodity: 8,  altcoin: 2, cash: 10, realestate: 0 },
  E: { large_cap: 20, bond: 30, bitcoin: 3,  gold: 25, commodity: 5,  altcoin: 2, cash: 15, realestate: 0 },
  F: { large_cap: 45, bond: 15, bitcoin: 8,  gold: 18, commodity: 5,  altcoin: 4, cash: 5,  realestate: 0 },
};

const PHASE_NAMES: Record<string, string> = {
  A: '바닥 국면', B: '상승 국면', C: '과열 국면',
  D: '하락 초기', E: '패닉 국면', F: '극비관 국면',
};

interface GeminiPhaseResult {
  phase: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  confidence: number;        // 0~100
  reasoning: string[];       // 근거 3~5개
  dalio_view: string;        // 달리오 관점
  buffett_view: string;      // 버핏 관점
}

/**
 * Gemini API 호출로 현재 코스톨라니 국면 분석
 */
async function analyzePhaseWithGemini(): Promise<GeminiPhaseResult | null> {
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `당신은 코스톨라니 달걀 모형 전문가입니다.
오늘 날짜: ${today}

코스톨라니 달걀 모형 6개 국면:
- A = 바닥 국면: 극도의 비관론, 주가 최저점, 거래량 극소, 신용융자 청산 완료
- B = 상승 국면: 주가 상승 시작, 기관투자자 진입, 추세 형성, 거래량 증가
- C = 과열 국면: 모두가 낙관론, 개인투자자 대거 유입, 최고점 근접, 뉴스 긍정적
- D = 하락 초기: 상승 추세 꺾임, 실망 매도 시작, 추세 추종자 이탈
- E = 패닉 국면: 강제 청산, 패닉 매도, 거래량 폭증, 뉴스 공포
- F = 극비관 국면: 무관심, 주식 뉴스 실종, 거래량 극소, A 직전 단계

현재 글로벌 시장 상황을 분석하여 아래 JSON 형식으로 응답하세요.
반드시 JSON만 응답하고, 다른 텍스트는 포함하지 마세요.

{
  "phase": "B",
  "confidence": 75,
  "reasoning": [
    "미국 S&P500 지수 연초 대비 상승 추세 유지",
    "연준 금리인하 기대감으로 기관 자금 유입 중",
    "AI 섹터 기업이익 호조로 성장 기대 유지",
    "개인투자자 순매수보다 기관 주도 장세 (B 국면 특성)",
    "VIX 지수 20 이하 유지 (공포 없음)"
  ],
  "dalio_view": "달리오: 상승 국면이지만 분산을 잊지 마라. 채권도 일부 보유해 리스크 균형을 맞춰라",
  "buffett_view": "버핏: 시장이 오르고 있지만 좋은 기업을 합리적 가격에 사는 원칙은 변하지 않는다"
}

confidence는 0~100 사이 정수. 70 이상일 때만 국면 변화를 기록합니다.
reasoning은 현재 시장 데이터에 기반한 구체적 근거 3~5개.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],  // Google Search Grounding for real-time data
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[kostolany-detector] Gemini API 오류:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    if (!text) {
      console.error('[kostolany-detector] Gemini 응답 비어있음');
      return null;
    }

    // JSON 파싱
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as GeminiPhaseResult;

    // 유효성 검사
    if (!['A', 'B', 'C', 'D', 'E', 'F'].includes(parsed.phase)) {
      console.error('[kostolany-detector] 유효하지 않은 국면:', parsed.phase);
      return null;
    }

    return parsed;
  } catch (err) {
    console.error('[kostolany-detector] 분석 실패:', err);
    return null;
  }
}

/**
 * DB 현재 국면 조회
 */
async function getCurrentPhase(supabase: any): Promise<{ phase: string; id: string } | null> {
  const { data, error } = await supabase
    .from('kostolany_phases')
    .select('id, phase')
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    console.warn('[kostolany-detector] 현재 국면 조회 실패:', error.message);
    return null;
  }

  return data;
}

/**
 * DB 국면 업데이트
 * 이전 current를 false로 바꾸고 새 행 삽입
 */
async function updatePhaseInDB(
  supabase: any,
  result: GeminiPhaseResult,
  previousId: string | null,
): Promise<boolean> {
  try {
    // 1. 이전 current 비활성화
    if (previousId) {
      await supabase
        .from('kostolany_phases')
        .update({ is_current: false })
        .eq('id', previousId);
    }

    // 2. 새 국면 삽입
    const { error } = await supabase.from('kostolany_phases').insert({
      phase: result.phase,
      confidence: result.confidence,
      reasoning: result.reasoning,
      dalio_view: result.dalio_view,
      buffett_view: result.buffett_view,
      suggested_target: KOSTOLANY_TARGETS[result.phase],
      is_current: true,
    });

    if (error) {
      console.error('[kostolany-detector] DB 삽입 실패:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[kostolany-detector] DB 업데이트 실패:', err);
    return false;
  }
}

// ── 메인 핸들러 ──

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('[kostolany-detector] 국면 분석 시작...');

    // 1. Gemini로 현재 국면 분석
    const result = await analyzePhaseWithGemini();

    if (!result) {
      return new Response(JSON.stringify({ error: 'Gemini 분석 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[kostolany-detector] 분석 결과: ${result.phase}국면 (신뢰도 ${result.confidence}%)`);

    // 2. 신뢰도 70% 미만이면 업데이트 생략
    if (result.confidence < 70) {
      return new Response(JSON.stringify({
        action: 'skipped',
        reason: `신뢰도 부족 (${result.confidence}% < 70%)`,
        analyzed_phase: result.phase,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. 현재 DB 국면 조회
    const current = await getCurrentPhase(supabase);

    // 4. 국면이 변화했거나 DB에 데이터가 없을 때만 업데이트
    if (current && current.phase === result.phase) {
      // 신뢰도만 업데이트
      await supabase
        .from('kostolany_phases')
        .update({
          confidence: result.confidence,
          reasoning: result.reasoning,
          dalio_view: result.dalio_view,
          buffett_view: result.buffett_view,
        })
        .eq('id', current.id);

      return new Response(JSON.stringify({
        action: 'refreshed',
        phase: result.phase,
        phaseName: PHASE_NAMES[result.phase],
        confidence: result.confidence,
        message: '국면 유지 (신뢰도/근거 업데이트)',
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 5. 국면 변화 → DB 업데이트
    const previousPhase = current?.phase ?? null;
    const previousId = current?.id ?? null;

    const success = await updatePhaseInDB(supabase, result, previousId);

    if (!success) {
      return new Response(JSON.stringify({ error: 'DB 업데이트 실패' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`[kostolany-detector] 국면 변화: ${previousPhase ?? '없음'} → ${result.phase} (신뢰도 ${result.confidence}%)`);

    return new Response(JSON.stringify({
      action: 'updated',
      previousPhase,
      newPhase: result.phase,
      newPhaseName: PHASE_NAMES[result.phase],
      confidence: result.confidence,
      reasoning: result.reasoning,
      message: `코스톨라니 국면이 ${previousPhase ?? '없음'} → ${result.phase}(${PHASE_NAMES[result.phase]})으로 변경되었습니다`,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[kostolany-detector] 핸들러 에러:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
