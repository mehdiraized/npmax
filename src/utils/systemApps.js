import { promisify } from "util";
import fs from "fs";
import os from "os";
import { join, basename } from "path";
import { exec as execCb } from "child_process";
import { findCatalogEntry } from "../data/appCatalog.js";

const exec = promisify(execCb);
const SHELL =
	process.platform === "win32" ? undefined : process.env.SHELL || "/bin/zsh";
const BASE_EXEC_OPTS = { shell: SHELL, timeout: 90000, maxBuffer: 1024 * 1024 * 8 };

const normalizeKey = (value) =>
	String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "");

const normalizeVersion = (value) =>
	String(value || "")
		.trim()
		.replace(/^v/i, "")
		.replace(/^[^0-9]*/, "");

const compareVersions = (left, right) => {
	const tokenize = (value) =>
		normalizeVersion(value)
			.split(/[^a-z0-9]+/i)
			.filter(Boolean)
			.map((part) => {
				const numeric = Number(part);
				return Number.isNaN(numeric) ? part.toLowerCase() : numeric;
			});

	const a = tokenize(left);
	const b = tokenize(right);
	const max = Math.max(a.length, b.length);
	for (let index = 0; index < max; index += 1) {
		const first = a[index];
		const second = b[index];
		if (first == null) return -1;
		if (second == null) return 1;
		if (first === second) continue;
		if (typeof first === "number" && typeof second === "number") {
			return first - second;
		}
		return String(first).localeCompare(String(second));
	}
	return 0;
};

const uniqueBy = (items, keyFn) => {
	const seen = new Map();
	for (const item of items) {
		const key = keyFn(item);
		if (!key) continue;
		const existing = seen.get(key);
		if (!existing) {
			seen.set(key, item);
			continue;
		}
		if ((item.version || "").length > (existing.version || "").length) {
			seen.set(key, item);
		}
	}
	return [...seen.values()];
};

const tryExec = async (command, options = {}) => {
	try {
		const { stdout } = await exec(command, { ...BASE_EXEC_OPTS, ...options });
		return stdout;
	} catch {
		return "";
	}
};

const parseTable = (raw) =>
	raw
		.split(/\r?\n/)
		.map((line) => line.trimEnd())
		.filter(Boolean)
		.filter((line) => !/^[-\s]+$/.test(line))
		.slice(2)
		.map((line) => line.split(/\s{2,}/).map((part) => part.trim()))
		.filter((parts) => parts.length >= 2);

const buildAppRecord = (data) => {
	const catalog = findCatalogEntry(data.name);
	return {
		id:
			data.id ||
			`${process.platform}:${normalizeKey(data.name)}:${normalizeKey(data.sourceId || data.path || data.source || "app")}`,
		name: data.name,
		version: data.version || null,
		platform: process.platform,
		path: data.path || null,
		publisher: data.publisher || null,
		source: data.source || "system",
		sourceId: data.sourceId || null,
		website: data.website || catalog?.website || null,
		installType: data.installType || "system",
		catalogId: catalog?.id || null,
		catalog,
		latestVersion: null,
		updateAvailable: false,
		updateSource: null,
		updateUrl: null,
		updateCommand: null,
		updateConfidence: "unknown",
		status: "unknown",
	};
};

const getMacApps = async () => {
	const raw = await tryExec("system_profiler SPApplicationsDataType -json");
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw);
		return uniqueBy(
			(parsed.SPApplicationsDataType || [])
				.filter((item) => item._name && item.obtained_from !== "apple")
				.map((item) =>
					buildAppRecord({
						name: item._name,
						version: item.version || null,
						path: item.path || null,
						publisher: item.obtained_from || null,
						source: item.obtained_from === "identified_developer" ? "system" : item.obtained_from || "system",
					}),
				),
			(item) => `${normalizeKey(item.name)}:${normalizeKey(item.path || "")}`,
		).sort((a, b) => a.name.localeCompare(b.name));
	} catch {
		return [];
	}
};

const getMacBrewState = async () => {
	const [installedRaw, outdatedRaw] = await Promise.all([
		tryExec("brew list --cask --versions"),
		tryExec("brew outdated --json=v2 --greedy"),
	]);

	const installed = new Map();
	for (const line of installedRaw.split(/\r?\n/).filter(Boolean)) {
		const [token, ...versions] = line.trim().split(/\s+/);
		if (!token || versions.length === 0) continue;
		installed.set(token, versions.join(","));
	}

	const outdated = new Map();
	try {
		const parsed = JSON.parse(outdatedRaw || "{}");
		for (const item of parsed.casks || []) {
			outdated.set(item.name, {
				installedVersion: item.installed_versions?.[0] || null,
				latestVersion: item.current_version || null,
			});
		}
	} catch {
		/* ignore */
	}

	return { installed, outdated };
};

