#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  fetchWithTimeout,
  formatAge,
  getSupabaseConfig,
  getOpsHealerToken,
  readResponseBody,
  withRetry,
} = require('./lib/qaRuntime');

const projectRoot = process.cwd();
const reportDir = path.join(projectRoot, 'reports', 'operations');
const reportJsonPath = path.join(reportDir, 'latest.json');
const reportMdPath = path.join(reportDir, 'latest.md');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = getSupabaseConfig(projectRoot);
const OPS_HEALER_TOKEN = getOpsHealerToken(projectRoot);
const OPS_HEALER_URL = `${SUPABASE_URL}/functions/v1/ops-content-healer`;

const targets = [
  {
    id: 'market-news-stock',
    label: '주식 뉴스 신선도',
    table: 'market_news',
    timeField: 'published_at',
    select: 'id,title,published_at,source_name,category',
    filters: { category: 'stock' },
    warningMs: 90 * 60 * 1000,
    failMs: 6 * 60 * 60 * 1000,
    blocking: true,
  },
  {
    id: 'market-news-crypto',
    label: '암호화폐 뉴스 신선도',
    table: 'market_news',
    timeField: 'published_at',
    select: 'id,title,published_at,source_name,category',
    filters: { category: 'crypto' },
    warningMs: 90 * 60 * 1000,
    failMs: 6 * 60 * 60 * 1000,
    blocking: true,
  },
  {
    id: 'market-news-macro',
    label: '거시경제 뉴스 신선도',
    table: 'market_news',
    timeField: 'published_at',
    select: 'id,title,published_at,source_name,category',
    filters: { category: 'macro' },
    warningMs: 90 * 60 * 1000,
    failMs: 6 * 60 * 60 * 1000,
    blocking: true,
  },
  {
    id: 'context-cards',
    label: '맥락 카드 신선도',
    table: 'context_cards',
    timeField: 'created_at',
    select: 'id,date,headline,created_at',
    filters: {},
    warningMs: 6 * 60 * 60 * 1000,
    failMs: 18 * 60 * 60 * 1000,
    blocking: true,
  },
  {
    id: 'prediction-polls',
    label: '예측 콘텐츠 신선도',
    table: 'prediction_polls',
    timeField: 'created_at',
    select: 'id,question,created_at,status,deadline',
    filters: {},
    warningMs: 24 * 60 * 60 * 1000,
    failMs: 72 * 60 * 60 * 1000,
    blocking: false,
  },
];

function buildRestUrl(target) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${target.table}`);
  url.searchParams.set('select', target.select);
  url.searchParams.set('order', `${target.timeField}.desc.nullslast`);
  url.searchParams.set('limit', '1');

  for (const [field, value] of Object.entries(target.filters)) {
    url.searchParams.set(field, `eq.${value}`);
  }

  return url.toString();
}

function getKstContext(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const hour = Number(kst.toISOString().slice(11, 13));
  const day = kst.getUTCDay(); // 0=Sun, 6=Sat after KST shift
  const isWeekend = day === 0 || day === 6;
  const isOffHours = hour < 6 || hour >= 22;
  return { hour, isWeekend, isOffHours };
}

function getThresholds(target) {
  if (target.id === 'market-news-stock' || target.id === 'market-news-macro') {
    const { isWeekend, isOffHours } = getKstContext();
    if (isWeekend || isOffHours) {
      return {
        warningMs: 6 * 60 * 60 * 1000,
        failMs: 18 * 60 * 60 * 1000,
      };
    }
  }

  return {
    warningMs: target.warningMs,
    failMs: target.failMs,
  };
}

let healerSnapshotPromise = null;

async function fetchHealerSnapshot() {
  if (!OPS_HEALER_TOKEN) return null;
  if (healerSnapshotPromise) return healerSnapshotPromise;

  healerSnapshotPromise = withRetry('ops-content-healer status', async () => {
    const response = await fetchWithTimeout(OPS_HEALER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ops-token': OPS_HEALER_TOKEN,
      },
      body: JSON.stringify({
        mode: 'status',
        source: 'content-freshness-check',
      }),
    }, 30000);

    const bodyText = await readResponseBody(response);
    if (!response.ok) {
      throw new Error(`ops-content-healer returned ${response.status}${bodyText ? ` body=${bodyText.slice(0, 240)}` : ''}`);
    }

    try {
      return bodyText ? JSON.parse(bodyText) : {};
    } catch (error) {
      throw new Error(`ops-content-healer invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  return healerSnapshotPromise;
}

function renderRecordPreview(target, record) {
  if (!record) return 'record=none';

  const previewField = target.table === 'context_cards'
    ? 'headline'
    : target.table === 'prediction_polls'
      ? 'question'
      : 'title';

  const preview = typeof record[previewField] === 'string'
    ? record[previewField].replace(/\s+/g, ' ').trim().slice(0, 120)
    : 'n/a';

  return `${target.timeField}=${record[target.timeField]} preview=${preview}`;
}

