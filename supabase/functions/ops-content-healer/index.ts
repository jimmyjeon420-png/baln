import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const INTERNAL_FUNCTION_JWT = (Deno.env.get('INTERNAL_FUNCTION_JWT') ?? '').trim();
const OPS_HEALER_TOKEN = (Deno.env.get('OPS_HEALER_TOKEN') ?? '').trim();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ops-token',
};

const MAIN_TASKS = ['A', 'B', 'C', 'D', 'E', 'F', 'H', 'I'];
const NEWS_TASKS = ['J'];
const PREDICTION_RESOLVE_TASKS = ['E2'];

const NEWS_STALE_MS = 45 * 60 * 1000;
const NEWS_RUN_COOLDOWN_MS = 20 * 60 * 1000;
const MAIN_RUN_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const CONTEXT_RUN_COOLDOWN_MS = 60 * 60 * 1000;
const PREDICTION_GENERATE_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const PREDICTION_RESOLVE_COOLDOWN_MS = 45 * 60 * 1000;
const EDGE_FUNCTION_TIMEOUT_MS = 90_000; // 90s — Supabase wall clock (~150s) 내 복수 호출 가능하도록

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

type DailyBriefingRun = {
  id: string;
  status: 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  started_at: string;
  selected_tasks: string[];
  trigger_source: string;
};

type EdgeTaskLog = {
  id: string;
  task_name: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  executed_at: string;
};

type ActionResult = {
  id: string;
  status: 'healthy' | 'triggered' | 'skipped' | 'failed';
  detail: string;
  httpStatus?: number;
  payload?: unknown;
};

const FUNCTION_INVOKE_KEY = INTERNAL_FUNCTION_JWT || SUPABASE_ANON_KEY || '';

function response(status: number, body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  try {
    return JSON.parse(JSON.stringify(error));
  } catch {
    return { message: String(error) };
  }
}

function nowKstParts(now = new Date()) {
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000;
  const kst = new Date(kstMs);
  const date = kst.toISOString().slice(0, 10);
  const hour = Number(kst.toISOString().slice(11, 13));
  const slotHour = Math.floor(hour / 3) * 3;
  const slot = `h${String(slotHour).padStart(2, '0')}`;
  return { nowIso: now.toISOString(), date, hour, slot };
}

function getKstDayBounds(date: string) {
  const startUtc = new Date(`${date}T00:00:00+09:00`);
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
  return {
    startIso: startUtc.toISOString(),
    endIso: endUtc.toISOString(),
  };
}

function includesAll(source: string[] | null | undefined, target: string[]) {
  if (!Array.isArray(source)) return false;
  const set = new Set(source.map((value) => String(value).toUpperCase()));
  return target.every((value) => set.has(value));
}

function isRecentRun(run: DailyBriefingRun | null, cooldownMs: number) {
  if (!run?.started_at) return false;
  const startedMs = new Date(run.started_at).getTime();
  return Number.isFinite(startedMs) && Date.now() - startedMs < cooldownMs;
}

function isRecentTaskLog(log: EdgeTaskLog | null, cooldownMs: number) {
  if (!log?.executed_at) return false;
  const executedMs = new Date(log.executed_at).getTime();
  return Number.isFinite(executedMs) && Date.now() - executedMs < cooldownMs;
}

async function readResponseBody(res: Response) {
  try {
    return (await res.text()).trim();
  } catch {
    return '';
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function invokeFunction(path: string, body: Record<string, unknown>) {
  if (!FUNCTION_INVOKE_KEY) {
    throw new Error('Edge Function invoke key is not configured');
  }

  try {
    const res = await fetchWithTimeout(`${SUPABASE_URL}/functions/v1/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FUNCTION_INVOKE_KEY}`,
        apikey: FUNCTION_INVOKE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }, EDGE_FUNCTION_TIMEOUT_MS);

    const raw = await readResponseBody(res);
    let parsed: unknown = raw;
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = raw;
      }
    }

    return {
      ok: res.ok,
      status: res.status,
      body: parsed,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      status: 504,
      body: {
        error: 'Invoke failed',
        message,
        path,
      },
    };
  }
}

async function loadLatestRun(limit = 30) {
  const { data, error } = await supabase
    .from('daily_briefing_runs')
    .select('id,status,started_at,selected_tasks,trigger_source')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error && error.code === 'PGRST205') return [];
  if (error) throw error;
  return (data ?? []) as DailyBriefingRun[];
}

