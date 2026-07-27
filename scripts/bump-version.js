#!/usr/bin/env node
/**
 * Bump version across the Tauri monorepo.
 * Usage: node scripts/bump-version.js 3.0.1
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
	console.error("Usage: node scripts/bump-version.js <semver>");
	process.exit(1);
}

const packageJsonFiles = [
	"package.json",
	"apps/desktop/package.json",
	"apps/web/package.json",
	"apps/mcp/package.json",
	"packages/types/package.json",
	"packages/core/package.json",
	"packages/api-client/package.json",
	"packages/ui/package.json",
	"packages/app-shell/package.json",
];

for (const rel of packageJsonFiles) {
	const full = path.join(root, rel);
	if (!fs.existsSync(full)) continue;
	const pkg = JSON.parse(fs.readFileSync(full, "utf8"));
	pkg.version = version;
	fs.writeFileSync(full, `${JSON.stringify(pkg, null, "\t")}\n`);
	console.log(`updated ${rel}`);
}

const tauriConf = path.join(root, "apps/desktop/src-tauri/tauri.conf.json");
const conf = JSON.parse(fs.readFileSync(tauriConf, "utf8"));
conf.version = version;
fs.writeFileSync(tauriConf, `${JSON.stringify(conf, null, "\t")}\n`);
console.log("updated apps/desktop/src-tauri/tauri.conf.json");

const cargoToml = path.join(root, "apps/desktop/src-tauri/Cargo.toml");
const cargo = fs
	.readFileSync(cargoToml, "utf8")
	.replace(/^version = "[^"]+"/m, `version = "${version}"`);
fs.writeFileSync(cargoToml, cargo);
console.log("updated apps/desktop/src-tauri/Cargo.toml");

const mcpIndex = path.join(root, "apps/mcp/src/index.ts");
if (fs.existsSync(mcpIndex)) {
	const src = fs
		.readFileSync(mcpIndex, "utf8")
		.replace(/version:\s*"[^"]+"/, `version: "${version}"`);
	fs.writeFileSync(mcpIndex, src);
	console.log("updated apps/mcp/src/index.ts");
}

console.log(`\nAll packages set to ${version}`);
