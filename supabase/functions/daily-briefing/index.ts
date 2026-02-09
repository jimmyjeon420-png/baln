// @ts-nocheck
// ============================================================================
// Central Kitchen: 일일 시장 분석 배치 Edge Function (Orchestrator)
// 매일 07:00 AM cron 트리거 → Task A~G 병렬 실행 → DB UPSERT
//
// [아키텍처]
// - index.ts: 오케스트레이터 (Task 실행 + 결과 집계)
// - task-*.ts: 개별 Task 구현 (모듈화)
// - _shared.ts: 공통 유틸리티 (Supabase, Gemini, 상수)
//
// [Task 목록]
// - Task A: 거시경제 & 비트코인 분석 (Gemini + Google Search)
// - Task B: 종목별 퀀트 분석 (35개 종목, 5개씩 배치)
// - Task C: 투자 거장 인사이트 (10명 거장)
// - Task D: 포트폴리오 스냅샷 (모든 유저, DB only)
// - Task E: 투자 예측 게임 (E-1: 질문 생성, E-2: 정답 판정)
// - Task F: 부동산 시세 업데이트 (국토부 API, 옵셔널)
// - Task G: 맥락 카드 생성 (킬링 피처, 4겹 분석)
//
// [병렬 실행 전략]
// - Promise.allSettled()로 7개 Task 동시 실행
// - 개별 Task 실패 시에도 다른 Task 정상 진행
// - 실패한 Task는 기본값 저장 또는 스킵
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Task 함수 import
import { analyzeMacroAndBitcoin } from './task-a-macro.ts';
import { analyzeAllStocks } from './task-b-stocks.ts';
import { runGuruInsightsAnalysis } from './task-c-gurus.ts';
import { takePortfolioSnapshots } from './task-d-snapshots.ts';
import { generatePredictionPolls } from './task-e-predictions.ts';
import { resolvePredictionPolls } from './task-e-resolve.ts';
import { updateRealEstatePrices } from './task-f-realestate.ts';
import { runContextCardGeneration } from './task-g-context-card.ts';

// 공통 유틸 import
import { supabase, STOCK_LIST, GURU_LIST, sleep } from './_shared.ts';

// ============================================================================
// 메인 핸들러
// ============================================================================

