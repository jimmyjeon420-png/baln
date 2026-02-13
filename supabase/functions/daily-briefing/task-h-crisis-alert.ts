// @ts-nocheck
// ============================================================================
// Task H: 위기 알림 (Crisis Alert)
// 시장 급변동 감지 → Gemini 맥락 분석 → DB 저장 (crisis_alerts + context_cards)
//
// 트리거: 매일 Central Kitchen 배치 실행 시
// 기준:
//   1) S&P 500 -3% 이상 하락
//   2) VIX 30 이상 (공포지수 급등)
//   3) KOSPI/NASDAQ/BTC 급락
// 결과:
//   - crisis_alerts 테이블에 알림 저장
//   - context_cards 테이블에 sentiment='alert' 위기 카드 UPSERT
//   - 앱에서 alert 카드를 별도 UI로 강조 표시
// ============================================================================

import { supabase, callGeminiWithSearch, logTaskResult, sleep } from './_shared.ts';

// ============================================================================
// 타입 정의
// ============================================================================

interface CrisisAlert {
  market: string;           // 'US' | 'KR' | 'CRYPTO'
  trigger_index: string;    // 'S&P 500', 'KOSPI', 'BTC', 'VIX'
  change_percent: number;   // 변동률 (음수) 또는 VIX 수치
  severity: 'WARNING' | 'CRITICAL'; // -3% = WARNING, -5% = CRITICAL / VIX 30+ = WARNING, 40+ = CRITICAL
  context_summary: string;  // AI가 생성한 맥락 설명
  historical_parallel: string; // 역사적 유사 사례
  action_guidance: string;  // 사용자 행동 가이드
  created_at: string;
}

interface CrisisCheckResult {
  alertsCreated: number;
  marketsChecked: string[];
  crisisDetected: boolean;
  contextCardCreated: boolean;
}

// ============================================================================
// 위기 감지 기준
// ============================================================================

const CRISIS_THRESHOLDS = {
  WARNING: -3,   // -3% 이상 하락 → 주의
  CRITICAL: -5,  // -5% 이상 하락 → 위기
};

const VIX_THRESHOLDS = {
  WARNING: 30,   // VIX 30 이상 → 주의
  CRITICAL: 40,  // VIX 40 이상 → 위기
};

// ============================================================================
// 메인 함수
// ============================================================================