const getWindowsApps = async () => {
	const registryScript = [
		"$paths = @(",
		"  'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',",
		"  'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',",
		"  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'",
		")",
		"Get-ItemProperty $paths -ErrorAction SilentlyContinue |",
		"Where-Object { $_.DisplayName -and $_.DisplayVersion } |",
		"Select-Object DisplayName, DisplayVersion, Publisher, InstallLocation | ConvertTo-Json -Depth 3",
	].join(" ");

	const raw = await tryExec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${registryScript}"`);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		const items = Array.isArray(parsed) ? parsed : [parsed];
		return uniqueBy(
			items.map((item) =>
				buildAppRecord({
					name: item.DisplayName,
					version: item.DisplayVersion,
					publisher: item.Publisher || null,
					path: item.InstallLocation || null,
					source: "registry",
				}),
			),
			(item) => `${normalizeKey(item.name)}:${normalizeKey(item.path || "")}`,
		).sort((a, b) => a.name.localeCompare(b.name));
	} catch {
		return [];
	}
};

const getWindowsWingetState = async () => {
	const [listRaw, upgradeRaw] = await Promise.all([
		tryExec("winget list --accept-source-agreements"),
		tryExec("winget upgrade --accept-source-agreements"),
	]);

	const installed = new Map();
	for (const parts of parseTable(listRaw)) {
		const [name, sourceId, version, available, source] = parts;
		installed.set(normalizeKey(name), {
			name,
			sourceId: sourceId || null,
			version: version || null,
			available: available || null,
			source: source || "winget",
		});
	}

	const upgrades = new Map();
	for (const parts of parseTable(upgradeRaw)) {
		const [name, sourceId, version, latestVersion, source] = parts;
		upgrades.set(normalizeKey(name), {
			name,
			sourceId: sourceId || null,
			version: version || null,
			latestVersion: latestVersion || null,
			source: source || "winget",
		});
	}

	return { installed, upgrades };
};

const parseFlatpakRows = (raw) =>
	raw
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => line.split("\t"));

const getLinuxApps = async () => {
	const [flatpakRaw, snapRaw] = await Promise.all([
		tryExec("flatpak list --app --columns=application,name,version,origin"),
		tryExec("snap list"),
	]);

	const apps = [];

	for (const [flatpakId, name, version, origin] of parseFlatpakRows(flatpakRaw)) {
		if (!name) continue;
		apps.push(
			buildAppRecord({
				name,
				version: version || null,
				source: "flatpak",
				sourceId: flatpakId || null,
				publisher: origin || null,
				installType: "package-manager",
			}),
		);
	}

	for (const parts of parseTable(snapRaw)) {
		const [name, version, rev, tracking, publisher] = parts;
		if (!name || name === "Name") continue;
		apps.push(
			buildAppRecord({
				name,
				version: version || null,
				source: "snap",
				sourceId: name,
				publisher: publisher || null,
				installType: "package-manager",
			}),
		);
	}

	const desktopRoots = [
		"/usr/share/applications",
		"/usr/local/share/applications",
		join(os.homedir(), ".local/share/applications"),
	];

	for (const root of desktopRoots) {
		let entries = [];
		try {
			entries = fs.readdirSync(root).filter((item) => item.endsWith(".desktop"));
		} catch {
			continue;
		}

		for (const file of entries) {
			try {
				const fullPath = join(root, file);
				const raw = fs.readFileSync(fullPath, "utf-8");
				const nameMatch = raw.match(/^Name=(.+)$/m);
				if (!nameMatch) continue;
				apps.push(
					buildAppRecord({
						name: nameMatch[1].trim(),
						path: fullPath,
						source: "desktop-entry",
						sourceId: basename(file, ".desktop"),
						installType: "system",
					}),
				);
			} catch {
				/* ignore malformed desktop entries */
			}
		}
	}

	return uniqueBy(apps, (item) => `${normalizeKey(item.name)}:${normalizeKey(item.sourceId || item.path || "")}`).sort(
		(a, b) => a.name.localeCompare(b.name),
	);
};

const getLinuxUpdateState = async () => {
	const [flatpakRaw, snapRaw] = await Promise.all([
		tryExec("flatpak remote-ls --updates --app --columns=application,name,version"),
		tryExec("snap refresh --list"),
	]);

	const flatpakUpdates = new Map();
	for (const [flatpakId, name, latestVersion] of parseFlatpakRows(flatpakRaw)) {
		if (!name) continue;
		flatpakUpdates.set(normalizeKey(name), {
			name,
			sourceId: flatpakId || null,
			latestVersion: latestVersion || null,
			source: "flatpak",
		});
	}

	const snapUpdates = new Map();
	for (const parts of parseTable(snapRaw)) {
		const [name, version] = parts;
		if (!name || name === "Name") continue;
		snapUpdates.set(normalizeKey(name), {
			name,
			latestVersion: version || null,
			source: "snap",
		});
	}

	return { flatpakUpdates, snapUpdates };
};

