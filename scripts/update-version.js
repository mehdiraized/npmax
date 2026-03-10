#!/usr/bin/env node
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];
const oldVersion = process.argv[3];

if (!newVersion || !oldVersion) {
  console.error('Usage: node scripts/update-version.js <new-version> <old-version>');
  process.exit(1);
}

const ROOT = process.cwd();

// 1. Update package.json
function updatePackageJson() {
  const pkgPath = path.join(ROOT, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, '\t') + '\n');
  console.log(`✓ package.json: ${oldVersion} → ${newVersion}`);
}

// 2. Update README.md download links
function updateReadme() {
  const readmePath = path.join(ROOT, 'README.md');
  let content = fs.readFileSync(readmePath, 'utf8');

  const esc = (v) => v.replace(/\./g, '\\.');

  // Update section header
  content = content.replace(
    /## Download npMax v[\d.]+/,
    `## Download npMax v${newVersion}`
  );

  // Replace version in the release URL path: /download/v2.0.0/ → /download/v2.0.1/
  content = content.replace(
    new RegExp(`/releases/download/v${esc(oldVersion)}/`, 'g'),
    `/releases/download/v${newVersion}/`
  );

  // Replace version in file names inside download paths
  // Covers: npMax-2.0.0, npMax.2.0.0, npMax.Setup.2.0.0
  content = content.replace(
    new RegExp(`(npMax[-\\.])${esc(oldVersion)}`, 'g'),
    `$1${newVersion}`
  );
  // Covers: npmax_2.0.0
  content = content.replace(
    new RegExp(`(npmax_)${esc(oldVersion)}`, 'g'),
    `$1${newVersion}`
  );
  // Covers: Setup.2.0.0 (for npMax.Setup.2.0.0.exe)
  content = content.replace(
    new RegExp(`(Setup\\.)${esc(oldVersion)}`, 'g'),
    `$1${newVersion}`
  );

  fs.writeFileSync(readmePath, content);
  console.log(`✓ README.md download links updated`);
}

// 3. Generate CHANGELOG entry
function updateChangelog() {
  const changelogPath = path.join(ROOT, 'CHANGELOG.md');

  let lastTag;
  try {
    lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf8' }).trim();
  } catch {
    lastTag = null;
  }

  const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
  let commits = [];
  try {
    commits = execSync(`git log ${range} --pretty=format:"%H|||%s|||%an"`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, subject, author] = line.split('|||');
        return { hash: hash.substring(0, 7), subject, author };
      })
      .filter((c) => !/^chore\(release\):/.test(c.subject));
  } catch {
    commits = [];
  }

  const cats = { breaking: [], features: [], fixes: [], other: [] };

  for (const commit of commits) {
    const s = commit.subject;
    if (/BREAKING CHANGE/.test(s) || /^(\w+)(\(.+\))?!:/.test(s)) {
      cats.breaking.push(commit);
    } else if (/^feat(\(.+\))?:/.test(s)) {
      cats.features.push(commit);
    } else if (/^fix(\(.+\))?:/.test(s)) {
      cats.fixes.push(commit);
    } else if (!/^chore(\(.+\))?:/.test(s)) {
      cats.other.push(commit);
    }
  }

  const ghBase = 'https://github.com/mehdiraized/npmax/commit/';
  const link = (c) => `([${c.hash}](${ghBase}${c.hash}))`;
  const stripPrefix = (s) => s.replace(/^\w+(\(.+\))?:\s*/, '');

  const date = new Date().toISOString().split('T')[0];
  let entry = `## [${newVersion}] - ${date}\n\n`;

  if (cats.breaking.length) {
    entry += `### ⚠️ Breaking Changes\n\n`;
    cats.breaking.forEach((c) => (entry += `- ${stripPrefix(c.subject)} ${link(c)}\n`));
    entry += '\n';
  }
  if (cats.features.length) {
    entry += `### ✨ Features\n\n`;
    cats.features.forEach((c) => (entry += `- ${stripPrefix(c.subject)} ${link(c)}\n`));
    entry += '\n';
  }
  if (cats.fixes.length) {
    entry += `### 🐛 Bug Fixes\n\n`;
    cats.fixes.forEach((c) => (entry += `- ${stripPrefix(c.subject)} ${link(c)}\n`));
    entry += '\n';
  }
  if (cats.other.length) {
    entry += `### 📦 Other Changes\n\n`;
    cats.other.forEach((c) => (entry += `- ${c.subject} ${link(c)}\n`));
    entry += '\n';
  }
  if (!cats.breaking.length && !cats.features.length && !cats.fixes.length && !cats.other.length) {
    entry += `### 📦 Changes\n\nMaintenance release.\n\n`;
  }

  let existing = '';
  if (fs.existsSync(changelogPath)) {
    existing = fs.readFileSync(changelogPath, 'utf8').replace(/^# Changelog\n\n/, '');
  }

  fs.writeFileSync(changelogPath, `# Changelog\n\n${entry}---\n\n${existing}`);
  console.log(`✓ CHANGELOG.md updated`);
}

updatePackageJson();
updateReadme();
updateChangelog();

console.log(`\n🚀 Version bumped: ${oldVersion} → ${newVersion}`);
