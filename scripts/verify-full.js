#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * verify-full.js — TestFlight 제출 전 전체 자동 검증
 *
 * 역할: "품질 관문"
 * Level 1~5 검증을 한 번에 실행하여 사람이 TestFlight에서 발견할 버그를 미리 잡는다.
 *
 * 사용법: npm run verify:full
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
let passed = 0;
let failed = 0;
const results = [];

function run(label, cmd, options = {}) {
  process.stdout.write(`  ${label}...`);
  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: options.timeout || 120000,
    });
    console.log(' PASS');
    passed++;
    results.push({ label, status: 'PASS' });
    return true;
  } catch (e) {
    const output = (e.stdout || '') + (e.stderr || '');
    const firstLine = output.split('\n').filter(Boolean).slice(0, 5).join('\n    ');
    console.log(' FAIL');
    if (firstLine) console.log(`    ${firstLine}`);
    failed++;
    results.push({ label, status: 'FAIL', detail: firstLine });
    return false;
  }
}

console.log('\n=== baln Full Verification Gate ===\n');

// Level 1: TypeScript
console.log('[Level 1] Compile');
run('tsc --noEmit', 'npx tsc --noEmit');

// Level 2: ESLint (critical paths)
console.log('[Level 2] Lint');
run('ESLint critical paths', 'npm run -s lint:critical');

// Level 3: Tests
console.log('[Level 3] Tests');
run('Unit + Integration tests', 'npm test -- --passWithNoTests', { timeout: 60000 });

// Level 4: i18n Coverage
console.log('[Level 4] i18n');

// 4a: i18n-js resolution check
const checkLocaleScript = path.join(ROOT, 'scripts', 'check-locale-real.js');
if (fs.existsSync(checkLocaleScript)) {
  run('i18n JA coverage (i18n-js)', `node ${checkLocaleScript}`);
} else {
  console.log('  i18n check script not found, skipping');
}

// 4b: Hardcoded Korean in JSX (exclude admin, comments, imports)
process.stdout.write('  Hardcoded Korean in components...');
try {
  const grepResult = execSync(
    'grep -rn ">\\s*[가-힣]" src/components/ src/screens/ 2>/dev/null | grep -v "// " | grep -v "admin" | grep -v ".test." | grep -v "node_modules" || true',
    { cwd: ROOT, encoding: 'utf8' }
  ).trim();
  const lines = grepResult ? grepResult.split('\n').filter(Boolean) : [];
  if (lines.length === 0) {
    console.log(' PASS (0 found)');
    passed++;
    results.push({ label: 'Hardcoded Korean', status: 'PASS' });
  } else {
    console.log(` WARN (${lines.length} found)`);
    lines.slice(0, 5).forEach(l => console.log(`    ${l}`));
    // Warning, not failure — some may be intentional
    results.push({ label: 'Hardcoded Korean', status: 'WARN', detail: `${lines.length} matches` });
  }
} catch (e) {
  console.log(' SKIP');
}

// 4c: Hardcoded currency symbols in UI
process.stdout.write('  Hardcoded currency (Won) in UI...');
try {
  // Exclude: comments, regex patterns, AI prompts, formatKRW (which is intentionally KRW), test files
  const grepCurrency = execSync(
    'grep -rn "₩" src/components/ src/screens/ 2>/dev/null | grep -v "// " | grep -v "formatKRW" | grep -v ".test." | grep -v "replace(" | grep -v "regex" || true',
    { cwd: ROOT, encoding: 'utf8' }
  ).trim();
  const currencyLines = grepCurrency ? grepCurrency.split('\n').filter(Boolean) : [];
  if (currencyLines.length === 0) {
    console.log(' PASS (0 found)');
    passed++;
    results.push({ label: 'Hardcoded Won symbol', status: 'PASS' });
  } else {
    console.log(` WARN (${currencyLines.length} found)`);
    currencyLines.slice(0, 5).forEach(l => console.log(`    ${l}`));
    results.push({ label: 'Hardcoded Won symbol', status: 'WARN', detail: `${currencyLines.length} matches` });
  }
} catch (e) {
  console.log(' SKIP');
}

// Level 5: Production preflight + stability
console.log('[Level 5] Production');
run('Production preflight', 'npm run -s qa:preflight', { timeout: 30000 });
run('Content freshness', 'npm run -s qa:content-freshness', { timeout: 30000 });

// Summary
console.log('\n=== Results ===');
console.log(`  PASS: ${passed}`);
console.log(`  FAIL: ${failed}`);
const warns = results.filter(r => r.status === 'WARN');
if (warns.length > 0) console.log(`  WARN: ${warns.length}`);

if (failed > 0) {
  console.log('\n  BLOCKED: Fix failures before TestFlight submission.\n');
  process.exit(1);
} else {
  console.log('\n  READY for TestFlight submission.\n');
  process.exit(0);
}
