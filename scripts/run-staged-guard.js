#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const repoRoot = path.resolve(__dirname, '..');
const manualPathsFile = path.join(repoRoot, '.gitguard-manual-paths');

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

function getStagedFiles() {
  const output = run('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR']);
  return output ? output.split('\n').map((f) => f.trim()).filter(Boolean) : [];
}

function getManualOnlyPaths() {
  if (!fs.existsSync(manualPathsFile)) return [];

  return fs
    .readFileSync(manualPathsFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function fail(message) {
  console.error(`\n[pre-commit] ${message}\n`);
  process.exit(1);
}

const stagedFiles = getStagedFiles();
if (stagedFiles.length === 0) {
  process.exit(0);
}

const manualOnlyPaths = getManualOnlyPaths();

const blockedPatterns = [
  /^\.env(?:\..+)?$/,
  /^\.claude\/settings\.local\.json$/,
  /^apple login\//,
  /^reports\//,
  /^coverage\//,
  /\.p8$/,
  /\.ipa$/,
];

const blockedFiles = stagedFiles.filter((file) => blockedPatterns.some((pattern) => pattern.test(file)));
const manualOnlyStagedFiles = stagedFiles.filter((file) => manualOnlyPaths.includes(file));
if (blockedFiles.length > 0) {
  fail(`커밋 금지 파일이 stage 되어 있습니다:\n- ${blockedFiles.join('\n- ')}`);
}

if (manualOnlyStagedFiles.length > 0) {
  fail(
    `공용 작업 폴더에서 자동 커밋 금지 경로가 stage 되어 있습니다:\n- ${manualOnlyStagedFiles.join(
      '\n- ',
    )}\n새 클린 폴더에서 작업하거나, 수동으로 충돌 정리 후 다시 진행하세요.`,
  );
}

const diff = run('git', ['diff', '--cached', '--unified=0', '--no-color']);
const addedLines = diff
  .split('\n')
  .filter((line) => line.startsWith('+') && !line.startsWith('+++'))
  .map((line) => line.slice(1));

const secretPatterns = [
  /(BALN_OPS_HEALER_TOKEN|OPS_HEALER_TOKEN|SUPABASE_SERVICE_ROLE_KEY|INTERNAL_FUNCTION_JWT)\s*[:=]\s*['\"][^'\"]+['\"]/i,
  /x-ops-token\s*[:=]\s*['\"][^'\"]+['\"]/i,
  /eyJ[A-Za-z0-9_\-]+=*\.[A-Za-z0-9_\-.]+=*\.[A-Za-z0-9_\-.+/=]*/,
  /(TOKEN|SECRET|JWT|SERVICE_ROLE_KEY).*[A-Fa-f0-9]{32,}/,
];

const secretLine = addedLines.find((line) => secretPatterns.some((pattern) => pattern.test(line)));
if (secretLine) {
  fail('시크릿 또는 토큰으로 보이는 값이 staged diff에 포함되어 있습니다. GitHub/Supabase Secret으로 옮기고 다시 커밋하세요.');
}

const lintableFiles = stagedFiles.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file));
if (lintableFiles.length > 0) {
  console.log(`[pre-commit] eslint 검사 ${lintableFiles.length}개 파일`);
  execFileSync('npx', ['eslint', '--max-warnings=0', ...lintableFiles], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

console.log('[pre-commit] staged guard 통과');