async function loadLatestTaskLog(taskName: string) {
  const { data, error } = await supabase
    .from('edge_function_logs')
    .select('id,task_name,status,executed_at')
    .eq('task_name', taskName)
    .order('executed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as EdgeTaskLog | null;
}

async function hasGuruInsightsForDate(date: string) {
  const { count, error } = await supabase
    .from('guru_insights')
    .select('date', { count: 'exact', head: true })
    .eq('date', date);

  if (error) throw error;
  return (count ?? 0) > 0;
}

async function getNewsFreshness(category: 'stock' | 'crypto' | 'macro') {
  const { data, error } = await supabase
    .from('market_news')
    .select('id,published_at,title,source_name')
    .eq('category', category)
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.published_at) {
    return { missing: true, ageMs: null, preview: 'latest record missing' };
  }

  const publishedMs = new Date(data.published_at).getTime();
  return {
    missing: false,
    ageMs: Number.isFinite(publishedMs) ? Date.now() - publishedMs : null,
    preview: `${data.published_at} ${String(data.title ?? '').slice(0, 80)}`.trim(),
  };
}

async function getContextSlotState(date: string, slot: string) {
  const { data, error } = await supabase
    .from('context_cards')
    .select('id,date,time_slot,created_at,headline')
    .eq('date', date)
    .eq('time_slot', slot)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.created_at) {
    return { missing: true, ageMs: null, preview: `slot ${slot} missing` };
  }

  const createdMs = new Date(data.created_at).getTime();
  return {
    missing: false,
    ageMs: Number.isFinite(createdMs) ? Date.now() - createdMs : null,
    preview: `${data.created_at} ${String(data.headline ?? '').slice(0, 80)}`.trim(),
  };
}

async function getTodayPredictionState(date: string) {
  const { startIso, endIso } = getKstDayBounds(date);

  const [todayResult, expiredResult] = await Promise.all([
    supabase
      .from('prediction_polls')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startIso)
      .lt('created_at', endIso),
    supabase
      .from('prediction_polls')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('deadline', new Date().toISOString()),
  ]);

  if (todayResult.error) throw todayResult.error;
  if (expiredResult.error) throw expiredResult.error;

  return {
    todayCount: todayResult.count ?? 0,
    expiredActiveCount: expiredResult.count ?? 0,
  };
}

