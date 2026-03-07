/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars, @typescript-eslint/array-type */
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
import { runGuruInsightsAnalysis, runGuruInsightsAnalysisSubset } from './task-c-gurus.ts';
import { takePortfolioSnapshots } from './task-d-snapshots.ts';
import { generatePredictionPolls } from './task-e-predictions.ts';
import { resolvePredictionPolls } from './task-e-resolve.ts';
import { updateRealEstatePrices } from './task-f-realestate.ts';
import { runContextCardGeneration } from './task-g-context-card.ts';
import { checkCrisisAlert } from './task-h-crisis-alert.ts';
import { runNewsCollection } from './task-j-news.ts';
import { runPolymarketCollection } from './task-k-polymarket.ts';

// 공통 유틸 import
import {
  supabase,
  STOCK_LIST,
  GURU_LIST,
  sleep,
  retryWithBackoff,
  createDailyBriefingRun,
  finalizeDailyBriefingRun,
  logDailyBriefingTaskRun,
} from './_shared.ts';

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

  const startTime = Date.now();
  let runLogId: string | null = null;

  try {
    // 인증 확인: JWT 디코딩으로 프로젝트 소속 여부 검증
    // (env var의 SUPABASE_ANON_KEY는 실제 anon JWT와 다른 내부 API key이므로 문자열 비교 불가)
    const authHeader = req.headers.get('Authorization');
    const apiKeyHeader = req.headers.get('apikey')?.trim() ?? '';
    const authToken = authHeader?.replace(/^Bearer\s+/i, '').trim() ?? '';
    const PROJECT_REF = 'ruqeinfcqhgexrckonsy';

    function isValidProjectJwt(token: string): boolean {
      if (!token) return false;
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        const payload = JSON.parse(atob(parts[1]));
        return payload.iss === 'supabase' && payload.ref === PROJECT_REF;
      } catch {
        return false;
      }
    }

    // service_role key 직접 비교 (fallback)
    const SUPABASE_SERVICE_ROLE_KEY = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
    const INTERNAL_FUNCTION_JWT = (Deno.env.get('INTERNAL_FUNCTION_JWT') ?? '').trim();

    const authorized =
      isValidProjectJwt(authToken) ||
      isValidProjectJwt(apiKeyHeader) ||
      (SUPABASE_SERVICE_ROLE_KEY && (authToken === SUPABASE_SERVICE_ROLE_KEY || apiKeyHeader === SUPABASE_SERVICE_ROLE_KEY)) ||
      (INTERNAL_FUNCTION_JWT && (authToken === INTERNAL_FUNCTION_JWT || apiKeyHeader === INTERNAL_FUNCTION_JWT));

    if (!authorized) {
      console.warn('[daily-briefing] AUTH REJECTED — token is not a valid project JWT');
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized',
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ========================================================================
    // 선택적 Task 실행: ?tasks=A,G 또는 body { "tasks": ["A","G"] }
    // 미지정 시 전체 실행 (기존 cron 동작)
    // ========================================================================
    let selectedTasks: Set<string> | null = null;
    const url = new URL(req.url);
    // URL 쿼리 파라미터에서 lang 우선 읽기 (GET 요청용)
    let lang = url.searchParams.get('lang') || 'ko';
    let triggerSource = url.searchParams.get('trigger_source') || 'manual';

    // URL 쿼리 파라미터 확인
    const tasksParam = url.searchParams.get('tasks');
    if (tasksParam) {
      selectedTasks = new Set(tasksParam.toUpperCase().split(',').map(t => t.trim()));
    }

    // POST body 확인
    if (req.method === 'POST') {
      try {
        const body = await req.clone().json();
        if (!selectedTasks && body?.tasks) {
          // 배열 형식: {"tasks":["A","G"]} 또는 문자열 형식: {"tasks":"J"}
          if (Array.isArray(body.tasks)) {
            selectedTasks = new Set(body.tasks.map((t: string) => t.toUpperCase().trim()));
          } else if (typeof body.tasks === 'string') {
            selectedTasks = new Set(body.tasks.toUpperCase().split(',').map((t: string) => t.trim()));
          }
        }

        // POST body의 lang이 URL 파라미터보다 우선
        if (body?.lang === 'en') lang = 'en';
        else if (body?.lang === 'ko') lang = 'ko';

        if (typeof body?.trigger_source === 'string' && body.trigger_source.trim()) {
          triggerSource = body.trigger_source.slice(0, 80);
        } else if (typeof body?.reason === 'string' && body.reason.trim()) {
          triggerSource = `reason:${body.reason.slice(0, 72)}`;
        }
      } catch {
        // body 파싱 실패 시 전체 실행
      }
    }

    const timeSlot = url.searchParams.get('time_slot') || undefined;

    const runAll = !selectedTasks;
    const hasSelectedTask = (task: string) => selectedTasks?.has(task) ?? false;
    const shouldRun = (task: string) => runAll || hasSelectedTask(task);
    const shouldRunSplitOnly = (task: string) => hasSelectedTask(task);
    // 선택 실행 시 Task 간 지연 단축 (전체 실행 시만 Rate Limit 방지)
    const delayMs = runAll ? 2000 : 500;
    const selectedTaskList = runAll ? ['ALL'] : [...selectedTasks!];

    runLogId = await createDailyBriefingRun({
      runMode: runAll ? 'full' : 'selective',
      selectedTasks: selectedTaskList,
      triggerSource,
      startedAt: new Date().toISOString(),
    });

    console.log('========================================');
    console.log(`[Central Kitchen] 배치 시작: ${new Date().toISOString()}`);
    console.log(`[모드] ${runAll ? '전체 실행 (cron)' : `선택 실행: ${[...selectedTasks!].join(',')}`}`);
    console.log(`[RunLog] ${runLogId || '미생성'}`);
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

    const toErrorMessage = (reason: unknown): string => {
      if (reason instanceof Error) return reason.message;
      if (typeof reason === 'string') return reason;
      try {
        return JSON.stringify(reason);
      } catch {
        return 'Unknown error';
      }
    };

    const toResultSummary = (result: TaskResult<any>): Record<string, unknown> => {
      if (!result || result.status !== 'fulfilled') return {};
      const value = result.value;
      if (value == null) return {};
      if (Array.isArray(value)) return { count: value.length };
      if (typeof value === 'object') return value;
      return { value };
    };

    const logTaskMetric = async (
      taskKey: string,
      startedAtMs: number,
      result: TaskResult<any>
    ) => {
      if (!runLogId || !result) return;
      const status = result.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
      await logDailyBriefingTaskRun({
        runId: runLogId,
        taskKey,
        status,
        elapsedMs: Date.now() - startedAtMs,
        resultSummary: toResultSummary(result),
        errorMessage: result.status === 'rejected' ? toErrorMessage(result.reason) : undefined,
      });
    };

    let snapshotsResult: TaskResult<any> = null;
    let macroResult: TaskResult<any> = null;
    let stocksResult: TaskResult<any> = null;
    let stocksResultB1: TaskResult<any> = null;
    let stocksResultB2: TaskResult<any> = null;
    let gurusResult: TaskResult<any> = null;
    let gurusResultC1: TaskResult<any> = null;
    let gurusResultC2: TaskResult<any> = null;
    let predictionsResult: TaskResult<any> = null;
    let resolveResult: TaskResult<any> = null;
    let contextCardResult: TaskResult<any> = null;
    let realEstateResult: TaskResult<any> = null;
    let crisisResult: TaskResult<any> = null;
    let newsResult: TaskResult<any> = null;
    let polymarketResult: TaskResult<any> = null;

    // Task D: 포트폴리오 스냅샷 (Gemini 미사용, DB only)
    if (shouldRun('D')) {
      console.log('[Task D] 시작: 포트폴리오 스냅샷...');
      const taskStartedAt = Date.now();
      snapshotsResult = await safe(() => retryWithBackoff('Task D', takePortfolioSnapshots));
      await logTaskMetric('D', taskStartedAt, snapshotsResult);
      await sleep(delayMs);
    }

    // Task A: 거시경제 & 비트코인 (Gemini + Search) — ★ 재시도 적용
    if (shouldRun('A')) {
      console.log('[Task A] 시작: 거시경제 & 비트코인...');
      const taskStartedAt = Date.now();
      macroResult = await safe(() => retryWithBackoff('Task A', () => analyzeMacroAndBitcoin(lang)));
      await logTaskMetric('A', taskStartedAt, macroResult);
      await sleep(delayMs);
    }

    // Task B: 종목별 퀀트 분석 (Gemini, 배치 7개씩) — ★ 재시도 적용
    // ⚠️ Task B는 150초 타임아웃에 걸릴 수 있으므로 B1(전반) + B2(후반)로 분할
    if (shouldRun('B')) {
      console.log('[Task B] 시작: 종목 분석 (35개)...');
      const taskStartedAt = Date.now();
      stocksResult = await safe(() => retryWithBackoff('Task B', () => analyzeAllStocks(lang)));
      await logTaskMetric('B', taskStartedAt, stocksResult);
      await sleep(delayMs);
    }
    // Task B 전반부만 (B1): 종목 0~17
    if (shouldRunSplitOnly('B1')) {
      console.log('[Task B1] 시작: 종목 분석 전반부 (18개)...');
      const { analyzeStockSubset } = await import('./task-b-stocks.ts');
      const taskStartedAt = Date.now();
      stocksResultB1 = await safe(() => retryWithBackoff('Task B1', () => analyzeStockSubset(0, 18)));
      await logTaskMetric('B1', taskStartedAt, stocksResultB1);
      await sleep(delayMs);
    }
    // Task B 후반부만 (B2): 종목 18~34
    if (shouldRunSplitOnly('B2')) {
      console.log('[Task B2] 시작: 종목 분석 후반부 (17개)...');
      const { analyzeStockSubset } = await import('./task-b-stocks.ts');
      const taskStartedAt = Date.now();
      stocksResultB2 = await safe(() => retryWithBackoff('Task B2', () => analyzeStockSubset(18, 35)));
      await logTaskMetric('B2', taskStartedAt, stocksResultB2);
      await sleep(delayMs);
    }

    // Task C: 투자 거장 인사이트 (Gemini) — ★ 재시도 적용
    if (shouldRun('C')) {
      console.log('[Task C] 시작: 투자 거장 인사이트...');
      const taskStartedAt = Date.now();
      gurusResult = await safe(() => retryWithBackoff('Task C', () => runGuruInsightsAnalysis(lang)));
      await logTaskMetric('C', taskStartedAt, gurusResult);
      await sleep(delayMs);
    }
    if (shouldRunSplitOnly('C1')) {
      console.log('[Task C1] 시작: 투자 거장 인사이트 전반부...');
      const taskStartedAt = Date.now();
      gurusResultC1 = await safe(() => retryWithBackoff('Task C1', () => runGuruInsightsAnalysisSubset(0, 5, lang, true)));
      await logTaskMetric('C1', taskStartedAt, gurusResultC1);
      await sleep(delayMs);
    }
    if (shouldRunSplitOnly('C2')) {
      console.log('[Task C2] 시작: 투자 거장 인사이트 후반부...');
      const taskStartedAt = Date.now();
      gurusResultC2 = await safe(() => retryWithBackoff('Task C2', () => runGuruInsightsAnalysisSubset(5, GURU_LIST.length, lang, true)));
      await logTaskMetric('C2', taskStartedAt, gurusResultC2);
      await sleep(delayMs);
    }

    // Task E-1: 예측 질문 생성 (Gemini) — ★ 각 언어 = 독립 서버
    if (shouldRun('E') || shouldRun('E1') || shouldRun('E-1')) {
      console.log('[Task E-1] 시작: 예측 질문 생성 (모든 언어)...');
      const taskStartedAt = Date.now();
      // 각 언어 서버에 독립적으로 폴 생성 (ko, en, ja)
      const predictionLangs = ['ko', 'en', 'ja'];
      const predictionResults = [];
      for (const predLang of predictionLangs) {
        console.log(`[Task E-1] ${predLang} 서버 질문 생성...`);
        const result = await safe(() => retryWithBackoff(`Task E-1 (${predLang})`, () => generatePredictionPolls(predLang)));
        predictionResults.push({ lang: predLang, result });
        await sleep(1000); // Gemini rate limit 방지
      }
      predictionsResult = predictionResults[0]?.result; // 메트릭용 (ko 결과)
      await logTaskMetric('E-1', taskStartedAt, predictionsResult);
      await sleep(delayMs);
    }

    // Task E-2: 예측 정답 판정 (Gemini) — ★ 재시도 적용
    if (shouldRun('E') || shouldRun('E2') || shouldRun('E-2')) {
      console.log('[Task E-2] 시작: 예측 정답 판정...');
      const taskStartedAt = Date.now();
      resolveResult = await safe(() => retryWithBackoff('Task E-2', resolvePredictionPolls));
      await logTaskMetric('E-2', taskStartedAt, resolveResult);
      await sleep(delayMs);
    }

    // Task G: 맥락 카드 생성 (Gemini) — ★ 각 언어 = 독립 서버
    if (shouldRun('G')) {
      console.log('[Task G] 시작: 맥락 카드 생성 (모든 언어)...');
      const taskStartedAt = Date.now();
      const contextLangs = ['ko', 'en', 'ja'];
      const contextResults = [];
      for (const ctxLang of contextLangs) {
        console.log(`[Task G] ${ctxLang} 서버 맥락 카드 생성...`);
        const result = await safe(() => retryWithBackoff(`Task G (${ctxLang})`, () => runContextCardGeneration(timeSlot, ctxLang)));
        contextResults.push({ lang: ctxLang, result });
        await sleep(1000); // Gemini rate limit 방지
      }
      contextCardResult = contextResults[0]?.result; // 메트릭용 (ko 결과)
      await logTaskMetric('G', taskStartedAt, contextCardResult);
      await sleep(delayMs);
    }

    // Task F: 부동산 시세 업데이트 (국토부 API, 옵셔널) — ★ 재시도 적용
    if (shouldRun('F')) {
      console.log('[Task F] 시작: 부동산 시세...');
      const taskStartedAt = Date.now();
      realEstateResult = await safe(() => retryWithBackoff('Task F', updateRealEstatePrices));
      await logTaskMetric('F', taskStartedAt, realEstateResult);
      await sleep(delayMs);
    }

    // Task H: 위기 알림 감지 (Gemini + Search) — ★ 재시도 적용
    if (shouldRun('H')) {
      console.log('[Task H] 시작: 위기 알림 감지...');
      const taskStartedAt = Date.now();
      crisisResult = await safe(() => retryWithBackoff('Task H', () => checkCrisisAlert(lang)));
      await logTaskMetric('H', taskStartedAt, crisisResult);
    }

    // Task J: 실시간 뉴스 수집 (RSS + Gemini 태깅) — ★ 재시도 적용
    if (shouldRun('J')) {
      console.log('[Task J] 시작: 뉴스 수집...');
      const taskStartedAt = Date.now();
      newsResult = await safe(() => retryWithBackoff('Task J', () => runNewsCollection(lang)));
      await logTaskMetric('J', taskStartedAt, newsResult);
      await sleep(delayMs);
    }

    // Task K: Polymarket 예측 시장 수집 (Gamma API + Gemini 번역/분석) — ★ 재시도 적용
    if (shouldRun('K')) {
      console.log('[Task K] 시작: Polymarket 예측 시장 수집...');
      const taskStartedAt = Date.now();
      polymarketResult = await safe(() => retryWithBackoff('Task K', () => runPolymarketCollection(lang)));
      await logTaskMetric('K', taskStartedAt, polymarketResult);
      await sleep(delayMs);
    }

    // Task I: 코스톨라니 국면 감지 (주 1회 — 매주 월요일 자동 실행)
    const todayKST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const isMonday = todayKST.getDay() === 1;
    let kostolalyResult: TaskResult<any> = null;
    if (shouldRun('I') || (runAll && isMonday)) {
      console.log('[Task I] 시작: 코스톨라니 국면 감지 (주 1회)...');
      const taskStartedAt = Date.now();
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
      await logTaskMetric('I', taskStartedAt, kostolalyResult);
    } else if (runLogId && runAll) {
      await logDailyBriefingTaskRun({
        runId: runLogId,
        taskKey: 'I',
        status: 'SKIPPED',
        elapsedMs: 0,
        resultSummary: { reason: 'weekly_schedule_only_monday' },
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

    const st = (r: TaskResult<any>) => !r ? 'SKIPPED' : r.status === 'fulfilled' ? 'SUCCESS' : 'FAILED';
    const val = <T>(r: TaskResult<any>, getter: (v: any) => T, fallback: T): T =>
      r?.status === 'fulfilled' ? getter(r.value) : fallback;

    const aggregateStatus = (results: TaskResult<any>[]) => {
      const present = results.filter((result): result is Exclude<TaskResult<any>, null> => Boolean(result));
      if (present.length === 0) return 'SKIPPED';
      if (present.some((result) => result.status === 'rejected')) return 'FAILED';
      return 'SUCCESS';
    };

    const aggregateFulfilledCount = (results: TaskResult<any>[], getter: (value: any) => number) => {
      return results.reduce((sum, result) => {
        if (!result || result.status !== 'fulfilled') return sum;
        const nextValue = getter(result.value);
        return sum + (Number.isFinite(nextValue) ? nextValue : 0);
      }, 0);
    };

    const splitStockResults = [stocksResultB1, stocksResultB2];
    const splitGuruResults = [gurusResultC1, gurusResultC2];
    const combinedStocksStatus = shouldRun('B')
      ? st(stocksResult)
      : aggregateStatus(splitStockResults);
    const combinedStocksCount = shouldRun('B')
      ? val(stocksResult, v => v.length, 0)
      : aggregateFulfilledCount(splitStockResults, (v) => v.length);
    const combinedGurusStatus = shouldRun('C')
      ? st(gurusResult)
      : aggregateStatus(splitGuruResults);
    const combinedGurusCount = shouldRun('C')
      ? val(gurusResult, v => v.count, 0)
      : aggregateFulfilledCount(splitGuruResults, (v) => v.count);

    logTask('Task A', macroResult, () => '성공: 거시경제 & 비트코인 분석 완료');
    logTask('Task B', stocksResult, v => `성공: 종목 분석 ${v.length}/${STOCK_LIST.length}건 완료`);
    logTask('Task C', gurusResult, v => `성공: 투자 거장 ${v.count}/10명 분석 완료`);
    if (!shouldRun('B') && (shouldRunSplitOnly('B1') || shouldRunSplitOnly('B2'))) {
      console.log(`[Task B] 분할 실행 집계: ${combinedStocksStatus} (${combinedStocksCount}/${STOCK_LIST.length})`);
    }
    if (!shouldRun('C') && (shouldRunSplitOnly('C1') || shouldRunSplitOnly('C2'))) {
      console.log(`[Task C] 분할 실행 집계: ${combinedGurusStatus} (${combinedGurusCount}/${GURU_LIST.length})`);
    }
    logTask('Task D', snapshotsResult, v => `성공: 스냅샷 ${v.snapshotsCreated}/${v.totalUsers}명, 구간별 통계 ${v.bracketsUpdated}개`);
    logTask('Task E-1', predictionsResult, v => v.skipped ? '스킵 (이미 생성됨)' : `성공: 예측 질문 ${v.created}개 생성`);
    logTask('Task E-2', resolveResult, v => `성공: 예측 판정 ${v.resolved}건 해결, ${v.deferred}건 보류`);
    logTask('Task F', realEstateResult, v => v.skipped ? '스킵 (API 키 미설정)' : `성공: 캐시 ${v.cacheUpdated}건, 포트폴리오 ${v.assetsUpdated}건 업데이트`);
    logTask('Task G', contextCardResult, v => `성공: 맥락 카드 생성 (${v.sentiment}), ${v.usersCalculated}명 영향도 계산 (평균 ${v.avgImpact}%)`);
    logTask('Task H', crisisResult, v => v.crisisDetected ? `위기 감지: ${v.alertsCreated}건 알림 생성` : `정상 — 위기 미감지 (${v.marketsChecked.length}개 시장 확인)`);
    logTask('Task I', kostolalyResult, v => `코스톨라니 국면: ${v.action} — ${v.phase ?? v.newPhase ?? ''}`);
    logTask(
      'Task J',
      newsResult,
      (v) => `성공: 뉴스 ${v.totalFetched}건 수집, ${v.totalUpserted}건 저장, ${v.totalDeleted}건 삭제, 금지소스 ${v.totalPurged}건 정리 (AI ${v.aiTagged}건/저비용 ${v.fallbackTagged}건, 품질 ${v.avgQualityScore})`
    );
    logTask(
      'Task K',
      polymarketResult,
      (v) => `성공: Polymarket ${v.totalFetched}건 수집, ${v.totalProcessed}건 처리, ${v.totalUpserted}건 저장, ${v.totalCleaned}건 정리 (AI ${v.aiProcessed}건/폴백 ${v.fallbackProcessed}건)`
    );

    // ========================================================================
    // 응답 생성
    // ========================================================================

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    const summary: Record<string, any> = {};
    if (shouldRun('A')) summary.macro = { status: st(macroResult) };
    if (shouldRun('B') || shouldRunSplitOnly('B1') || shouldRunSplitOnly('B2')) summary.stocks = { status: combinedStocksStatus, count: combinedStocksCount };
    if (shouldRun('C') || shouldRunSplitOnly('C1') || shouldRunSplitOnly('C2')) summary.gurus = { status: combinedGurusStatus, count: `${combinedGurusCount}/10` };
    if (shouldRun('D')) summary.snapshots = { status: st(snapshotsResult), count: val(snapshotsResult, v => v.snapshotsCreated, 0) };
    if (shouldRun('E') || shouldRun('E1') || shouldRun('E-1')) summary.predictions = { status: st(predictionsResult), created: val(predictionsResult, v => v.created, 0) };
    if (shouldRun('E') || shouldRun('E2') || shouldRun('E-2')) summary.resolve = { status: st(resolveResult), resolved: val(resolveResult, v => v.resolved, 0) };
    if (shouldRun('F')) summary.realEstate = { status: st(realEstateResult), updated: val(realEstateResult, v => v.assetsUpdated, 0) };
    if (shouldRun('G')) summary.contextCard = { status: st(contextCardResult), sentiment: val(contextCardResult, v => v.sentiment, 'N/A'), users: val(contextCardResult, v => v.usersCalculated, 0) };
    if (shouldRun('H')) summary.crisisAlert = { status: st(crisisResult), detected: val(crisisResult, v => v.crisisDetected, false) };
    if (shouldRun('I') || (runAll && isMonday)) summary.kostolany = { status: st(kostolalyResult) };
    if (shouldRun('J')) {
      summary.news = {
        status: st(newsResult),
        fetched: val(newsResult, (v) => v.totalFetched, 0),
        upserted: val(newsResult, (v) => v.totalUpserted, 0),
        purged: val(newsResult, (v) => v.totalPurged, 0),
        aiTagged: val(newsResult, (v) => v.aiTagged, 0),
        fallbackTagged: val(newsResult, (v) => v.fallbackTagged, 0),
        avgQualityScore: val(newsResult, (v) => v.avgQualityScore, 0),
        upsertErrorSample: val(newsResult, (v) => v.upsertErrorSample ?? [], [] as string[]),
      };
    }
    if (shouldRun('K')) {
      summary.polymarket = {
        status: st(polymarketResult),
        fetched: val(polymarketResult, (v) => v.totalFetched, 0),
        processed: val(polymarketResult, (v) => v.totalProcessed, 0),
        upserted: val(polymarketResult, (v) => v.totalUpserted, 0),
        cleaned: val(polymarketResult, (v) => v.totalCleaned, 0),
        aiProcessed: val(polymarketResult, (v) => v.aiProcessed, 0),
        fallbackProcessed: val(polymarketResult, (v) => v.fallbackProcessed, 0),
        categoryBreakdown: val(polymarketResult, (v) => v.categoryBreakdown, {}),
      };
    }

    const selectedResults = [
      snapshotsResult,
      macroResult,
      stocksResult,
      stocksResultB1,
      stocksResultB2,
      gurusResult,
      gurusResultC1,
      gurusResultC2,
      predictionsResult,
      resolveResult,
      contextCardResult,
      realEstateResult,
      crisisResult,
      kostolalyResult,
      newsResult,
      polymarketResult,
    ].filter((r) => r !== null) as Array<{ status: 'fulfilled' | 'rejected'; value?: unknown; reason?: unknown }>;

    const failedCount = selectedResults.filter((r) => r.status === 'rejected').length;
    const successCount = selectedResults.filter((r) => r.status === 'fulfilled').length;
    const runStatus = failedCount === 0 ? 'SUCCESS' : successCount > 0 ? 'PARTIAL' : 'FAILED';

    await finalizeDailyBriefingRun(
      runLogId,
      runStatus,
      Date.now() - startTime,
      summary,
      failedCount > 0 ? `${failedCount} tasks failed` : undefined
    );

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
    await finalizeDailyBriefingRun(
      runLogId,
      'FAILED',
      Date.now() - startTime,
      {},
      error instanceof Error ? error.message : 'Unknown error'
    );

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
