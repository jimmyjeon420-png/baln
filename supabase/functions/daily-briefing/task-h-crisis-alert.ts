// @ts-nocheck
// ============================================================================
// Task H: 위기 알림 (Crisis Alert)
// 시장 급락(-3% 이상) 감지 → 맥락 기반 알림 생성 → DB 저장
//
// 트리거: 매일 Central Kitchen 배치 실행 시
// 기준: S&P 500 또는 KOSPI 당일 변동률 -3% 이하
// 결과: crisis_alerts 테이블에 알림 저장 → 앱에서 푸시 발송
// ============================================================================

import { supabase, callGeminiWithSearch, logTaskResult, sleep } from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

interface CrisisAlert {
  market: string;           // 'US' | 'KR' | 'CRYPTO'
  trigger_index: string;    // 'S&P 500', 'KOSPI', 'BTC'
  change_percent: number;   // 변동률 (음수)
  severity: 'WARNING' | 'CRITICAL'; // -3% = WARNING, -5% = CRITICAL
  context_summary: string;  // AI가 생성한 맥락 설명
  historical_parallel: string; // 역사적 유사 사례
  action_guidance: string;  // 사용자 행동 가이드
  created_at: string;
}

interface CrisisCheckResult {
  alertsCreated: number;
  marketsChecked: string[];
  crisisDetected: boolean;
}

// ============================================================================
// 위기 감지 기준
// ============================================================================

const CRISIS_THRESHOLDS = {
  WARNING: -3,   // -3% 이상 하락 → 주의
  CRITICAL: -5,  // -5% 이상 하락 → 위기
};

// ============================================================================
// 메인 함수
// ============================================================================

export async function checkCrisisAlert(): Promise<CrisisCheckResult> {
  const startTime = Date.now();
  const marketsChecked: string[] = [];
  let alertsCreated = 0;
  let crisisDetected = false;

  try {
    console.log('[Task H] 위기 알림 감지 시작...');

    // ── Step 1: 시장 데이터 조회 (Gemini + Google Search) ──
    const marketDataPrompt = `
당신은 금융 시장 모니터 AI입니다. 오늘의 주요 시장 지수 변동률을 조사해주세요.

다음 JSON 형식으로 응답하세요:
{
  "date": "YYYY-MM-DD",
  "indices": [
    {
      "name": "S&P 500",
      "market": "US",
      "change_percent": -1.5,
      "close_price": 5200
    },
    {
      "name": "KOSPI",
      "market": "KR",
      "change_percent": -0.8,
      "close_price": 2650
    },
    {
      "name": "Bitcoin",
      "market": "CRYPTO",
      "ticker": "BTC",
      "change_percent": -2.1,
      "close_price": 95000
    },
    {
      "name": "NASDAQ",
      "market": "US",
      "change_percent": -1.8,
      "close_price": 16500
    }
  ]
}

중요:
- change_percent는 전일 대비 변동률(%)
- 실시간 데이터가 불가하면 최근 거래일 기준
- 반드시 유효한 JSON으로만 응답
`;

    const marketDataRaw = await callGeminiWithSearch(marketDataPrompt);
    const marketData = JSON.parse(marketDataRaw);

    if (!marketData?.indices || !Array.isArray(marketData.indices)) {
      console.warn('[Task H] 시장 데이터 형식 오류, 스킵');
      await logTaskResult('crisis_alert', 'SKIPPED', Date.now() - startTime, { reason: 'invalid_market_data' });
      return { alertsCreated: 0, marketsChecked: [], crisisDetected: false };
    }

    // ── Step 2: 위기 수준 판정 ──
    const crisisIndices = marketData.indices.filter(
      (idx: any) => idx.change_percent <= CRISIS_THRESHOLDS.WARNING
    );

    marketsChecked.push(...marketData.indices.map((idx: any) => idx.name));

    if (crisisIndices.length === 0) {
      console.log('[Task H] 위기 감지 없음 — 모든 시장 정상 범위');
      await logTaskResult('crisis_alert', 'SUCCESS', Date.now() - startTime, {
        crisis: false,
        marketsChecked: marketsChecked.length,
      });
      return { alertsCreated: 0, marketsChecked, crisisDetected: false };
    }

    crisisDetected = true;
    console.log(`[Task H] 위기 감지: ${crisisIndices.length}개 시장`);

    // ── Step 3: 위기 맥락 분석 (AI) ──
    for (const crisis of crisisIndices) {
      await sleep(2000); // Rate limit 방지

      const severity = crisis.change_percent <= CRISIS_THRESHOLDS.CRITICAL ? 'CRITICAL' : 'WARNING';

      const contextPrompt = `
당신은 금융 전문가 AI입니다. ${crisis.name}이(가) ${crisis.change_percent}% 하락했습니다.

다음 JSON 형식으로 맥락을 분석해주세요:
{
  "context_summary": "이번 하락의 원인과 맥락을 2-3문장으로 설명 (안심 톤, 공포 마케팅 금지)",
  "historical_parallel": "역사적으로 유사한 하락 사례 1개와 이후 회복 과정 (1-2문장)",
  "action_guidance": "개인 투자자가 취해야 할 행동 가이드 (1-2문장, 패닉셀 방지 톤)"
}

중요 원칙:
- "안심을 판다, 불안을 팔지 않는다" (워렌 버핏)
- 공포 조장 표현 절대 금지
- 맥락 제공으로 공포를 이해로 전환
- 한국어로 작성
`;

      try {
        const contextRaw = await callGeminiWithSearch(contextPrompt);
        const context = JSON.parse(contextRaw);

        const alert: CrisisAlert = {
          market: crisis.market,
          trigger_index: crisis.name,
          change_percent: crisis.change_percent,
          severity,
          context_summary: context.context_summary || '시장 변동이 발생했습니다.',
          historical_parallel: context.historical_parallel || '과거에도 유사한 조정 후 회복한 사례가 있습니다.',
          action_guidance: context.action_guidance || '장기 투자 관점을 유지하시고, 패닉 매도를 자제하세요.',
          created_at: new Date().toISOString(),
        };

        // DB 저장
        const { error: insertError } = await supabase
          .from('crisis_alerts')
          .insert(alert);

        if (insertError) {
          // 테이블이 없을 수 있음 — 에러 무시하고 로그만
          console.warn(`[Task H] DB 저장 실패 (${crisis.name}):`, insertError.message);
        } else {
          alertsCreated++;
          console.log(`[Task H] 알림 저장: ${crisis.name} ${crisis.change_percent}% (${severity})`);
        }
      } catch (contextErr) {
        console.warn(`[Task H] 맥락 분석 실패 (${crisis.name}):`, contextErr);
      }
    }

    // ── Step 4: 로그 기록 ──
    const elapsed = Date.now() - startTime;
    await logTaskResult('crisis_alert', 'SUCCESS', elapsed, {
      crisis: true,
      alertsCreated,
      marketsChecked: marketsChecked.length,
      crisisIndices: crisisIndices.map((c: any) => `${c.name}: ${c.change_percent}%`),
    });

    return { alertsCreated, marketsChecked, crisisDetected };
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error('[Task H] 치명적 오류:', error);
    await logTaskResult(
      'crisis_alert',
      'FAILED',
      elapsed,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return { alertsCreated: 0, marketsChecked, crisisDetected: false };
  }
}
