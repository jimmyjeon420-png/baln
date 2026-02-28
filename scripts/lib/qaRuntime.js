const fs = require('fs');
const path = require('path');

const FALLBACK_URL = 'https://ruqeinfcqhgexrckonsy.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1cWVpbmZjcWhnZXhyY2tvbnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkyMTE4MDksImV4cCI6MjA4NDc4NzgwOX0.NJmOH_uF59nYaSmjebGMNHlBwvqx5MHIwXOoqzITsXc';
const MAX_ATTEMPTS = 3;

function loadDotEnv(projectRoot) {
  const envPath = path.join(projectRoot, '.env');
  const result = {};

  if (!fs.existsSync(envPath)) return result;
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    result[key] = value;
  }
  return result;
}

function getSupabaseConfig(projectRoot = process.cwd()) {
  const dotEnv = loadDotEnv(projectRoot);
  return {
    SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || dotEnv.EXPO_PUBLIC_SUPABASE_URL || FALLBACK_URL,
    SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || dotEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY,
  };
}

function getOpsHealerToken(projectRoot = process.cwd()) {
  const dotEnv = loadDotEnv(projectRoot);
  const tmpPath = '/tmp/baln_ops_healer_token';
  if (process.env.BALN_OPS_HEALER_TOKEN) return process.env.BALN_OPS_HEALER_TOKEN;
  if (dotEnv.BALN_OPS_HEALER_TOKEN) return dotEnv.BALN_OPS_HEALER_TOKEN;
  if (fs.existsSync(tmpPath)) {
    return fs.readFileSync(tmpPath, 'utf8').trim();
  }
  return '';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResponseBody(response) {
  try {
    return (await response.text()).trim();
  } catch {
    return '';
  }
}

async function withRetry(label, fn, attempts = MAX_ATTEMPTS) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(350 * attempt);
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${label} failed after ${attempts} attempts: ${message}`);
}

function formatAge(ageMs) {
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'unknown';

  const minutes = Math.round(ageMs / 60000);
  if (minutes < 60) return `${minutes}분`;

  const hours = Math.round((ageMs / 3600000) * 10) / 10;
  if (hours < 48) return `${hours}시간`;

  const days = Math.round((ageMs / 86400000) * 10) / 10;
  return `${days}일`;
}

module.exports = {
  FALLBACK_URL,
  FALLBACK_KEY,
  MAX_ATTEMPTS,
  loadDotEnv,
  getSupabaseConfig,
  getOpsHealerToken,
  fetchWithTimeout,
  sleep,
  readResponseBody,
  withRetry,
  formatAge,
};
