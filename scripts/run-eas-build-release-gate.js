#!/usr/bin/env node

const { execSync } = require('child_process');

const profile = process.env.EAS_BUILD_PROFILE;
const gatedProfiles = new Set(['preview', 'production']);

if (!profile || !gatedProfiles.has(profile)) {
  console.log(`[release-gate] skipped for profile=${profile || 'unknown'}`);
  process.exit(0);
}

console.log(`[release-gate] running qa:release for profile=${profile}`);

execSync(`npm run -s qa:release -- --profile ${profile}`, {
  stdio: 'inherit',
  encoding: 'utf8',
});
