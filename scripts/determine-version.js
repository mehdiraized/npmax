#!/usr/bin/env node
"use strict";

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

function getLastTag() {
	try {
		return execSync("git describe --tags --abbrev=0 2>/dev/null", {
			encoding: "utf8",
		}).trim();
	} catch {
		return null;
	}
}

function getCommitsSince(tag) {
	const range = tag ? `${tag}..HEAD` : "HEAD";
	try {
		const out = execSync(`git log ${range} --pretty=format:"%s"`, {
			encoding: "utf8",
		}).trim();
		return out.split("\n").filter(Boolean);
	} catch {
		return [];
	}
}

function determineBumpType(commits) {
	let bumpType = null;
	for (const commit of commits) {
		if (/^chore\(release\):/.test(commit)) continue;
		if (/BREAKING CHANGE/.test(commit) || /^(\w+)(\(.+\))?!:/.test(commit)) {
			return "major";
		} else if (/^feat(\(.+\))?:/.test(commit)) {
			if (bumpType !== "major") bumpType = "minor";
		} else if (/^fix(\(.+\))?:/.test(commit)) {
			if (!bumpType) bumpType = "patch";
		}
	}
	return bumpType;
}

function bumpVersion(version, type) {
	const [major, minor, patch] = version.split(".").map(Number);
	switch (type) {
		case "major":
			return `${major + 1}.0.0`;
		case "minor":
			return `${major}.${minor + 1}.0`;
		case "patch":
			return `${major}.${minor}.${patch + 1}`;
		default:
			return version;
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

function tagExists(tag) {
	try {
		execSync(`git rev-parse -q --verify refs/tags/${tag}`, {
			stdio: "ignore",
		});
		return true;
	} catch {
		return false;
	}
}

function githubReleaseExists(tag) {
	const repo = process.env.GITHUB_REPOSITORY;
	const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
	if (!repo || !token) {
		return null;
	}

	return new Promise((resolve) => {
		const req = https.request(
			{
				hostname: "api.github.com",
				path: `/repos/${repo}/releases/tags/${encodeURIComponent(tag)}`,
				method: "GET",
				headers: {
					Accept: "application/vnd.github+json",
					Authorization: `Bearer ${token}`,
					"User-Agent": "npmax-determine-version",
					"X-GitHub-Api-Version": "2022-11-28",
				},
			},
			(res) => {
				res.resume();
				if (res.statusCode === 200) resolve(true);
				else if (res.statusCode === 404) resolve(false);
				else resolve(null);
			},
		);
		req.on("error", () => resolve(null));
		req.end();
	});
}

async function main() {
	const pkgPath = path.join(process.cwd(), "package.json");
	const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
	const lastTag = getLastTag();
	const commits = getCommitsSince(lastTag);
	const bumpType = determineBumpType(commits);
	const forceRelease = ["1", "true", "yes"].includes(
		String(process.env.FORCE_RELEASE || "").toLowerCase(),
	);

	let newVersion = pkg.version;
	let shouldRelease = false;
	let reason = "no conventional feat/fix/breaking commits since last tag";

	if (!tagExists(`v${pkg.version}`)) {
		// Package version already set but not tagged yet (e.g. first 3.0.0 publish).
		newVersion = pkg.version;
		shouldRelease = true;
		reason = "package version is not tagged yet";
	} else if (bumpType) {
		newVersion = bumpVersion(pkg.version, bumpType);
		shouldRelease = true;
		reason = `conventional commit bump (${bumpType})`;
	} else if (forceRelease) {
		newVersion = bumpVersion(pkg.version, "patch");
		shouldRelease = true;
		reason = "FORCE_RELEASE requested a patch bump";
	} else {
		const releaseExists = await githubReleaseExists(`v${pkg.version}`);
		if (releaseExists === false) {
			// Tag was created but Create GitHub Release never published (e.g. builds failed).
			newVersion = pkg.version;
			shouldRelease = true;
			reason = `git tag v${pkg.version} exists but GitHub Release is missing`;
		} else if (releaseExists === true) {
			reason = `GitHub Release v${pkg.version} already exists; chore-only commits do not bump`;
		}
	}

	console.log(`Last tag:        ${lastTag || "none"}`);
	console.log(`Commits found:   ${commits.length}`);
	console.log(`Bump type:       ${bumpType || "none"}`);
	console.log(`Force release:   ${forceRelease}`);
	console.log(`Current version: ${pkg.version}`);
	console.log(`New version:     ${newVersion}`);
	console.log(`Should release:  ${shouldRelease}`);
	console.log(`Reason:          ${reason}`);

	setOutput("new_version", newVersion);
	setOutput("old_version", pkg.version);
	setOutput("should_release", shouldRelease.toString());
	setOutput(
		"bump_type",
		bumpType || (forceRelease ? "patch" : shouldRelease ? "current" : "none"),
	);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
