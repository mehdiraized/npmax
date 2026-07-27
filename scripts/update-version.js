#!/usr/bin/env node
"use strict";

const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const newVersion = process.argv[2];
const oldVersion = process.argv[3];
const VERSION_PATTERN =
	/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

if (!newVersion || !oldVersion) {
	console.error(
		"Usage: node scripts/update-version.js <new-version> <old-version>",
	);
	process.exit(1);
}

function assertValidVersion(version, label) {
	if (!VERSION_PATTERN.test(version)) {
		console.error(`Invalid ${label}: ${version}`);
		process.exit(1);
	}
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

assertValidVersion(newVersion, "new version");
assertValidVersion(oldVersion, "old version");

const ROOT = process.cwd();

async function bumpPackages() {
	if (newVersion === oldVersion) {
		console.log(`✓ package versions already at ${newVersion}`);
		return;
	}
	const bumpPath = path.join(ROOT, "scripts", "bump-version.js");
	const result = spawnSync(process.execPath, [bumpPath, newVersion], {
		stdio: "inherit",
		cwd: ROOT,
	});
	if (result.status !== 0) {
		process.exit(result.status || 1);
	}
}

function updateReadme() {
	const readmePath = path.join(ROOT, "README.md");
	if (!fs.existsSync(readmePath)) return;
	let content = fs.readFileSync(readmePath, "utf8");
	const escapedOldVersion = escapeRegExp(oldVersion);

	content = content.replace(
		/## Download npMax v[\d.]+/,
		`## Download npMax v${newVersion}`,
	);

	content = content.replace(
		new RegExp(`/releases/download/v${escapedOldVersion}/`, "g"),
		() => `/releases/download/v${newVersion}/`,
	);

	content = content.replace(
		new RegExp(`(npMax[_\\.-])${escapedOldVersion}`, "g"),
		(_, prefix) => `${prefix}${newVersion}`,
	);
	content = content.replace(
		new RegExp(`(npmax_)${escapedOldVersion}`, "g"),
		(_, prefix) => `${prefix}${newVersion}`,
	);

	fs.writeFileSync(readmePath, content);
	console.log("✓ README.md download links updated");
}

function updateChangelog() {
	const changelogPath = path.join(ROOT, "CHANGELOG.md");
	if (!fs.existsSync(changelogPath)) return;

	let lastTag;
	try {
		lastTag = execSync("git describe --tags --abbrev=0 2>/dev/null", {
			encoding: "utf8",
		}).trim();
	} catch {
		lastTag = null;
	}

	const range = lastTag ? `${lastTag}..HEAD` : "HEAD";
	let commits = [];
	try {
		commits = execSync(`git log ${range} --pretty=format:"%H|||%s|||%an"`, {
			encoding: "utf8",
		})
			.trim()
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				const [hash, subject, author] = line.split("|||");
				return { hash: hash.substring(0, 7), subject, author };
			})
			.filter((c) => !/^chore\(release\):/.test(c.subject));
	} catch {
		commits = [];
	}

	const groups = { feat: [], fix: [], other: [] };
	for (const c of commits) {
		if (/^feat(\(.+\))?!?:/.test(c.subject) || /!:/.test(c.subject)) {
			groups.feat.push(c);
		} else if (/^fix(\(.+\))?:/.test(c.subject)) {
			groups.fix.push(c);
		} else if (
			/^(docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?:/.test(
				c.subject,
			)
		) {
			groups.other.push(c);
		} else {
			groups.other.push(c);
		}
	}

	const today = new Date().toISOString().slice(0, 10);
	let entry = `## [${newVersion}] — ${today}\n\n`;

	if (groups.feat.length) {
		entry += "### Added\n";
		for (const c of groups.feat) {
			entry += `- ${c.subject.replace(/^feat(\(.+\))?!?:\s*/, "")}\n`;
		}
		entry += "\n";
	}
	if (groups.fix.length) {
		entry += "### Fixed\n";
		for (const c of groups.fix) {
			entry += `- ${c.subject.replace(/^fix(\(.+\))?:\s*/, "")}\n`;
		}
		entry += "\n";
	}
	if (groups.other.length) {
		entry += "### Changed\n";
		for (const c of groups.other.slice(0, 20)) {
			entry += `- ${c.subject}\n`;
		}
		entry += "\n";
	}
	if (!groups.feat.length && !groups.fix.length && !groups.other.length) {
		entry += "- Release packaging and documentation updates\n\n";
	}
	entry += "---\n\n";

	const existing = fs.readFileSync(changelogPath, "utf8");
	if (existing.includes(`## [${newVersion}]`)) {
		console.log(`✓ CHANGELOG.md already has [${newVersion}]`);
		return;
	}

	const updated = existing.replace(
		/^# Changelog\s*\n+/,
		`# Changelog\n\n${entry}`,
	);
	fs.writeFileSync(changelogPath, updated);
	console.log(`✓ CHANGELOG.md: added [${newVersion}]`);
}

(async () => {
	await bumpPackages();
	updateReadme();
	updateChangelog();
	console.log(`\nVersion update complete: ${oldVersion} → ${newVersion}`);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