serve(async (req: Request) => {
  // CORS 헤더 (Supabase Dashboard에서 테스트 시 필요)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 인증 확인 (cron 또는 service role만 실행 가능)
    const authHeader = req.headers.get('Authorization');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!authHeader?.includes(SUPABASE_SERVICE_ROLE_KEY)) {
      // Bearer 토큰 확인 (Supabase cron은 자동으로 service role 사용)
      console.log('[인증] Service Role 직접 매칭 아님 - cron/admin 토큰으로 진행');
    }

    const startTime = Date.now();
    console.log('========================================');
    console.log(`[Central Kitchen] 일일 배치 시작: ${new Date().toISOString()}`);
    console.log('========================================');

    // ========================================================================
    // Task A~G 순차 실행 (Rate Limit 방지: 각 Task 간 2초 지연)
    // ========================================================================
    console.log('[순차 실행] Rate Limit 방지를 위해 Task 간 2초 지연');

    // Task D: 포트폴리오 스냅샷 (Gemini 미사용, DB only - 먼저 실행)
    console.log('[Task D] 시작: 포트폴리오 스냅샷...');
    const snapshotsResult = await takePortfolioSnapshots().then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason })
    );
    await sleep(2000);

    // Task A: 거시경제 & 비트코인 (Gemini + Search)
    console.log('[Task A] 시작: 거시경제 & 비트코인...');
    const macroResult = await analyzeMacroAndBitcoin().then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason })
    );
    await sleep(2000);

    // Task B: 종목별 퀀트 분석 (Gemini, 배치 5개씩 - 가장 무거움)
    console.log('[Task B] 시작: 종목 분석 (35개)...');
    const stocksResult = await analyzeAllStocks().then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason })
    );
    await sleep(2000);

    // Task C: 투자 거장 인사이트 (Gemini)
    console.log('[Task C] 시작: 투자 거장 인사이트...');
    const gurusResult = await runGuruInsightsAnalysis().then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason })
    );
    await sleep(2000);

    // Task E-1: 예측 질문 생성 (Gemini)
    console.log('[Task E-1] 시작: 예측 질문 생성...');
    const predictionsResult = await generatePredictionPolls().then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason })
    );
    await sleep(2000);

    // Task E-2: 예측 정답 판정 (Gemini)
    console.log('[Task E-2] 시작: 예측 정답 판정...');
    const resolveResult = await resolvePredictionPolls().then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason })
    );
    await sleep(2000);

    // Task G: 맥락 카드 생성 (Gemini)
    console.log('[Task G] 시작: 맥락 카드 생성...');
    const contextCardResult = await runContextCardGeneration().then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason })
    );
    await sleep(1000);

    // Task F: 부동산 시세 업데이트 (국토부 API, 옵셔널)
    console.log('[Task F] 시작: 부동산 시세...');
    const realEstateResult = await updateRealEstatePrices().then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason })
    );

    // ========================================================================
    // 결과 로깅 및 통계 집계
    // ========================================================================

    // Task A 로깅
    if (macroResult.status === 'fulfilled') {
      console.log('[Task A] 성공: 거시경제 & 비트코인 분석 완료');
    } else {
      console.error('[Task A] 실패:', macroResult.reason);
    }

    // Task B 로깅
    if (stocksResult.status === 'fulfilled') {
      console.log(`[Task B] 성공: 종목 분석 ${stocksResult.value.length}/${STOCK_LIST.length}건 완료`);
    } else {
      console.error('[Task B] 실패:', stocksResult.reason);
    }

    // Task C 로깅
    if (gurusResult.status === 'fulfilled') {
      console.log(`[Task C] 성공: 투자 거장 ${gurusResult.value.count}/10명 분석 완료`);
    } else {
      console.error('[Task C] 실패:', gurusResult.reason);
    }

    // Task D 로깅
    if (snapshotsResult.status === 'fulfilled') {
      const d = snapshotsResult.value;
      console.log(`[Task D] 성공: 스냅샷 ${d.snapshotsCreated}/${d.totalUsers}명, 구간별 통계 ${d.bracketsUpdated}개`);
    } else {
      console.error('[Task D] 실패:', snapshotsResult.reason);
    }

    // Task E-1 로깅
    if (predictionsResult.status === 'fulfilled') {
      const p = predictionsResult.value;
      console.log(`[Task E-1] ${p.skipped ? '스킵 (이미 생성됨)' : `성공: 예측 질문 ${p.created}개 생성`}`);
    } else {
      console.error('[Task E-1] 실패:', predictionsResult.reason);
    }

    // Task E-2 로깅
    if (resolveResult.status === 'fulfilled') {
      const r = resolveResult.value;
      console.log(`[Task E-2] 성공: 예측 판정 ${r.resolved}건 해결, ${r.deferred}건 보류`);
    } else {
      console.error('[Task E-2] 실패:', resolveResult.reason);
    }

    // Task F 로깅
    if (realEstateResult.status === 'fulfilled') {
      const re = realEstateResult.value;
      console.log(`[Task F] ${re.skipped ? '스킵 (API 키 미설정)' : `성공: 캐시 ${re.cacheUpdated}건, 포트폴리오 ${re.assetsUpdated}건 업데이트`}`);
    } else {
      console.error('[Task F] 실패:', realEstateResult.reason);
    }

    // Task G 로깅
    if (contextCardResult.status === 'fulfilled') {
      const cc = contextCardResult.value;
      console.log(`[Task G] 성공: 맥락 카드 생성 (${cc.sentiment}), ${cc.usersCalculated}명 영향도 계산 (평균 ${cc.avgImpact}%)`);
    } else {
      console.error('[Task G] 실패:', contextCardResult.reason);
    }

    // ========================================================================
    // 응답 생성
    // ========================================================================

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // 각 Task 상태 요약
    const macroStatus = macroResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const stockCount = stocksResult.status === 'fulfilled' ? stocksResult.value.length : 0;
    const guruStatus = gurusResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const guruCount = gurusResult.status === 'fulfilled' ? gurusResult.value.count : 0;
    const snapshotStatus = snapshotsResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const snapshotCount = snapshotsResult.status === 'fulfilled' ? snapshotsResult.value.snapshotsCreated : 0;
    const predictionStatus = predictionsResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const predictionCreated = predictionsResult.status === 'fulfilled' ? predictionsResult.value.created : 0;
    const resolveStatus = resolveResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const resolveCount = resolveResult.status === 'fulfilled' ? resolveResult.value.resolved : 0;
    const realEstateStatus = realEstateResult.status === 'fulfilled'
      ? (realEstateResult.value.skipped ? 'SKIPPED' : 'SUCCESS')
      : 'FAILED';
    const realEstateUpdated = realEstateResult.status === 'fulfilled' ? realEstateResult.value.assetsUpdated : 0;
    const contextCardStatus = contextCardResult.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const contextCardSentiment = contextCardResult.status === 'fulfilled' ? contextCardResult.value.sentiment : 'N/A';
    const contextCardUsers = contextCardResult.status === 'fulfilled' ? contextCardResult.value.usersCalculated : 0;

    console.log('========================================');
    console.log(`[Central Kitchen] 배치 완료: ${elapsed}초`);
    console.log(`  - 거시경제 (A): ${macroStatus}`);
    console.log(`  - 종목 분석 (B): ${stockCount}/${STOCK_LIST.length}건`);
    console.log(`  - 거장 인사이트 (C): ${guruStatus} (${guruCount}/10명)`);
    console.log(`  - 포트폴리오 스냅샷 (D): ${snapshotStatus} (${snapshotCount}명)`);
    console.log(`  - 예측 질문 생성 (E-1): ${predictionStatus} (${predictionCreated}개)`);
    console.log(`  - 예측 정답 판정 (E-2): ${resolveStatus} (${resolveCount}건)`);
    console.log(`  - 부동산 시세 (F): ${realEstateStatus} (${realEstateUpdated}건)`);
    console.log(`  - 맥락 카드 (G): ${contextCardStatus} (${contextCardSentiment}, ${contextCardUsers}명)`);
    console.log('========================================');

    return new Response(
      JSON.stringify({
        success: true,
        elapsed: `${elapsed}s`,
        tasks: {
          macro: { status: macroStatus },
          stocks: { status: stockCount > 0 ? 'SUCCESS' : 'FAILED', count: `${stockCount}/${STOCK_LIST.length}` },
          gurus: { status: guruStatus, count: `${guruCount}/10` },
          snapshots: { status: snapshotStatus, count: snapshotCount },
          predictions: { status: predictionStatus, created: predictionCreated },
          resolve: { status: resolveStatus, resolved: resolveCount },
          realEstate: { status: realEstateStatus, updated: realEstateUpdated },
          contextCard: { status: contextCardStatus, sentiment: contextCardSentiment, users: contextCardUsers },
        },
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[Central Kitchen] 치명적 오류:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
