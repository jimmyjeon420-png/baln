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

function getManualOnlyPaths() {
  if (!fs.existsSync(manualPathsFile)) return [];

  return fs
    .readFileSync(manualPathsFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function getDirtyFiles() {
  const output = run('git', ['status', '--short']);
  if (!output) return [];

  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const normalized = line.replace(/^\?\?\s+/, '').replace(/^[ MARCUD?!]{1,2}\s+/, '');
      const renameParts = normalized.split(' -> ');
      return renameParts[renameParts.length - 1].trim();
    });
}

function fail(message) {
  console.error(`\n[pre-push] ${message}\n`);
  process.exit(1);
}

const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const protectedBranches = new Set(['main', 'master']);
const manualOnlyPaths = getManualOnlyPaths();
const dirtyManualOnlyFiles = getDirtyFiles().filter((file) => manualOnlyPaths.includes(file));

if (dirtyManualOnlyFiles.length > 0) {
  fail(
    `공용 작업 폴더의 충돌 위험 파일이 아직 dirty 상태입니다:\n- ${dirtyManualOnlyFiles.join(
      '\n- ',
    )}\n이 상태에서는 자동 push를 막습니다. 새 클린 폴더에서 빌드/배포하거나, 수동으로 충돌 정리 후 다시 시도하세요.`,
  );
}

if (!protectedBranches.has(branch)) {
  console.log(`[pre-push] ${branch} 브랜치는 경량 체크만 수행합니다.`);
  execFileSync('npm', ['run', '-s', 'typecheck'], { cwd: repoRoot, stdio: 'inherit' });
  process.exit(0);
}

console.log(`[pre-push] ${branch} 브랜치 보호 체크 실행`);
execFileSync('npm', ['run', '-s', 'typecheck'], { cwd: repoRoot, stdio: 'inherit' });
execFileSync('npm', ['run', '-s', 'test:critical-flows'], { cwd: repoRoot, stdio: 'inherit' });
execFileSync('npm', ['run', '-s', 'qa:stability'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, BALN_SKIP_NETWORK_CHECKS: '1' },
});
console.log('[pre-push] 보호 체크 통과');
