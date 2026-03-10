#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function getCommitsSince(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  try {
    const out = execSync(`git log ${range} --pretty=format:"%s"`, { encoding: 'utf8' }).trim();
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function determineBumpType(commits) {
  let bumpType = null;
  for (const commit of commits) {
    // Skip release commits themselves
    if (/^chore\(release\):/.test(commit)) continue;
    if (/BREAKING CHANGE/.test(commit) || /^(\w+)(\(.+\))?!:/.test(commit)) {
      return 'major';
    } else if (/^feat(\(.+\))?:/.test(commit)) {
      if (bumpType !== 'major') bumpType = 'minor';
    } else if (/^fix(\(.+\))?:/.test(commit)) {
      if (!bumpType) bumpType = 'patch';
    }
    // chore, docs, style, refactor, test → no release by default
  }
  return bumpType;
}

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  switch (type) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default: return version;
  }
}

function setOutput(name, value) {
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    fs.appendFileSync(githubOutput, `${name}=${value}\n`);
  } else {
    console.log(`${name}=${value}`);
  }
}

// Main
const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
const lastTag = getLastTag();
const commits = getCommitsSince(lastTag);
const bumpType = determineBumpType(commits);
const newVersion = bumpType ? bumpVersion(pkg.version, bumpType) : pkg.version;
const shouldRelease = Boolean(bumpType);

console.log(`Last tag:        ${lastTag || 'none'}`);
console.log(`Commits found:   ${commits.length}`);
console.log(`Bump type:       ${bumpType || 'none'}`);
console.log(`Current version: ${pkg.version}`);
console.log(`New version:     ${newVersion}`);
console.log(`Should release:  ${shouldRelease}`);

setOutput('new_version', newVersion);
setOutput('old_version', pkg.version);
setOutput('should_release', shouldRelease.toString());
setOutput('bump_type', bumpType || 'none');
