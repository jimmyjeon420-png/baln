#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const reportDir = path.join(projectRoot, 'reports', 'stability');
const reportJsonPath = path.join(reportDir, 'latest.json');
const reportMdPath = path.join(reportDir, 'latest.md');

const checks = [
  {
    id: 'production-preflight',
    label: '실서비스 프리플라이트',
    command: 'npm run -s qa:preflight',
    blocking: true,
  },
  {
    id: 'content-freshness',
    label: '실서비스 콘텐츠 신선도',
    command: 'npm run -s qa:content-freshness',
    blocking: true,
  },
  {
    id: 'typecheck',
    label: 'TypeScript 타입 체크',
    command: 'npm run -s typecheck',
    blocking: true,
  },
  {
    id: 'ts-nocheck',
    label: 'ts-nocheck 증가 방지',
    command: 'npm run -s check:ts-nocheck',
    blocking: true,
  },
  {
    id: 'lint-critical',
    label: '핵심 경로 린트',
    command: 'npm run -s lint:critical',
    blocking: true,
  },
  {
    id: 'smoke-tests',
    label: '핵심 계산 스모크 테스트',
    command: 'npm run -s test:smoke',
    blocking: true,
  },
  {
    id: 'critical-flows',
    label: '핵심 사용자 동선 회귀 테스트',
    command: 'npm run -s test:critical-flows',
    blocking: true,
  },
];

function runCommand(command) {
  try {
    const stdout = execSync(command, {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 10,
    });
    return { status: 'passed', output: stdout.trim() };
  } catch (error) {
    const stdout = error.stdout ? String(error.stdout) : '';
    const stderr = error.stderr ? String(error.stderr) : '';
    return {
      status: 'failed',
      output: `${stdout}\n${stderr}`.trim(),
      code: typeof error.status === 'number' ? error.status : 1,
    };
  }
}

function toSummaryEmoji(status) {
  if (status === 'passed') return 'PASS';
  if (status === 'failed') return 'FAIL';
  return 'SKIP';
}

function renderMarkdown(results) {
  const generatedAt = new Date().toISOString();
  const blockingFailures = results.filter((item) => item.blocking && item.status === 'failed');
  const overall = blockingFailures.length === 0 ? 'PASS' : 'FAIL';

  const lines = [];
  lines.push('# Stability Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt}`);
  lines.push(`- Overall status: **${overall}**`);
  lines.push(`- Blocking failures: **${blockingFailures.length}**`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');

  for (const result of results) {
    lines.push(`- ${toSummaryEmoji(result.status)} ${result.label}${result.blocking ? ' (blocking)' : ''}`);
  }

  lines.push('');
  lines.push('## Details');
  lines.push('');

  for (const result of results) {
    lines.push(`### ${toSummaryEmoji(result.status)} ${result.label}`);
    lines.push('');
    lines.push(`- Command: \`${result.command}\``);
    lines.push(`- Blocking: ${result.blocking ? 'yes' : 'no'}`);
    if (typeof result.code === 'number') {
      lines.push(`- Exit code: ${result.code}`);
    }
    lines.push('');

    if (result.output) {
      lines.push('```text');
      lines.push(result.output.slice(0, 12000));
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}

fs.mkdirSync(reportDir, { recursive: true });

const results = checks.map((check) => ({
  ...check,
  ...runCommand(check.command),
}));

const blockingFailures = results.filter((item) => item.blocking && item.status === 'failed');
const report = {
  generatedAt: new Date().toISOString(),
  overall: blockingFailures.length === 0 ? 'PASS' : 'FAIL',
  blockingFailures: blockingFailures.length,
  results,
};

fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
fs.writeFileSync(reportMdPath, renderMarkdown(results));

console.log(`Stability report written to ${reportMdPath}`);
for (const result of results) {
  console.log(`${toSummaryEmoji(result.status)} ${result.label}`);
}

if (blockingFailures.length > 0) {
  process.exit(1);
}