const enrichMacApps = async (apps) => {
	const brew = await getMacBrewState();
	return apps.map((app) => {
		const platformInfo = app.catalog?.platforms?.darwin || {};
		const token = platformInfo.brewCask;
		if (!token) return app;

		const brewInstalled = brew.installed.get(token);
		const brewOutdated = brew.outdated.get(token);
		if (brewInstalled) {
			app.source = "brew-cask";
			app.sourceId = token;
			app.installType = "package-manager";
		}
		if (brewOutdated?.latestVersion) {
			app.latestVersion = brewOutdated.latestVersion;
			app.updateAvailable = true;
			app.updateSource = "brew";
			app.updateConfidence = "verified";
			app.status = "outdated";
			app.updateCommand = `brew upgrade --cask ${token}`;
		}
		return app;
	});
};

const enrichWindowsApps = async (apps) => {
	const winget = await getWindowsWingetState();
	return apps.map((app) => {
		const normalized = normalizeKey(app.name);
		const platformInfo = app.catalog?.platforms?.win32 || {};
		const match =
			winget.upgrades.get(normalized) ||
			(platformInfo.wingetId
				? [...winget.upgrades.values()].find((item) => item.sourceId === platformInfo.wingetId)
				: null);
		const installed =
			winget.installed.get(normalized) ||
			(platformInfo.wingetId
				? [...winget.installed.values()].find((item) => item.sourceId === platformInfo.wingetId)
				: null);

		if (installed?.sourceId) {
			app.source = "winget";
			app.sourceId = installed.sourceId;
			app.installType = "package-manager";
		}
		if (match?.latestVersion) {
			app.latestVersion = match.latestVersion;
			app.updateAvailable = true;
			app.updateSource = "winget";
			app.updateConfidence = "verified";
			app.status = "outdated";
			app.updateCommand = `winget upgrade --id "${match.sourceId || app.name}"`;
		}
		return app;
	});
};

const enrichLinuxApps = async (apps) => {
	const updates = await getLinuxUpdateState();
	return apps.map((app) => {
		const normalized = normalizeKey(app.name);
		const platformInfo = app.catalog?.platforms?.linux || {};
		const flatpakMatch =
			updates.flatpakUpdates.get(normalized) ||
			(platformInfo.flatpakId
				? [...updates.flatpakUpdates.values()].find((item) => item.sourceId === platformInfo.flatpakId)
				: null);
		const snapMatch =
			updates.snapUpdates.get(normalized) ||
			(platformInfo.snapName
				? [...updates.snapUpdates.values()].find((item) => normalizeKey(item.name) === normalizeKey(platformInfo.snapName))
				: null);

		if (flatpakMatch?.latestVersion) {
			app.latestVersion = flatpakMatch.latestVersion;
			app.updateAvailable = true;
			app.updateSource = "flatpak";
			app.updateConfidence = "verified";
			app.status = "outdated";
			app.updateCommand = `flatpak update ${flatpakMatch.sourceId || ""}`.trim();
			return app;
		}

		if (snapMatch?.latestVersion) {
			app.latestVersion = snapMatch.latestVersion;
			app.updateAvailable = true;
			app.updateSource = "snap";
			app.updateConfidence = "verified";
			app.status = "outdated";
			app.updateCommand = `snap refresh ${platformInfo.snapName || app.sourceId || app.name}`;
		}

		return app;
	});
};

export const getInstalledAppsInventory = async () => {
	let apps = [];
	if (process.platform === "darwin") {
		apps = await getMacApps();
		apps = await enrichMacApps(apps);
	} else if (process.platform === "win32") {
		apps = await getWindowsApps();
		apps = await enrichWindowsApps(apps);
	} else {
		apps = await getLinuxApps();
		apps = await enrichLinuxApps(apps);
	}

	return apps.map((app) => {
		if (!app.status) app.status = app.updateAvailable ? "outdated" : "unknown";
		if (!app.updateAvailable && app.version) app.status = app.status === "unknown" ? "current" : app.status;
		return app;
	});
};

export const resolveVersionStatus = (installedVersion, latestVersion) => {
	if (!installedVersion || !latestVersion) return "unknown";
	const comparison = compareVersions(installedVersion, latestVersion);
	if (comparison < 0) return "outdated";
	if (comparison === 0) return "current";
	return "ahead";
};
