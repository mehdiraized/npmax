#!/usr/bin/env node
/**
 * Build the `latest.json` manifest that the Tauri updater plugin fetches from
 * the release's `latest/download/latest.json` endpoint.
 *
 *   node scripts/generate-latest-json.js <version> <artifacts-dir> [notes-file]
 *
 * Every updater artifact the bundler produces sits next to a detached `.sig`.
 * We walk the downloaded artifacts, pair each signature with its payload, and
 * map it onto the platform keys the plugin looks up. Anything unrecognised is
 * skipped rather than guessed at.
 */
const fs = require("node:fs");
const path = require("node:path");

const [version, artifactsDir, notesFile] = process.argv.slice(2);
if (!version || !artifactsDir) {
	console.error(
		"usage: generate-latest-json.js <version> <artifacts-dir> [notes-file]"
	);
	process.exit(1);
}

const REPO = "mehdiraized/npmax";

// The macOS build is universal, so one bundle serves both darwin keys.
const PLATFORMS = [
	[/\.app\.tar\.gz$/, ["darwin-aarch64", "darwin-x86_64"]],
	[/\.AppImage$/, ["linux-x86_64"]],
	[/-setup\.exe$/, ["windows-x86_64"]],
];

function* walk(dir) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) yield* walk(full);
		else yield full;
	}
}

const platforms = {};
for (const sigPath of walk(artifactsDir)) {
	if (!sigPath.endsWith(".sig")) continue;

	const payload = sigPath.slice(0, -".sig".length);
	if (!fs.existsSync(payload)) continue;

	const name = path.basename(payload);
	const match = PLATFORMS.find(([pattern]) => pattern.test(name));
	if (!match) continue;

	const entry = {
		signature: fs.readFileSync(sigPath, "utf8").trim(),
		url: `https://github.com/${REPO}/releases/download/v${version}/${name}`,
	};
	for (const key of match[1]) platforms[key] = entry;
}

if (Object.keys(platforms).length === 0) {
	console.error(
		`No updater artifacts (.sig pairs) found under ${artifactsDir}.\n` +
			"Check that bundle.createUpdaterArtifacts is true in tauri.conf.json."
	);
	process.exit(1);
}

const notes =
	notesFile && fs.existsSync(notesFile)
		? fs.readFileSync(notesFile, "utf8").trim()
		: `See the release notes for v${version}.`;

fs.writeFileSync(
	"latest.json",
	`${JSON.stringify(
		{ version, notes, pub_date: new Date().toISOString(), platforms },
		null,
		2
	)}\n`
);

console.log(`latest.json → ${Object.keys(platforms).sort().join(", ")}`);
