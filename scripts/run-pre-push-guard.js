#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
const { execFileSync } = require('child_process');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  }).trim();
}

const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
const protectedBranches = new Set(['main', 'master']);

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
