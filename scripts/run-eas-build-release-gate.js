#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { execSync } = require('child_process');

const profile = process.env.EAS_BUILD_PROFILE;
const gatedProfiles = new Set(['preview', 'production']);

function isTruthy(value) {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function resolveGateMode() {
  const override = process.env.BALN_RELEASE_GATE_MODE?.trim().toLowerCase();
  if (override === 'build' || override === 'release' || override === 'skip') {
    return { mode: override, reason: `override:${override}` };
  }

  const localSignals = [
    'EAS_LOCAL_BUILD_WORKINGDIR',
    'EAS_LOCAL_BUILD_SKIP_CREDENTIALS_CHECK',
    'EAS_LOCAL_BUILD_SKIP_CLEANUP',
    'EAS_LOCAL_BUILD_ARTIFACTS_DIR',
    'EAS_LOCAL_BUILD_BASE_DIR',
  ];

  if (localSignals.some((key) => typeof process.env[key] === 'string' && process.env[key].trim().length > 0)) {
    return { mode: 'build', reason: 'eas-local-signal' };
  }

  const ciSignals =
    isTruthy(process.env.CI) ||
    isTruthy(process.env.GITHUB_ACTIONS) ||
    typeof process.env.EAS_BUILD_ID === 'string' ||
    typeof process.env.EAS_BUILD_RUNNER === 'string' ||
    typeof process.env.BUILDKITE === 'string';

  if (!ciSignals) {
    return { mode: 'build', reason: 'non-ci-shell' };
  }

  return { mode: 'release', reason: 'ci-release' };
}

if (!profile || !gatedProfiles.has(profile)) {
  console.log(`[release-gate] skipped for profile=${profile || 'unknown'}`);
  process.exit(0);
}

const { mode, reason } = resolveGateMode();
if (mode === 'skip') {
  console.log(`[release-gate] skipped by override for profile=${profile}`);
  process.exit(0);
}

console.log(`[release-gate] running qa:release for profile=${profile} mode=${mode} reason=${reason}`);

execSync(`npm run -s qa:release -- --profile ${profile} --mode ${mode}`, {
  stdio: 'inherit',
  encoding: 'utf8',
});
