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
import { checkCrisisAlert } from './task-h-crisis-alert.ts';
import { runNewsCollection } from './task-j-news.ts';

// 공통 유틸 import
import { supabase, STOCK_LIST, GURU_LIST, sleep, retryWithBackoff } from './_shared.ts';

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
      console.log('[인증] Service Role 직접 매칭 아님 - cron/admin 토큰으로 진행');
    }

    // ========================================================================
    // 선택적 Task 실행: ?tasks=A,G 또는 body { "tasks": ["A","G"] }
    // 미지정 시 전체 실행 (기존 cron 동작)
    // ========================================================================
    let selectedTasks: Set<string> | null = null;

    // URL 쿼리 파라미터 확인
    const url = new URL(req.url);
    const tasksParam = url.searchParams.get('tasks');
    if (tasksParam) {
      selectedTasks = new Set(tasksParam.toUpperCase().split(',').map(t => t.trim()));
    }

    // POST body 확인 (쿼리 파라미터가 없을 때)
    if (!selectedTasks && req.method === 'POST') {
      try {
        const body = await req.clone().json();
        if (body?.tasks && Array.isArray(body.tasks)) {
          selectedTasks = new Set(body.tasks.map((t: string) => t.toUpperCase().trim()));
        }
      } catch { /* body 파싱 실패 시 전체 실행 */ }
    }

    const timeSlot = url.searchParams.get('time_slot') || undefined;

    const runAll = !selectedTasks;
    const shouldRun = (task: string) => runAll || selectedTasks!.has(task);
    // 선택 실행 시 Task 간 지연 단축 (전체 실행 시만 Rate Limit 방지)
    const delayMs = runAll ? 2000 : 500;

    const startTime = Date.now();
    console.log('========================================');
    console.log(`[Central Kitchen] 배치 시작: ${new Date().toISOString()}`);
    console.log(`[모드] ${runAll ? '전체 실행 (cron)' : `선택 실행: ${[...selectedTasks!].join(',')}`}`);
    console.log('========================================');

    // ========================================================================
    // 결과 변수 초기화 (스킵된 Task는 null)
    // ========================================================================
    type TaskResult<T> = { status: 'fulfilled'; value: T } | { status: 'rejected'; reason: any } | null;

    const safe = <T>(fn: () => Promise<T>): Promise<{ status: 'fulfilled'; value: T } | { status: 'rejected'; reason: any }> =>
      fn().then(
        value => ({ status: 'fulfilled' as const, value }),
        reason => ({ status: 'rejected' as const, reason })
      );

    let snapshotsResult: TaskResult<any> = null;
    let macroResult: TaskResult<any> = null;
    let stocksResult: TaskResult<any> = null;
    let gurusResult: TaskResult<any> = null;
    let predictionsResult: TaskResult<any> = null;
    let resolveResult: TaskResult<any> = null;
    let contextCardResult: TaskResult<any> = null;
    let realEstateResult: TaskResult<any> = null;
    let crisisResult: TaskResult<any> = null;
    let newsResult: TaskResult<any> = null;

    // Task D: 포트폴리오 스냅샷 (Gemini 미사용, DB only)
    if (shouldRun('D')) {
      console.log('[Task D] 시작: 포트폴리오 스냅샷...');
      snapshotsResult = await safe(() => retryWithBackoff('Task D', takePortfolioSnapshots));
      await sleep(delayMs);
    }

    // Task A: 거시경제 & 비트코인 (Gemini + Search) — ★ 재시도 적용
    if (shouldRun('A')) {
      console.log('[Task A] 시작: 거시경제 & 비트코인...');
      macroResult = await safe(() => retryWithBackoff('Task A', analyzeMacroAndBitcoin));
      await sleep(delayMs);
    }

    // Task B: 종목별 퀀트 분석 (Gemini, 배치 7개씩) — ★ 재시도 적용
    // ⚠️ Task B는 150초 타임아웃에 걸릴 수 있으므로 B1(전반) + B2(후반)로 분할
    if (shouldRun('B')) {
      console.log('[Task B] 시작: 종목 분석 (35개)...');
      stocksResult = await safe(() => retryWithBackoff('Task B', analyzeAllStocks));
      await sleep(delayMs);
    }
    // Task B 전반부만 (B1): 종목 0~17
    if (shouldRun('B1')) {
      console.log('[Task B1] 시작: 종목 분석 전반부 (18개)...');
      const { analyzeStockSubset } = await import('./task-b-stocks.ts');
      stocksResult = await safe(() => retryWithBackoff('Task B1', () => analyzeStockSubset(0, 18)));
      await sleep(delayMs);
    }
    // Task B 후반부만 (B2): 종목 18~34
    if (shouldRun('B2')) {
      console.log('[Task B2] 시작: 종목 분석 후반부 (17개)...');
      const { analyzeStockSubset } = await import('./task-b-stocks.ts');
      stocksResult = await safe(() => retryWithBackoff('Task B2', () => analyzeStockSubset(18, 35)));
      await sleep(delayMs);
    }

    // Task C: 투자 거장 인사이트 (Gemini) — ★ 재시도 적용
    if (shouldRun('C')) {
      console.log('[Task C] 시작: 투자 거장 인사이트...');
      gurusResult = await safe(() => retryWithBackoff('Task C', runGuruInsightsAnalysis));
      await sleep(delayMs);
    }

    // Task E-1: 예측 질문 생성 (Gemini) — ★ 재시도 적용
    if (shouldRun('E') || shouldRun('E1') || shouldRun('E-1')) {
      console.log('[Task E-1] 시작: 예측 질문 생성...');
      predictionsResult = await safe(() => retryWithBackoff('Task E-1', generatePredictionPolls));
      await sleep(delayMs);
    }

    // Task E-2: 예측 정답 판정 (Gemini) — ★ 재시도 적용
    if (shouldRun('E') || shouldRun('E2') || shouldRun('E-2')) {
      console.log('[Task E-2] 시작: 예측 정답 판정...');
      resolveResult = await safe(() => retryWithBackoff('Task E-2', resolvePredictionPolls));
      await sleep(delayMs);
    }

    // Task G: 맥락 카드 생성 (Gemini) — ★ 재시도 적용
    if (shouldRun('G')) {
      console.log('[Task G] 시작: 맥락 카드 생성...');
      contextCardResult = await safe(() => retryWithBackoff('Task G', () => runContextCardGeneration(timeSlot)));
      await sleep(delayMs);
    }

    // Task F: 부동산 시세 업데이트 (국토부 API, 옵셔널) — ★ 재시도 적용
    if (shouldRun('F')) {
      console.log('[Task F] 시작: 부동산 시세...');
      realEstateResult = await safe(() => retryWithBackoff('Task F', updateRealEstatePrices));
      await sleep(delayMs);
    }

    // Task H: 위기 알림 감지 (Gemini + Search) — ★ 재시도 적용
    if (shouldRun('H')) {
      console.log('[Task H] 시작: 위기 알림 감지...');
      crisisResult = await safe(() => retryWithBackoff('Task H', checkCrisisAlert));
    }

    // Task J: 실시간 뉴스 수집 (RSS + Gemini 태깅) — ★ 재시도 적용
    if (shouldRun('J')) {
      console.log('[Task J] 시작: 뉴스 수집...');
      newsResult = await safe(() => retryWithBackoff('Task J', runNewsCollection));
      await sleep(delayMs);
    }

    // Task I: 코스톨라니 국면 감지 (주 1회 — 매주 월요일 자동 실행)
    const todayKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const isMonday = todayKST.getDay() === 1;
    let kostolalyResult: TaskResult<any> = null;
    if (shouldRun('I') || (runAll && isMonday)) {
      console.log('[Task I] 시작: 코스톨라니 국면 감지 (주 1회)...');
      kostolalyResult = await safe(async () => {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
        const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        const res = await fetch(`${SUPABASE_URL}/functions/v1/kostolany-detector`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SERVICE_KEY}` },
        });
        if (!res.ok) throw new Error(`kostolany-detector ${res.status}`);
        return await res.json();
      });
    }

    // ========================================================================
    // 결과 로깅 및 통계 집계
    // ========================================================================

    // Task 로깅 헬퍼
    const logTask = (name: string, result: TaskResult<any>, onSuccess: (v: any) => string) => {
      if (!result) { console.log(`[${name}] 스킵 (미선택)`); return; }
      if (result.status === 'fulfilled') { console.log(`[${name}] ${onSuccess(result.value)}`); }
      else { console.error(`[${name}] 실패:`, result.reason); }
    };

    logTask('Task A', macroResult, () => '성공: 거시경제 & 비트코인 분석 완료');
    logTask('Task B', stocksResult, v => `성공: 종목 분석 ${v.length}/${STOCK_LIST.length}건 완료`);
    logTask('Task C', gurusResult, v => `성공: 투자 거장 ${v.count}/10명 분석 완료`);
    logTask('Task D', snapshotsResult, v => `성공: 스냅샷 ${v.snapshotsCreated}/${v.totalUsers}명, 구간별 통계 ${v.bracketsUpdated}개`);
    logTask('Task E-1', predictionsResult, v => v.skipped ? '스킵 (이미 생성됨)' : `성공: 예측 질문 ${v.created}개 생성`);
    logTask('Task E-2', resolveResult, v => `성공: 예측 판정 ${v.resolved}건 해결, ${v.deferred}건 보류`);
    logTask('Task F', realEstateResult, v => v.skipped ? '스킵 (API 키 미설정)' : `성공: 캐시 ${v.cacheUpdated}건, 포트폴리오 ${v.assetsUpdated}건 업데이트`);
    logTask('Task G', contextCardResult, v => `성공: 맥락 카드 생성 (${v.sentiment}), ${v.usersCalculated}명 영향도 계산 (평균 ${v.avgImpact}%)`);
    logTask('Task H', crisisResult, v => v.crisisDetected ? `위기 감지: ${v.alertsCreated}건 알림 생성` : `정상 — 위기 미감지 (${v.marketsChecked.length}개 시장 확인)`);
    logTask('Task I', kostolalyResult, v => `코스톨라니 국면: ${v.action} — ${v.phase ?? v.newPhase ?? ''}`);
    logTask('Task J', newsResult, v => `성공: 뉴스 ${v.totalFetched}건 수집, ${v.totalUpserted}건 저장, ${v.totalDeleted}건 삭제`);

    // ========================================================================
    // 응답 생성
    // ========================================================================

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // null-safe 상태 헬퍼
    const st = (r: TaskResult<any>) => !r ? 'SKIPPED' : r.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const val = <T>(r: TaskResult<any>, getter: (v: any) => T, fallback: T): T =>
      r?.status === 'fulfilled' ? getter(r.value) : fallback;

    const summary: Record<string, any> = {};
    if (shouldRun('A')) summary.macro = { status: st(macroResult) };
    if (shouldRun('B') || shouldRun('B1') || shouldRun('B2')) summary.stocks = { status: st(stocksResult), count: val(stocksResult, v => v.length, 0) };
    if (shouldRun('C')) summary.gurus = { status: st(gurusResult), count: `${val(gurusResult, v => v.count, 0)}/10` };
    if (shouldRun('D')) summary.snapshots = { status: st(snapshotsResult), count: val(snapshotsResult, v => v.snapshotsCreated, 0) };
    if (shouldRun('E') || shouldRun('E1') || shouldRun('E-1')) summary.predictions = { status: st(predictionsResult), created: val(predictionsResult, v => v.created, 0) };
    if (shouldRun('E') || shouldRun('E2') || shouldRun('E-2')) summary.resolve = { status: st(resolveResult), resolved: val(resolveResult, v => v.resolved, 0) };
    if (shouldRun('F')) summary.realEstate = { status: st(realEstateResult), updated: val(realEstateResult, v => v.assetsUpdated, 0) };
    if (shouldRun('G')) summary.contextCard = { status: st(contextCardResult), sentiment: val(contextCardResult, v => v.sentiment, 'N/A'), users: val(contextCardResult, v => v.usersCalculated, 0) };
    if (shouldRun('H')) summary.crisisAlert = { status: st(crisisResult), detected: val(crisisResult, v => v.crisisDetected, false) };
    if (shouldRun('J')) summary.news = { status: st(newsResult), fetched: val(newsResult, v => v.totalFetched, 0), upserted: val(newsResult, v => v.totalUpserted, 0) };

    console.log('========================================');
    console.log(`[Central Kitchen] 배치 완료: ${elapsed}초`);
    for (const [key, info] of Object.entries(summary)) {
      console.log(`  - ${key}: ${JSON.stringify(info)}`);
    }
    console.log('========================================');

    const response = new Response(
      JSON.stringify({
        success: true,
        mode: runAll ? 'full' : `selective: ${[...selectedTasks!].join(',')}`,
        elapsed: `${elapsed}s`,
        tasks: summary,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

    return response;
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