function findLatestRun(runs: DailyBriefingRun[], matcher: (run: DailyBriefingRun) => boolean) {
  return runs.find(matcher) ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let requestBody: Record<string, unknown> = {};
  try {
    requestBody = await req.clone().json();
  } catch {
    requestBody = {};
  }

  const requestUrl = new URL(req.url);
  const mode = String(requestBody.mode ?? requestUrl.searchParams.get('mode') ?? 'heal').toLowerCase();
  const dryRun = mode === 'status' || requestBody.dry_run === true || requestBody.dryRun === true;

  const suppliedToken = req.headers.get('x-ops-token')?.trim()
    || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    || '';

  if (!OPS_HEALER_TOKEN || !suppliedToken || suppliedToken !== OPS_HEALER_TOKEN) {
    return response(401, {
      ok: false,
      error: 'Unauthorized',
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FUNCTION_INVOKE_KEY) {
    console.error('[ops-content-healer] Missing required function secrets', {
      hasUrl: Boolean(SUPABASE_URL),
      hasServiceRole: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      hasAnon: Boolean(SUPABASE_ANON_KEY),
      hasInternalJwt: Boolean(INTERNAL_FUNCTION_JWT),
      hasInvokeKey: Boolean(FUNCTION_INVOKE_KEY),
      hasOpsToken: Boolean(OPS_HEALER_TOKEN),
    });

    return response(500, {
      ok: false,
      error: 'Missing required function secrets',
    });
  }

  const { date, hour, slot, nowIso } = nowKstParts();

  try {
    const [runs, stockNews, cryptoNews, macroNews, contextSlot, predictions] = await Promise.all([
      loadLatestRun(),
      getNewsFreshness('stock'),
      getNewsFreshness('crypto'),
      getNewsFreshness('macro'),
      getContextSlotState(date, slot),
      getTodayPredictionState(date),
    ]);

    const [latestNewsLog, latestContextLog, latestPredictionGenerateLog, latestPredictionResolveLog, latestGuruLog, mainDataHealthy] = await Promise.all([
      loadLatestTaskLog('news_collection'),
      loadLatestTaskLog('context_card'),
      loadLatestTaskLog('predictions'),
      loadLatestTaskLog('resolve'),
      loadLatestTaskLog('gurus'),
      hasGuruInsightsForDate(date),
    ]);

    const latestMainRun = findLatestRun(runs, (run) => includesAll(run.selected_tasks, MAIN_TASKS));
    const latestNewsRun = findLatestRun(runs, (run) => includesAll(run.selected_tasks, NEWS_TASKS));
    const latestPredictionGenerateRun = findLatestRun(runs, (run) => run.selected_tasks?.some((task) => ['E', 'E1', 'E-1'].includes(task)));
    const latestPredictionResolveRun = findLatestRun(runs, (run) => includesAll(run.selected_tasks, PREDICTION_RESOLVE_TASKS));

    const actions: ActionResult[] = [];
    const newsAgeMax = [stockNews.ageMs, cryptoNews.ageMs, macroNews.ageMs]
      .filter((value): value is number => typeof value === 'number')
      .reduce((max, value) => Math.max(max, value), 0);
    const newsMissing = stockNews.missing || cryptoNews.missing || macroNews.missing;
    const shouldRunNews = newsMissing || newsAgeMax > NEWS_STALE_MS;

    const newsCooldownActive = isRecentRun(latestNewsRun, NEWS_RUN_COOLDOWN_MS) || isRecentTaskLog(latestNewsLog, NEWS_RUN_COOLDOWN_MS);

    if (shouldRunNews && !newsCooldownActive) {
      if (dryRun) {
        actions.push({
          id: 'news',
          status: 'skipped',
          detail: `Dry-run: would trigger Task J because news was stale/missing (maxAgeMs=${newsAgeMax || 'n/a'})`,
        });
      } else {
        const result = await invokeFunction('daily-briefing', {
          tasks: 'J',
          lang: 'ko',
          trigger_source: 'ops-healer-news',
        });
        actions.push({
          id: 'news',
          status: result.ok ? 'triggered' : 'failed',
          detail: result.ok
            ? `Triggered Task J because news was stale/missing (maxAgeMs=${newsAgeMax || 'n/a'})`
            : `Task J trigger failed`,
          httpStatus: result.status,
          payload: result.body,
        });
      }
    } else {
      actions.push({
        id: 'news',
        status: shouldRunNews ? 'skipped' : 'healthy',
        detail: shouldRunNews
          ? `News needed refresh but latest attempt is within cooldown (${latestNewsRun?.started_at ?? latestNewsLog?.executed_at ?? 'none'})`
          : `Fresh enough: stock=${stockNews.preview}, crypto=${cryptoNews.preview}, macro=${macroNews.preview}`,
      });
    }

    const mainHealthy = (
      latestMainRun?.status === 'SUCCESS'
      && typeof latestMainRun.started_at === 'string'
      && latestMainRun.started_at >= getKstDayBounds(date).startIso
    ) || mainDataHealthy;
    const shouldRunMain = hour >= 6 && !mainHealthy;
    const mainCooldownActive = isRecentRun(latestMainRun, MAIN_RUN_COOLDOWN_MS) || isRecentTaskLog(latestGuruLog, MAIN_RUN_COOLDOWN_MS);

    if (shouldRunMain && !mainCooldownActive) {
      actions.push({
        id: 'main',
        status: 'skipped',
        detail: dryRun
          ? `Dry-run: main daily refresh is missing and should be recovered by the split scheduler`
          : `Main combined run is intentionally disabled in ops-content-healer to avoid WORKER_LIMIT; split scheduler owns recovery`,
      });
    } else {
      actions.push({
        id: 'main',
        status: shouldRunMain ? 'skipped' : 'healthy',
        detail: shouldRunMain
          ? `Main run still missing, but cooldown active from ${latestMainRun?.started_at ?? latestGuruLog?.executed_at ?? 'none'}`
          : `Today's main run is healthy (${latestMainRun?.started_at ?? latestGuruLog?.executed_at ?? 'n/a'})`,
      });
    }

    const shouldRunContext = contextSlot.missing || (typeof contextSlot.ageMs === 'number' && contextSlot.ageMs > 4 * 60 * 60 * 1000);
    const latestContextRun = findLatestRun(runs, (run) => run.trigger_source?.includes('context-card') || run.selected_tasks?.includes('G'));
    const contextCooldownActive = isRecentRun(latestContextRun, CONTEXT_RUN_COOLDOWN_MS) || isRecentTaskLog(latestContextLog, CONTEXT_RUN_COOLDOWN_MS);

    if (shouldRunContext && !contextCooldownActive) {
      if (dryRun) {
        actions.push({
          id: 'context',
          status: 'skipped',
          detail: `Dry-run: would trigger context-card generation for ${date}/${slot}`,
        });
      } else {
        const result = await invokeFunction('generate-context-card', {
          lang: 'ko',
          trigger_source: 'ops-healer-context',
          time_slot: slot,
        });
        actions.push({
          id: 'context',
          status: result.ok ? 'triggered' : 'failed',
          detail: result.ok
            ? `Triggered context-card generation for ${date}/${slot}`
            : `Context-card trigger failed for ${date}/${slot}`,
          httpStatus: result.status,
          payload: result.body,
        });
      }
    } else {
      actions.push({
        id: 'context',
        status: shouldRunContext ? 'skipped' : 'healthy',
        detail: shouldRunContext
          ? `Context slot ${slot} still stale/missing, but cooldown active from ${latestContextRun?.started_at ?? latestContextLog?.executed_at ?? 'none'}`
          : `Current slot ${slot} is healthy (${contextSlot.preview})`,
      });
    }

    const shouldGeneratePredictions = hour >= 6 && predictions.todayCount < 3;
    const predictionGenerateCooldownActive = isRecentRun(latestPredictionGenerateRun, PREDICTION_GENERATE_COOLDOWN_MS)
      || isRecentTaskLog(latestPredictionGenerateLog, PREDICTION_GENERATE_COOLDOWN_MS);

    if (shouldGeneratePredictions && !predictionGenerateCooldownActive) {
      if (dryRun) {
        actions.push({
          id: 'predictions-generate',
          status: 'skipped',
          detail: `Dry-run: would trigger prediction generation because today's count=${predictions.todayCount}`,
        });
      } else {
        const result = await invokeFunction('daily-briefing', {
          tasks: 'E',
          lang: 'ko',
          trigger_source: 'ops-healer-predictions',
        });
        actions.push({
          id: 'predictions-generate',
          status: result.ok ? 'triggered' : 'failed',
          detail: result.ok
            ? `Triggered prediction generation because today's count=${predictions.todayCount}`
            : 'Prediction generation trigger failed',
          httpStatus: result.status,
          payload: result.body,
        });
      }
    } else {
      actions.push({
        id: 'predictions-generate',
        status: shouldGeneratePredictions ? 'skipped' : 'healthy',
        detail: shouldGeneratePredictions
          ? `Prediction generation still needed, but cooldown active from ${latestPredictionGenerateRun?.started_at ?? latestPredictionGenerateLog?.executed_at ?? 'none'}`
          : `Today's predictions are healthy (count=${predictions.todayCount})`,
      });
    }

    const shouldResolvePredictions = predictions.expiredActiveCount > 0;
    const predictionResolveCooldownActive = isRecentRun(latestPredictionResolveRun, PREDICTION_RESOLVE_COOLDOWN_MS)
      || isRecentTaskLog(latestPredictionResolveLog, PREDICTION_RESOLVE_COOLDOWN_MS);

    if (shouldResolvePredictions && !predictionResolveCooldownActive) {
      if (dryRun) {
        actions.push({
          id: 'predictions-resolve',
          status: 'skipped',
          detail: `Dry-run: would trigger prediction resolve because expired active polls=${predictions.expiredActiveCount}`,
        });
      } else {
        const result = await invokeFunction('daily-briefing', {
          tasks: ['E2'],
          lang: 'ko',
          trigger_source: 'ops-healer-prediction-resolve',
        });
        actions.push({
          id: 'predictions-resolve',
          status: result.ok ? 'triggered' : 'failed',
          detail: result.ok
            ? `Triggered prediction resolve because expired active polls=${predictions.expiredActiveCount}`
            : 'Prediction resolve trigger failed',
          httpStatus: result.status,
          payload: result.body,
        });
      }
    } else {
      actions.push({
        id: 'predictions-resolve',
        status: shouldResolvePredictions ? 'skipped' : 'healthy',
        detail: shouldResolvePredictions
          ? `Prediction resolve still needed, but cooldown active from ${latestPredictionResolveRun?.started_at ?? latestPredictionResolveLog?.executed_at ?? 'none'}`
          : `No expired active predictions (${predictions.expiredActiveCount})`,
      });
    }

    const failures = actions.filter((item) => item.status === 'failed');

    return response(failures.length > 0 ? 500 : 200, {
      ok: failures.length === 0,
      mode,
      checkedAt: nowIso,
      kst: { date, hour, slot },
      health: {
        news: {
          stock: stockNews,
          crypto: cryptoNews,
          macro: macroNews,
        },
        context: contextSlot,
        predictions,
        latestRuns: {
          main: latestMainRun,
          news: latestNewsRun,
          predictionGenerate: latestPredictionGenerateRun,
          predictionResolve: latestPredictionResolveRun,
        },
        latestTaskLogs: {
          gurus: latestGuruLog,
          newsCollection: latestNewsLog,
          contextCard: latestContextLog,
          predictions: latestPredictionGenerateLog,
          resolve: latestPredictionResolveLog,
        },
      },
      actions,
    });
  } catch (error) {
    return response(500, {
      ok: false,
      error: serializeError(error),
      checkedAt: nowIso,
    });
  }
});
