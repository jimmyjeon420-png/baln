#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */

const { execSync } = require('child_process');

const profile = process.env.EAS_BUILD_PROFILE;
const gatedProfiles = new Set(['preview', 'production']);
const isLocalBuild = Object.keys(process.env).some((key) => key.startsWith('EAS_LOCAL_BUILD_'));

if (!profile || !gatedProfiles.has(profile)) {
  console.log(`[release-gate] skipped for profile=${profile || 'unknown'}`);
  process.exit(0);
}

const mode = isLocalBuild ? 'build' : 'release';
console.log(`[release-gate] running qa:release for profile=${profile} mode=${mode}`);

execSync(`npm run -s qa:release -- --profile ${profile} --mode ${mode}`, {
  stdio: 'inherit',
  encoding: 'utf8',
});
