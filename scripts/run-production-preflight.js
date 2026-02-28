#!/usr/bin/env node

const {
  FALLBACK_URL,
  FALLBACK_KEY,
  fetchWithTimeout,
  getOpsHealerToken,
  getSupabaseConfig,
  readResponseBody,
  withRetry,
} = require('./lib/qaRuntime');

const projectRoot = process.cwd();
const { SUPABASE_URL, SUPABASE_ANON_KEY } = getSupabaseConfig(projectRoot);
const OPS_HEALER_TOKEN = getOpsHealerToken(projectRoot);

async function runCheck(label, blocking, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    return {
      label,
      blocking,
      status: 'passed',
      durationMs: Date.now() - startedAt,
      detail,
    };
  } catch (error) {
    return {
      label,
      blocking,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function skippedCheck(label, detail) {
  return {
    label,
    blocking: false,
    status: 'skipped',
    durationMs: 0,
    detail,
  };
}

function statusPrefix(status) {
  if (status === 'passed') return 'PASS';
  if (status === 'skipped') return 'SKIP';
  return 'FAIL';
}

async function main() {
  if (process.env.BALN_SKIP_NETWORK_CHECKS === '1') {
    console.log('SKIP production preflight (BALN_SKIP_NETWORK_CHECKS=1)');
    process.exit(0);
  }

  const checks = [];

  checks.push(await runCheck('Supabase config presence', true, async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase URL or anon key missing');
    }
    const usingFallbackUrl = SUPABASE_URL === FALLBACK_URL;
    const usingFallbackKey = SUPABASE_ANON_KEY === FALLBACK_KEY;
    return `url=${usingFallbackUrl ? 'fallback' : 'env'} key=${usingFallbackKey ? 'fallback' : 'env'} keyLength=${SUPABASE_ANON_KEY.length}`;
  }));

  checks.push(await runCheck('Supabase REST API reachable', true, async () => {
    const response = await withRetry('Supabase REST API', () => fetchWithTimeout(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }));

    if (response.status >= 500) {
      const body = await readResponseBody(response);
      throw new Error(`REST API returned ${response.status}${body ? ` body=${body.slice(0, 180)}` : ''}`);
    }

    return `status=${response.status}`;
  }));

  checks.push(await runCheck('Supabase Auth endpoint reachable', true, async () => {
    const response = await withRetry('Supabase Auth endpoint', () => fetchWithTimeout(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_ANON_KEY,
      },
    }));

    if (response.status >= 500) {
      const body = await readResponseBody(response);
      throw new Error(`Auth endpoint returned ${response.status}${body ? ` body=${body.slice(0, 180)}` : ''}`);
    }
    return `status=${response.status}`;
  }));

  checks.push(await runCheck('gemini-proxy health-check', true, async () => {
    const response = await withRetry('gemini-proxy health-check', () => fetchWithTimeout(`${SUPABASE_URL}/functions/v1/gemini-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        type: 'health-check',
        lang: 'ko',
        data: {},
      }),
    }, 20000));

    const bodyText = await readResponseBody(response);
    const json = bodyText ? JSON.parse(bodyText) : null;

    if (!response.ok) {
      throw new Error(`Function returned ${response.status}${bodyText ? ` body=${bodyText.slice(0, 240)}` : ''}`);
    }

    if (!json?.success) {
      throw new Error(`Function success=false error=${json?.error || 'unknown'}`);
    }

    const status = json?.data?.status;
    const geminiApi = json?.data?.geminiApi;
    const apiKeySet = json?.data?.apiKeySet;

    if (!apiKeySet) {
      throw new Error('Gemini API key not configured in Edge Function');
    }

    if (status !== 'ok' || geminiApi !== 'OK') {
      throw new Error(`gemini status=${status} geminiApi=${geminiApi}`);
    }

    return `status=${status} geminiApi=${geminiApi} model=${json?.data?.model || 'unknown'}`;
  }));

  if (!OPS_HEALER_TOKEN) {
    checks.push(skippedCheck('ops-content-healer status-check', 'OPS healer token missing; skipping secured check'));
  } else {
    checks.push(await runCheck('ops-content-healer status-check', true, async () => {

      const response = await withRetry('ops-content-healer status-check', () => fetchWithTimeout(`${SUPABASE_URL}/functions/v1/ops-content-healer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ops-token': OPS_HEALER_TOKEN,
        },
        body: JSON.stringify({
          mode: 'status',
          source: 'production-preflight',
        }),
      }, 20000));

      const bodyText = await readResponseBody(response);
      const json = bodyText ? JSON.parse(bodyText) : null;

      if (!response.ok) {
        throw new Error(`Function returned ${response.status}${bodyText ? ` body=${bodyText.slice(0, 240)}` : ''}`);
      }

      if (!json?.ok) {
        throw new Error(`Function ok=false error=${json?.error || 'unknown'}`);
      }

      if (json?.mode !== 'status') {
        throw new Error(`Unexpected healer mode=${json?.mode || 'unknown'}`);
      }

      return `mode=${json.mode} actions=${Array.isArray(json?.actions) ? json.actions.length : 0}`;
    }));
  }

  const failedBlocking = checks.filter((check) => check.blocking && check.status === 'failed');

  console.log('Production preflight');
  console.log('====================');
  for (const check of checks) {
    const prefix = statusPrefix(check.status);
    console.log(`${prefix} ${check.label} (${check.durationMs}ms)`);
    if (check.detail) console.log(`  ${check.detail}`);
  }

  if (failedBlocking.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Production preflight crashed:', error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
