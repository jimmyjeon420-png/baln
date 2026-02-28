#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const reportDir = path.join(projectRoot, 'reports', 'release');
const reportJsonPath = path.join(reportDir, 'latest.json');
const reportMdPath = path.join(reportDir, 'latest.md');
const easJsonPath = path.join(projectRoot, 'eas.json');

const REQUIRED_BUILD_ENV_KEYS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_GEMINI_API_KEY',
  'EXPO_PUBLIC_GEMINI_MODEL',
  'EXPO_PUBLIC_KAKAO_REST_API_KEY',
  'EXPO_PUBLIC_MOLIT_API_KEY',
  'EXPO_PUBLIC_SENTRY_DSN',
];

const REQUIRED_SUBMIT_KEYS = [
  'appleId',
  'ascAppId',
  'appleTeamId',
  'ascApiKeyPath',
  'ascApiKeyId',
  'ascApiKeyIssuerId',
];

function parseModeArg() {
  const modeIndex = process.argv.findIndex((arg) => arg === '--mode');
  if (modeIndex >= 0 && process.argv[modeIndex + 1]) {
    return process.argv[modeIndex + 1].trim().toLowerCase();
  }

  return 'release';
}

function parseProfilesArg() {
  const profileIndex = process.argv.findIndex((arg) => arg === '--profile' || arg === '--profiles');
  if (profileIndex >= 0 && process.argv[profileIndex + 1]) {
    return process.argv[profileIndex + 1]
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (process.env.EAS_BUILD_PROFILE) {
    return [process.env.EAS_BUILD_PROFILE];
  }

  return ['preview', 'production'];
}

function createCheck(label, blocking, evaluator) {
  try {
    const result = evaluator();
    return {
      label,
      blocking,
      status: 'passed',
      ...result,
    };
  } catch (error) {
    return {
      label,
      blocking,
      status: 'failed',
      code: 1,
      output: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateBuildProfile(easConfig, profile) {
  const buildProfile = easConfig.build?.[profile];
  if (!buildProfile) {
    throw new Error(`eas.json build.${profile} profile is missing`);
  }

  const env = buildProfile.env ?? {};
  const missingKeys = REQUIRED_BUILD_ENV_KEYS.filter((key) => typeof env[key] !== 'string' || env[key].trim().length === 0);
  if (missingKeys.length > 0) {
    throw new Error(`${profile} env is missing required keys: ${missingKeys.join(', ')}`);
  }

  const sensitiveHints = REQUIRED_BUILD_ENV_KEYS.map((key) => `${key}=set`).join(', ');
  return {
    output: `${profile} profile validated (${sensitiveHints})`,
  };
}

function validateProductionSubmit(easConfig) {
  const iosSubmit = easConfig.submit?.production?.ios;
  if (!iosSubmit) {
    throw new Error('eas.json submit.production.ios is missing');
  }

  const missingKeys = REQUIRED_SUBMIT_KEYS.filter((key) => typeof iosSubmit[key] !== 'string' || iosSubmit[key].trim().length === 0);
  if (missingKeys.length > 0) {
    throw new Error(`submit.production.ios is missing required keys: ${missingKeys.join(', ')}`);
  }

  const ascKeyPath = path.resolve(projectRoot, iosSubmit.ascApiKeyPath);
  if (!fs.existsSync(ascKeyPath)) {
    throw new Error(`App Store Connect API key file is missing: ${iosSubmit.ascApiKeyPath}`);
  }

  return {
    output: `submit.production.ios validated (ascApiKeyPath exists: ${iosSubmit.ascApiKeyPath})`,
  };
}

function renderMarkdown(results, profiles) {
  const generatedAt = new Date().toISOString();
  const blockingFailures = results.filter((item) => item.blocking && item.status === 'failed');
  const overall = blockingFailures.length === 0 ? 'PASS' : 'FAIL';

  const lines = [];
  lines.push('# Release Gate Report');
  lines.push('');
  lines.push(`- Generated at: ${generatedAt}`);
  lines.push(`- Profiles: ${profiles.join(', ')}`);
  lines.push(`- Overall status: **${overall}**`);
  lines.push(`- Blocking failures: **${blockingFailures.length}**`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');

  for (const result of results) {
    lines.push(`- ${result.status === 'passed' ? 'PASS' : 'FAIL'} ${result.label}${result.blocking ? ' (blocking)' : ''}`);
  }

  lines.push('');
  lines.push('## Details');
  lines.push('');

  for (const result of results) {
    lines.push(`### ${result.status === 'passed' ? 'PASS' : 'FAIL'} ${result.label}`);
    lines.push('');
    lines.push(`- Blocking: ${result.blocking ? 'yes' : 'no'}`);
    if (typeof result.code === 'number') {
      lines.push(`- Exit code: ${result.code}`);
    }
    lines.push('');

    if (result.output) {
      lines.push('```text');
      lines.push(String(result.output).slice(0, 12000));
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}

function main() {
  const profiles = parseProfilesArg();
  const mode = parseModeArg();

  if (!['build', 'release'].includes(mode)) {
    throw new Error(`Unsupported release gate mode: ${mode}`);
  }

  const easConfig = JSON.parse(fs.readFileSync(easJsonPath, 'utf8'));
  const results = [];

  const stabilityEnv =
    mode === 'build'
      ? { ...process.env, BALN_SKIP_NETWORK_CHECKS: '1' }
      : { ...process.env };

  results.push({
    label: mode === 'build' ? '빌드용 안정성 게이트' : '안정성 게이트',
    blocking: true,
    ...(() => {
      try {
        const stdout = execSync('npm run -s qa:stability', {
          cwd: projectRoot,
          stdio: ['ignore', 'pipe', 'pipe'],
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 * 10,
          env: stabilityEnv,
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
    })(),
  });

  for (const profile of profiles) {
    results.push(
      createCheck(`EAS build profile 검증: ${profile}`, true, () => validateBuildProfile(easConfig, profile)),
    );
  }

  if (mode === 'release' && profiles.includes('production')) {
    results.push(
      createCheck('App Store / TestFlight 제출 설정 검증', true, () => validateProductionSubmit(easConfig)),
    );
  }

  const blockingFailures = results.filter((item) => item.blocking && item.status === 'failed');
  const report = {
    generatedAt: new Date().toISOString(),
    profiles,
    mode,
    overall: blockingFailures.length === 0 ? 'PASS' : 'FAIL',
    blockingFailures: blockingFailures.length,
    results,
  };

  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(reportMdPath, renderMarkdown(results, profiles));

  console.log(`Release report written to ${reportMdPath}`);
  for (const result of results) {
    console.log(`${result.status === 'passed' ? 'PASS' : 'FAIL'} ${result.label}`);
  }

  if (blockingFailures.length > 0) {
    process.exit(1);
  }
}

main();
