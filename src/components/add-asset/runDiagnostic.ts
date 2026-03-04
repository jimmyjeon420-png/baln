/**
 * runDiagnostic — Supabase connection diagnostic for the Add Asset screen
 */

import { Alert } from 'react-native';
import supabase, {
  getCurrentUser,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from '../../services/supabase';
import { t as rawT } from '../../locales';

export async function runDiagnostic(): Promise<void> {
  const results: string[] = [];
  const startTotal = Date.now();

  // 1. raw fetch
  try {
    const t1 = Date.now();
    const res = await Promise.race([
      fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: { apikey: SUPABASE_ANON_KEY },
      }),
      new Promise<null>((r) => setTimeout(() => r(null), 5000)),
    ]);
    if (res) {
      results.push(`1. fetch: ${res.status} (${Date.now() - t1}ms)`);
    } else {
      results.push(`1. fetch: TIMEOUT 5s`);
    }
  } catch (e: unknown) {
    results.push(`1. fetch ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. getSession
  try {
    const t2 = Date.now();
    const { data } = await supabase.auth.getSession();
    const hasSession = !!data?.session;
    const token = data?.session?.access_token;
    let expInfo = 'no token';
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const exp = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        expInfo = exp > now ? `valid (${exp - now}s left)` : `EXPIRED (${now - exp}s ago)`;
      } catch { expInfo = 'parse error'; }
    }
    results.push(`2. session: ${hasSession ? 'YES' : 'NO'} / ${expInfo} (${Date.now() - t2}ms)`);
  } catch (e: unknown) {
    results.push(`2. session ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3. DB query
  try {
    const t3 = Date.now();
    const { data, error } = await Promise.race([
      supabase.from('portfolios').select('id').limit(1),
      new Promise<{ data: null; error: { message: string } }>((r) =>
        setTimeout(() => r({ data: null, error: { message: 'SDK TIMEOUT 5s' } }), 5000)
      ),
    ]) as { data: unknown; error: { message: string } | null };
    if (error) {
      results.push(`3. DB query: ERROR ${error.message} (${Date.now() - t3}ms)`);
    } else {
      results.push(`3. DB query: OK rows=${Array.isArray(data) ? data.length : 0} (${Date.now() - t3}ms)`);
    }
  } catch (e: unknown) {
    results.push(`3. DB query ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 4. getCurrentUser
  try {
    const t4 = Date.now();
    const u = await getCurrentUser();
    results.push(`4. getCurrentUser: ${u ? u.id.substring(0, 8) + '...' : 'NULL'} (${Date.now() - t4}ms)`);
  } catch (e: unknown) {
    results.push(`4. getCurrentUser ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }

  const totalMs = Date.now() - startTotal;
  Alert.alert(rawT('add_asset.diagnostic_title'), results.join('\n') + `\n\n총: ${totalMs}ms`);
}