function renderMarkdown(results) {
  const generatedAt = new Date().toISOString();
  const blockingFailures = results.filter((item) => item.blocking && item.status === 'failed');
  const warnings = results.filter((item) => item.status === 'warning');
  const overall = blockingFailures.length === 0 ? 'PASS' : 'FAIL';

  const lines = [];
  lines.push('# Operations Freshness Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt}`);
  lines.push(`- Overall status: **${overall}**`);
  lines.push(`- Blocking failures: **${blockingFailures.length}**`);
  lines.push(`- Warnings: **${warnings.length}**`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');

  for (const result of results) {
    const badge = result.status === 'passed' ? 'PASS' : result.status === 'warning' ? 'WARN' : 'FAIL';
    lines.push(`- ${badge} ${result.label}${result.blocking ? ' (blocking)' : ''}`);
  }

  lines.push('');
  lines.push('## Details');
  lines.push('');

  for (const result of results) {
    const badge = result.status === 'passed' ? 'PASS' : result.status === 'warning' ? 'WARN' : 'FAIL';
    lines.push(`### ${badge} ${result.label}`);
    lines.push('');
    lines.push(`- Blocking: ${result.blocking ? 'yes' : 'no'}`);
    lines.push(`- Table: \`${result.table}\``);
    if (typeof result.ageMs === 'number') {
      lines.push(`- Age: ${formatAge(result.ageMs)}`);
    }
    if (result.detail) {
      lines.push(`- Detail: ${result.detail}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function fetchLatestRecord(target) {
  if (target.id === 'prediction-polls') {
    const snapshot = await fetchHealerSnapshot();
    const { hour } = getKstContext();

    if (!snapshot) {
      return {
        status: 'warning',
        ageMs: null,
        detail: 'ops healer token missing; prediction freshness check downgraded',
        table: target.table,
      };
    }

    const todayCount = Number(snapshot?.health?.predictions?.todayCount ?? 0);
    const latestLog = snapshot?.health?.latestTaskLogs?.predictions;
    const latestRun = snapshot?.health?.latestRuns?.predictionGenerate;
    const latestIso = latestLog?.executed_at || latestRun?.started_at || null;
    const latestMs = latestIso ? new Date(latestIso).getTime() : NaN;
    const ageMs = Number.isFinite(latestMs) ? Date.now() - latestMs : null;

    if (todayCount >= 3) {
      return {
        status: 'passed',
        ageMs,
        detail: `todayCount=${todayCount}${latestIso ? ` latestGenerate=${latestIso}` : ''}`,
        table: target.table,
      };
    }

    if (hour < 6) {
      return {
        status: 'passed',
        ageMs,
        detail: `todayCount=${todayCount}; prediction generation window not started yet`,
        table: target.table,
      };
    }

    return {
      status: ageMs !== null && ageMs < 4 * 60 * 60 * 1000 ? 'warning' : 'failed',
      ageMs,
      detail: `todayCount=${todayCount}${latestIso ? ` latestGenerate=${latestIso}` : ' latestGenerate=missing'}`,
      table: target.table,
    };
  }

  const response = await withRetry(`${target.label} query`, () => fetchWithTimeout(buildRestUrl(target), {
    method: 'GET',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  }, 15000));

  const bodyText = await readResponseBody(response);

  if (response.status === 401 || response.status === 403) {
    return {
      status: target.blocking ? 'failed' : 'warning',
      ageMs: null,
      detail: `auth=${response.status} ${target.table} is not readable with anon key`,
      table: target.table,
    };
  }

  if (!response.ok) {
    throw new Error(`${target.table} returned ${response.status}${bodyText ? ` body=${bodyText.slice(0, 240)}` : ''}`);
  }

  let records;
  try {
    records = bodyText ? JSON.parse(bodyText) : [];
  } catch (error) {
    throw new Error(`invalid JSON from ${target.table}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(records) || records.length === 0) {
    return {
      status: target.blocking ? 'failed' : 'warning',
      ageMs: null,
      detail: 'latest record missing',
      table: target.table,
    };
  }

  const latest = records[0];
  const latestValue = latest[target.timeField];
  const latestMs = new Date(latestValue).getTime();

  if (!Number.isFinite(latestMs)) {
    return {
      status: target.blocking ? 'failed' : 'warning',
      ageMs: null,
      detail: `invalid ${target.timeField} value=${latestValue}`,
      table: target.table,
    };
  }

  const ageMs = Date.now() - latestMs;
  const thresholds = getThresholds(target);
  let status = 'passed';
  if (ageMs > thresholds.failMs) {
    status = 'failed';
  } else if (ageMs > thresholds.warningMs) {
    status = 'warning';
  }

  return {
    status,
    ageMs,
    detail: `${renderRecordPreview(target, latest)} age=${formatAge(ageMs)}`,
    table: target.table,
  };
}

async function main() {
  if (process.env.BALN_SKIP_NETWORK_CHECKS === '1') {
    console.log('SKIP content freshness check (BALN_SKIP_NETWORK_CHECKS=1)');
    process.exit(0);
  }

  fs.mkdirSync(reportDir, { recursive: true });

  const results = [];
  for (const target of targets) {
    const startedAt = Date.now();
    try {
      const result = await fetchLatestRecord(target);
      results.push({
        id: target.id,
        label: target.label,
        blocking: target.blocking,
        table: target.table,
        durationMs: Date.now() - startedAt,
        ...result,
      });
    } catch (error) {
      results.push({
        id: target.id,
        label: target.label,
        blocking: target.blocking,
        table: target.table,
        durationMs: Date.now() - startedAt,
        status: 'failed',
        ageMs: null,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const blockingFailures = results.filter((item) => item.blocking && item.status === 'failed');
  const report = {
    generatedAt: new Date().toISOString(),
    overall: blockingFailures.length === 0 ? 'PASS' : 'FAIL',
    blockingFailures: blockingFailures.length,
    results,
  };

  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(reportMdPath, renderMarkdown(results));

  console.log(`Operations report written to ${reportMdPath}`);
  for (const result of results) {
    const badge = result.status === 'passed' ? 'PASS' : result.status === 'warning' ? 'WARN' : 'FAIL';
    console.log(`${badge} ${result.label}`);
    if (result.detail) {
      console.log(`  ${result.detail}`);
    }
  }

  if (blockingFailures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Content freshness check crashed:', error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