export async function checkCrisisAlert(): Promise<CrisisCheckResult> {
  const startTime = Date.now();
  const marketsChecked: string[] = [];
  let alertsCreated = 0;
  let crisisDetected = false;
  let contextCardCreated = false;

  try {
    console.log('[Task H] 위기 알림 감지 시작...');

    // ── Step 1: 시장 데이터 + VIX 조회 (Gemini + Google Search) ──
    const marketDataPrompt = `당신은 baln(발른) 앱의 시장 모니터 AI입니다.
오늘의 주요 시장 지수 변동률과 VIX를 Google Search로 조사하세요.

[검색 키워드]
- "S&P 500 today", "KOSPI today", "NASDAQ today", "Bitcoin price today", "VIX index today"

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운, 코드블록 금지.]
{
  "date": "YYYY-MM-DD",
  "vix": 18.5,
  "indices": [
    {"name": "S&P 500", "market": "US", "change_percent": -1.5, "close_price": 5200},
    {"name": "KOSPI", "market": "KR", "change_percent": -0.8, "close_price": 2650},
    {"name": "Bitcoin", "market": "CRYPTO", "ticker": "BTC", "change_percent": -2.1, "close_price": 95000},
    {"name": "NASDAQ", "market": "US", "change_percent": -1.8, "close_price": 16500}
  ]
}

[규칙]
- vix: CBOE VIX 현재 수치 (숫자)
- change_percent: 전일 대비 변동률(%), 소수점 첫째 자리
- close_price: 종가 또는 현재가, 정수
- 위 수치는 구조 참고용. 실제 검색 결과를 사용하세요.
`;

    let marketData: { vix?: number; indices?: any[] };
    try {
      const marketDataRaw = await callGeminiWithSearch(marketDataPrompt);
      marketData = JSON.parse(marketDataRaw);
    } catch (parseErr) {
      console.warn('[Task H] 시장 데이터 파싱 실패 — 위기 감지 스킵:', parseErr);
      await logTaskResult('crisis_alert', 'SKIPPED', Date.now() - startTime, { reason: 'parse_failure' });
      return { alertsCreated: 0, marketsChecked: [], crisisDetected: false, contextCardCreated: false };
    }

    if (!marketData?.indices || !Array.isArray(marketData.indices)) {
      console.warn('[Task H] 시장 데이터 형식 오류, 스킵');
      await logTaskResult('crisis_alert', 'SKIPPED', Date.now() - startTime, { reason: 'invalid_market_data' });
      return { alertsCreated: 0, marketsChecked: [], crisisDetected: false, contextCardCreated: false };
    }

    const vixLevel = typeof marketData.vix === 'number' ? marketData.vix : null;
    console.log(`[Task H] VIX 수치: ${vixLevel ?? 'N/A'}`);

    // ── Step 2: 위기 수준 판정 (지수 급락 + VIX 급등) ──
    const crisisIndices = marketData.indices.filter(
      (idx: any) => idx.change_percent <= CRISIS_THRESHOLDS.WARNING
    );

    // VIX 30 이상이면 별도 위기 항목으로 추가
    const vixCrisis = vixLevel !== null && vixLevel >= VIX_THRESHOLDS.WARNING;
    if (vixCrisis) {
      crisisIndices.push({
        name: 'VIX',
        market: 'US',
        change_percent: vixLevel, // VIX는 절대값 저장 (30, 40 등)
        close_price: vixLevel,
        _isVix: true, // 내부 플래그
      });
      console.log(`[Task H] VIX 위기 감지: ${vixLevel} (기준: ${VIX_THRESHOLDS.WARNING}+)`);
    }

    marketsChecked.push(...marketData.indices.map((idx: any) => idx.name));
    if (vixLevel !== null) marketsChecked.push('VIX');

    if (crisisIndices.length === 0) {
      console.log('[Task H] 위기 감지 없음 — 모든 시장 정상 범위');
      await logTaskResult('crisis_alert', 'SUCCESS', Date.now() - startTime, {
        crisis: false,
        vix: vixLevel,
        marketsChecked: marketsChecked.length,
      });
      return { alertsCreated: 0, marketsChecked, crisisDetected: false, contextCardCreated: false };
    }

    crisisDetected = true;
    console.log(`[Task H] 위기 감지: ${crisisIndices.length}개 시장/지표`);

    // ── Step 3: 위기 맥락 분석 (AI) + crisis_alerts 저장 ──
    const allContextSummaries: string[] = [];

    for (const crisis of crisisIndices) {
      await sleep(2000); // Rate limit 방지

      const isVix = crisis._isVix === true;
      let severity: 'WARNING' | 'CRITICAL';

      if (isVix) {
        severity = crisis.change_percent >= VIX_THRESHOLDS.CRITICAL ? 'CRITICAL' : 'WARNING';
      } else {
        severity = crisis.change_percent <= CRISIS_THRESHOLDS.CRITICAL ? 'CRITICAL' : 'WARNING';
      }

      const crisisDesc = isVix
        ? `VIX 공포지수가 ${crisis.change_percent}으로 급등했습니다 (30 이상 = 공포 구간).`
        : `${crisis.name}이(가) ${crisis.change_percent}% 하락했습니다.`;

      const contextPrompt = `당신은 baln(발른) 앱의 위기 맥락 분석 AI입니다.
${crisisDesc}

[핵심 원칙 — 반드시 준수]
- "안심을 판다, 불안을 팔지 않는다."
- "급락", "폭락", "공포", "패닉" 같은 감정적 표현을 사용하지 않는다.
- "조정", "하락", "변동성 확대" 같은 중립적 표현을 사용한다.
- 과거 유사 사례에서 회복한 경험을 반드시 포함한다.
- 한국어로 자연스럽게 작성한다.

[응답 형식 — 아래 JSON만 출력. 설명문, 마크다운 금지.]
{
  "context_summary": "원인과 배경을 2~3문장으로 설명. 감정적 표현 없이 사실 중심으로.",
  "historical_parallel": "과거 유사 사례 1개와 이후 회복 과정 1~2문장. 반드시 회복 사실 포함.",
  "action_guidance": "투자자 행동 가이드 1~2문장. 장기 관점 유지 권고."
}

[좋은 예시]
{
  "context_summary": "미국 CPI가 예상을 웃돌면서 금리 인하 기대가 후퇴한 것이 주된 원인입니다. 시장은 새로운 경제 데이터를 소화하는 과정에 있습니다.",
  "historical_parallel": "2022년 6월에도 CPI 서프라이즈로 S&P 500이 3.9% 하락했지만, 3개월 뒤 전고점을 회복했습니다.",
  "action_guidance": "단기 조정은 장기 포트폴리오에 큰 영향을 주지 않습니다. 미리 정해둔 투자 계획을 유지하시는 것이 바람직합니다."
}
`;

      try {
        let context: { context_summary?: string; historical_parallel?: string; action_guidance?: string };
        try {
          const contextRaw = await callGeminiWithSearch(contextPrompt);
          context = JSON.parse(contextRaw);
        } catch (parseErr) {
          console.warn(`[Task H] 맥락 응답 파싱 실패 (${crisis.name}) — 기본값 사용:`, parseErr);
          context = {
            context_summary: '시장에 변동이 발생했습니다. 구체적인 원인을 분석하고 있습니다.',
            historical_parallel: '역사적으로 유사한 시장 조정 이후 대부분 회복 흐름을 보였습니다.',
            action_guidance: '장기 투자 관점을 유지하시고, 감정적인 매매를 자제하시기 바랍니다.',
          };
        }

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

        // crisis_alerts 테이블 저장
        const { error: insertError } = await supabase
          .from('crisis_alerts')
          .insert(alert);

        if (insertError) {
          console.warn(`[Task H] crisis_alerts 저장 실패 (${crisis.name}):`, insertError.message);
        } else {
          alertsCreated++;
          console.log(`[Task H] 알림 저장: ${crisis.name} ${crisis.change_percent}${isVix ? '' : '%'} (${severity})`);
        }

        // 맥락 요약 수집 (context_cards 생성용)
        allContextSummaries.push(
          `[${crisis.name}] ${alert.context_summary}\n${alert.historical_parallel}`
        );
      } catch (contextErr) {
        console.warn(`[Task H] 맥락 분석 실패 (${crisis.name}):`, contextErr);
      }
    }

    // ── Step 4: context_cards 테이블에 위기 맥락 카드 UPSERT (sentiment='alert') ──
    if (allContextSummaries.length > 0) {
      try {
        const todayDate = new Date().toISOString().split('T')[0];
        const triggeredNames = crisisIndices.map((c: any) =>
          c._isVix ? `VIX ${c.change_percent}` : `${c.name} ${c.change_percent}%`
        );

        const headline = crisisIndices.length === 1
          ? `${crisisIndices[0].name} 급변동 — 맥락을 확인하세요`
          : `${crisisIndices.length}개 시장 급변동 — 맥락을 확인하세요`;

        const macroChain = [
          `위기 트리거: ${triggeredNames.join(', ')}`,
          vixLevel !== null ? `VIX 공포지수: ${vixLevel}` : null,
          '시장 변동성 급등',
          '단기 공포 확산',
          '맥락 이해로 패닉셀 방지',
        ].filter(Boolean) as string[];

        const { error: upsertError } = await supabase
          .from('context_cards')
          .upsert(
            {
              date: todayDate,
              headline,
              historical_context: allContextSummaries.join('\n\n'),
              macro_chain: macroChain,
              institutional_behavior: '위기 시 기관 투자자는 규칙 기반 리밸런싱을 수행합니다. 패닉 매도가 아닌 체계적 대응입니다.',
              sentiment: 'alert',
              is_premium_only: false, // 위기 카드는 모든 유저에게 공개
              market_data: {
                vix: vixLevel,
                crisis_triggers: triggeredNames,
                severity: crisisIndices.some((c: any) =>
                  c._isVix
                    ? c.change_percent >= VIX_THRESHOLDS.CRITICAL
                    : c.change_percent <= CRISIS_THRESHOLDS.CRITICAL
                )
                  ? 'CRITICAL'
                  : 'WARNING',
              },
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'date' }
          );

        if (upsertError) {
          console.warn('[Task H] context_cards UPSERT 실패:', upsertError.message);
        } else {
          contextCardCreated = true;
          console.log(`[Task H] 위기 맥락 카드 생성 완료 (sentiment=alert)`);
        }
      } catch (cardErr) {
        console.warn('[Task H] 위기 맥락 카드 생성 실패:', cardErr);
      }
    }

    // ── Step 5: 로그 기록 ──
    const elapsed = Date.now() - startTime;
    await logTaskResult('crisis_alert', 'SUCCESS', elapsed, {
      crisis: true,
      alertsCreated,
      contextCardCreated,
      vix: vixLevel,
      marketsChecked: marketsChecked.length,
      crisisIndices: crisisIndices.map((c: any) => `${c.name}: ${c.change_percent}${c._isVix ? '' : '%'}`),
    });

    return { alertsCreated, marketsChecked, crisisDetected, contextCardCreated };
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
    return { alertsCreated: 0, marketsChecked, crisisDetected: false, contextCardCreated: false };
  }
}
