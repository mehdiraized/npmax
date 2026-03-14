import { promisify } from "util";
import fs from "fs";
import { join } from "path";
import { exec as execCb, execFileSync } from "child_process";
import { ipcRenderer } from "electron";
import { parsePodfile, parseSwiftManifest } from "./apple.js";
import { parseGradleManifest, parseVersionCatalog } from "./android.js";
import { parsePubspec } from "./flutter.js";
import { parseCargoToml, parseGemfile, parseGoMod } from "./polyglot.js";

// ─── Fix PATH for production builds ──────────────────────────────────────────
// Packaged Electron apps launched from Finder/Dock don't inherit the user's
// terminal PATH.  We first try to read the real PATH from the user's login
// shell; if that fails we fall back to a list of well-known directories.
(function fixProductionPath() {
	if (process.platform === "win32") {
		const appData = process.env.APPDATA || "";
		const pf = process.env["ProgramFiles"] || "C:\\Program Files";
		const extra = [join(appData, "npm"), join(pf, "nodejs")];
		const current = (process.env.PATH || "").split(";");
		process.env.PATH = [...new Set([...extra, ...current])].join(";");
		return;
	}

	// macOS / Linux — try the user's real shell first
	try {
		const shell = process.env.SHELL || "/bin/zsh";
		const marker = "__NPMAX_PATH__";
		const raw = execFileSync(
			shell,
			["-ilc", `printf "${marker}%s${marker}" "$PATH"`],
			{ timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
		const m = raw.match(new RegExp(`${marker}(.+?)${marker}`));
		if (m && m[1].includes("/")) {
			process.env.PATH = m[1];
			return;
		}
	} catch {
		/* fall through to manual list */
	}

	// Fallback: prepend well-known directories
	const home = process.env.HOME || "";
	const extra = [
		"/usr/local/bin",
		"/opt/homebrew/bin",
		"/opt/homebrew/sbin",
		"/opt/local/bin",
		"/usr/bin",
		"/bin",
		join(home, ".volta", "bin"),
		join(home, ".yarn", "bin"),
		join(home, ".cargo", "bin"),
		join(home, ".local", "bin"),
		join(home, ".fnm", "aliases", "default", "bin"),
	];

	// Detect NVM — find the newest installed Node version
	const nvmDir = process.env.NVM_DIR || join(home, ".nvm");
	try {
		const versionsDir = join(nvmDir, "versions", "node");
		const versions = fs
			.readdirSync(versionsDir)
			.filter((v) => v.startsWith("v"))
			.sort()
			.reverse();
		if (versions.length > 0) {
			extra.push(join(versionsDir, versions[0], "bin"));
		}
	} catch {
		/* nvm not installed */
	}

	const current = (process.env.PATH || "").split(":");
	process.env.PATH = [...new Set([...extra, ...current])].join(":");
})();

const exec = promisify(execCb);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const SEMVER_PREFIX_RE = /^(\^|~|>=|<=|>|<|=)\s*/;

const getSupportedVersionPrefix = (rawVersion) => {
	if (typeof rawVersion !== "string") return "";
	const match = rawVersion.trim().match(SEMVER_PREFIX_RE);
	return match ? match[0] : "";
};

const SHELL =
	process.platform === "win32" ? undefined : process.env.SHELL || "/bin/zsh";

const EXEC_OPTS = { timeout: 15000, shell: SHELL };

const findFileRecursive = (rootPath, targetName, depth = 4) => {
	if (depth < 0) return null;

	let entries = [];
	try {
		entries = fs.readdirSync(rootPath, { withFileTypes: true });
	} catch {
		return null;
	}

	for (const entry of entries) {
		if (entry.name.startsWith(".git") || entry.name === "node_modules") continue;
		const fullPath = join(rootPath, entry.name);
		if (entry.isFile() && entry.name === targetName) return fullPath;
		if (entry.isDirectory()) {
			const nested = findFileRecursive(fullPath, targetName, depth - 1);
			if (nested) return nested;
		}
	}

	return null;
};

/** Returns installed versions of supported package tools (false if not found). */
export const globalPackages = async () => {
	const [
		npm,
		yarn,
		pnpm,
		composer,
		swift,
		cocoapods,
		gradle,
		flutter,
		go,
		cargo,
		bundler,
	] =
		await Promise.allSettled([
		npmVersion(),
		yarnVersion(),
		pnpmVersion(),
		composerVersion(),
		swiftVersion(),
		cocoapodsVersion(),
		gradleVersion(),
		flutterVersion(),
		goVersion(),
		cargoVersion(),
		bundlerVersion(),
	]);
	return {
		npm: npm.status === "fulfilled" ? npm.value : false,
		yarn: yarn.status === "fulfilled" ? yarn.value : false,
		pnpm: pnpm.status === "fulfilled" ? pnpm.value : false,
		composer: composer.status === "fulfilled" ? composer.value : false,
		swift: swift.status === "fulfilled" ? swift.value : false,
		cocoapods: cocoapods.status === "fulfilled" ? cocoapods.value : false,
		gradle: gradle.status === "fulfilled" ? gradle.value : false,
		flutter: flutter.status === "fulfilled" ? flutter.value : false,
		go: go.status === "fulfilled" ? go.value : false,
		cargo: cargo.status === "fulfilled" ? cargo.value : false,
		bundler: bundler.status === "fulfilled" ? bundler.value : false,
	};
};

export const openDirectory = async () => ipcRenderer.invoke("show-open-dialog");

/** Read a project's composer.json and return the raw JSON string. */
export const getProjectComposerPackages = (projectPath) =>
	readFile(join(projectPath, "composer.json"), "utf-8");

/**
 * Write an updated version back into the project's composer.json.
 * Preserves the original version constraint prefix (^, ~, >=, etc.).
 * Returns the new version string, or null on failure.
 */
export const updateComposerPackageVersion = async (
	projectPath,
	packageName,
	latestVersion,
	isDev,
) => {
	const composerPath = join(projectPath, "composer.json");
	const raw = await readFile(composerPath, "utf-8");
	const composer = JSON.parse(raw);

	const section = isDev ? "require-dev" : "require";
	if (!composer[section]?.[packageName]) return null;

	const prefix = getSupportedVersionPrefix(composer[section][packageName]);
	const updated = prefix + latestVersion;
	composer[section][packageName] = updated;

	await writeFile(
		composerPath,
		JSON.stringify(composer, null, 4) + "\n",
		"utf-8",
	);
	return updated;
};

/**
 * Check composer.lock status for a project.
 * Returns: "ok" | "stale" | "missing"
 */
export const checkComposerLockFile = (projectPath) => {
	const composerPath = join(projectPath, "composer.json");
	const lockPath = join(projectPath, "composer.lock");

	try {
		fs.accessSync(lockPath);
	} catch {
		return "missing";
	}

	try {
		const composerMtime = fs.statSync(composerPath).mtimeMs;
		const lockMtime = fs.statSync(lockPath).mtimeMs;
		return composerMtime > lockMtime ? "stale" : "ok";
	} catch {
		return "missing";
	}
};

/**
 * Run `composer install` in the project directory.
 * Returns the stdout on success.
 */
export const runComposerInstall = async (projectPath) => {
	const { stdout } = await exec("composer install", {
		...EXEC_OPTS,
		cwd: projectPath,
		timeout: 120000,
	});
	return stdout;
};

/** Read a project's package.json and return the raw JSON string. */
export const getProjectPackages = (projectPath) =>
	readFile(join(projectPath, "package.json"), "utf-8");

/** Read a project's Package.swift and return the raw manifest string. */
export const getProjectSwiftPackages = (projectPath) =>
	readFile(join(projectPath, "Package.swift"), "utf-8");

/** Read a project's Podfile and return the raw manifest string. */
export const getProjectPodPackages = (projectPath) =>
	readFile(join(projectPath, "Podfile"), "utf-8");

export const getProjectFlutterManifest = (projectPath) =>
	readFile(join(projectPath, "pubspec.yaml"), "utf-8");

export const getProjectGoManifest = (projectPath) =>
	readFile(join(projectPath, "go.mod"), "utf-8");

export const getProjectCargoManifest = (projectPath) =>
	readFile(join(projectPath, "Cargo.toml"), "utf-8");

export const getProjectGemfile = (projectPath) =>
	readFile(join(projectPath, "Gemfile"), "utf-8");

const ANDROID_MANIFESTS = [
	join("gradle", "libs.versions.toml"),
	join("app", "build.gradle.kts"),
	join("app", "build.gradle"),
	"build.gradle.kts",
	"build.gradle",
];

export const findAndroidManifest = (projectPath) => {
	for (const relativePath of ANDROID_MANIFESTS) {
		const fullPath = join(projectPath, relativePath);
		try {
			fs.accessSync(fullPath);
			return fullPath;
		} catch {
			/* keep searching */
		}
	}

	const recursiveTargets = [
		"libs.versions.toml",
		"build.gradle.kts",
		"build.gradle",
	];
	for (const target of recursiveTargets) {
		const found = findFileRecursive(projectPath, target);
		if (found) return found;
	}

	return null;
};

export const getProjectAndroidManifest = async (projectPath) => {
	const manifestPath = findAndroidManifest(projectPath);
	if (!manifestPath) throw new Error("No Android manifest found");
	const raw = await readFile(manifestPath, "utf-8");
	const projectType = manifestPath.endsWith("libs.versions.toml")
		? "android-version-catalog"
		: "android-gradle";
	return { manifestPath, raw, projectType };
};

/**
 * Write an updated version back into the project's package.json.
 * Preserves the original semver prefix (^, ~, etc.).
 * Returns the new version string, or null on failure.
 */
export const updatePackageVersion = async (
	projectPath,
	packageName,
	latestVersion,
	isDev,
) => {
	const pkgPath = join(projectPath, "package.json");
	const raw = await readFile(pkgPath, "utf-8");
	const pkg = JSON.parse(raw);

	const section = isDev ? "devDependencies" : "dependencies";
	if (!pkg[section]?.[packageName]) return null;

	const prefix = getSupportedVersionPrefix(pkg[section][packageName]);
	const updated = prefix + latestVersion;
	pkg[section][packageName] = updated;

	await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
	return updated;
};

export const updateSwiftPackageVersion = async (
	projectPath,
	dependency,
	latestVersion,
) => {
	const manifestPath = join(projectPath, "Package.swift");
	const raw = await readFile(manifestPath, "utf-8");
	const parsed = parseSwiftManifest(raw);
	const target = parsed.dependencies.find((item) => item.id === dependency.id);

	if (!target?.versionStart && target?.versionStart !== 0) return null;

	const updatedRaw =
		raw.slice(0, target.versionStart) +
		latestVersion +
		raw.slice(target.versionEnd);

	await writeFile(manifestPath, updatedRaw, "utf-8");
	return latestVersion;
};

export const updatePodPackageVersion = async (
	projectPath,
	dependency,
	latestVersion,
) => {
	const podfilePath = join(projectPath, "Podfile");
	const raw = await readFile(podfilePath, "utf-8");
	const parsed = parsePodfile(raw);
	const target = parsed.dependencies.find((item) => item.id === dependency.id);

	if (!target) return null;

	let updatedRaw;
	if (target.versionStart == null) {
		updatedRaw =
			raw.slice(0, target.lineEnd) + `, '${latestVersion}'` + raw.slice(target.lineEnd);
	} else {
		updatedRaw =
			raw.slice(0, target.versionStart) +
			latestVersion +
			raw.slice(target.versionEnd);
	}

	await writeFile(podfilePath, updatedRaw, "utf-8");
	return latestVersion;
};

export const updateAndroidPackageVersion = async (
	manifestPath,
	projectType,
	dependency,
	latestVersion,
) => {
	const raw = await readFile(manifestPath, "utf-8");
	const parsed =
		projectType === "android-version-catalog"
			? parseVersionCatalog(raw)
			: parseGradleManifest(raw);
	const target = parsed.dependencies.find((item) => item.id === dependency.id);
	if (!target?.versionStart && target?.versionStart !== 0) return null;

	const updatedRaw =
		raw.slice(0, target.versionStart) +
		latestVersion +
		raw.slice(target.versionEnd);
	await writeFile(manifestPath, updatedRaw, "utf-8");
	return latestVersion;
};

export const updateFlutterPackageVersion = async (
	projectPath,
	dependency,
	latestVersion,
) => {
	const manifestPath = join(projectPath, "pubspec.yaml");
	const raw = await readFile(manifestPath, "utf-8");
	const parsed = parsePubspec(raw);
	const target = parsed.dependencies.find((item) => item.id === dependency.id);
	if (!target?.versionStart && target?.versionStart !== 0) return null;

	const updatedRaw =
		raw.slice(0, target.versionStart) +
		latestVersion +
		raw.slice(target.versionEnd);
	await writeFile(manifestPath, updatedRaw, "utf-8");
	return latestVersion;
};

export const updatePolyglotPackageVersion = async (
	projectPath,
	projectType,
	dependency,
	latestVersion,
) => {
	const fileMap = {
		go: "go.mod",
		rust: "Cargo.toml",
		ruby: "Gemfile",
	};
	const parserMap = {
		go: parseGoMod,
		rust: parseCargoToml,
		ruby: parseGemfile,
	};
	const manifestPath = join(projectPath, fileMap[projectType]);
	const raw = await readFile(manifestPath, "utf-8");
	const parsed = parserMap[projectType](raw);
	const target = parsed.dependencies.find((item) => item.id === dependency.id);
	if (!target?.versionStart && target?.versionStart !== 0) return null;

	const normalized = projectType === "go" ? latestVersion.replace(/^v?/, "") : latestVersion;
	const updatedRaw =
		raw.slice(0, target.versionStart) +
		normalized +
		raw.slice(target.versionEnd);
	await writeFile(manifestPath, updatedRaw, "utf-8");
	return projectType === "go" ? `v${normalized}` : normalized;
};

/**
 * Check lock file status for a project.
 * Returns: "ok" | "stale" | "missing"
 *  - "missing" – no lock file found
 *  - "stale"   – package.json is newer than the lock file
 *  - "ok"      – lock file is up-to-date
 */
export const checkLockFile = (projectPath) => {
	const pkgPath = join(projectPath, "package.json");
	const locks = [
		join(projectPath, "package-lock.json"),
		join(projectPath, "yarn.lock"),
		join(projectPath, "pnpm-lock.yaml"),
	];

	let lockPath = null;
	for (const l of locks) {
		try {
			fs.accessSync(l);
			lockPath = l;
			break;
		} catch {
			/* not found */
		}
	}

	if (!lockPath) return "missing";

	try {
		const pkgMtime = fs.statSync(pkgPath).mtimeMs;
		const lockMtime = fs.statSync(lockPath).mtimeMs;
		return pkgMtime > lockMtime ? "stale" : "ok";
	} catch {
		return "missing";
	}
};

export const checkSwiftResolvedFile = (projectPath) => {
	const manifestPath = join(projectPath, "Package.swift");
	const resolvedPath =
		findFileRecursive(projectPath, "Package.resolved") ||
		join(projectPath, "Package.resolved");

	try {
		fs.accessSync(resolvedPath);
	} catch {
		return "missing";
	}

	try {
		const manifestMtime = fs.statSync(manifestPath).mtimeMs;
		const resolvedMtime = fs.statSync(resolvedPath).mtimeMs;
		return manifestMtime > resolvedMtime ? "stale" : "ok";
	} catch {
		return "missing";
	}
};

export const checkPodLockFile = (projectPath) => {
	const podfilePath = join(projectPath, "Podfile");
	const lockPath = join(projectPath, "Podfile.lock");

	try {
		fs.accessSync(lockPath);
	} catch {
		return "missing";
	}

	try {
		const manifestMtime = fs.statSync(podfilePath).mtimeMs;
		const lockMtime = fs.statSync(lockPath).mtimeMs;
		return manifestMtime > lockMtime ? "stale" : "ok";
	} catch {
		return "missing";
	}
};

export const checkGradleLockFile = (projectPath, manifestPath) => {
	const lockPath =
		findFileRecursive(projectPath, "gradle.lockfile") ||
		findFileRecursive(projectPath, "libs.versions.toml.lockfile");
	if (!lockPath) return "missing";

	try {
		const manifestMtime = fs.statSync(manifestPath).mtimeMs;
		const lockMtime = fs.statSync(lockPath).mtimeMs;
		return manifestMtime > lockMtime ? "stale" : "ok";
	} catch {
		return "missing";
	}
};

export const checkFlutterLockFile = (projectPath) => {
	const manifestPath = join(projectPath, "pubspec.yaml");
	const lockPath = join(projectPath, "pubspec.lock");

	try {
		fs.accessSync(lockPath);
	} catch {
		return "missing";
	}

	try {
		const manifestMtime = fs.statSync(manifestPath).mtimeMs;
		const lockMtime = fs.statSync(lockPath).mtimeMs;
		return manifestMtime > lockMtime ? "stale" : "ok";
	} catch {
		return "missing";
	}
};

export const checkPolyglotLockFile = (projectPath, projectType) => {
	const config = {
		go: { manifest: "go.mod", lock: "go.sum" },
		rust: { manifest: "Cargo.toml", lock: "Cargo.lock" },
		ruby: { manifest: "Gemfile", lock: "Gemfile.lock" },
	}[projectType];
	if (!config) return "missing";

	const manifestPath = join(projectPath, config.manifest);
	const lockPath = join(projectPath, config.lock);
	try {
		fs.accessSync(lockPath);
	} catch {
		return "missing";
	}

	try {
		const manifestMtime = fs.statSync(manifestPath).mtimeMs;
		const lockMtime = fs.statSync(lockPath).mtimeMs;
		return manifestMtime > lockMtime ? "stale" : "ok";
	} catch {
		return "missing";
	}
};

/**
 * Run the appropriate install command (npm/yarn/pnpm) in the project directory.
 * Auto-detects the package manager from the lock file or falls back to npm.
 * Returns the stdout on success.
 */
export const runInstall = async (projectPath) => {
	let cmd = "npm install";
	try {
		fs.accessSync(join(projectPath, "yarn.lock"));
		cmd = "yarn install";
	} catch {
		try {
			fs.accessSync(join(projectPath, "pnpm-lock.yaml"));
			cmd = "pnpm install";
		} catch {
			/* default to npm */
		}
	}

	const { stdout } = await exec(cmd, {
		...EXEC_OPTS,
		cwd: projectPath,
		timeout: 120000,
	});
	return stdout;
};

export const runSwiftPackageResolve = async (projectPath) => {
	const { stdout } = await exec("swift package resolve", {
		...EXEC_OPTS,
		cwd: projectPath,
		timeout: 120000,
	});
	return stdout;
};

export const runPodInstall = async (projectPath) => {
	const { stdout } = await exec("pod install", {
		...EXEC_OPTS,
		cwd: projectPath,
		timeout: 120000,
	});
	return stdout;
};

export const runGradleSync = async (projectPath) => {
	const wrapper =
		process.platform === "win32"
			? join(projectPath, "gradlew.bat")
			: join(projectPath, "gradlew");
	const command = fs.existsSync(wrapper)
		? process.platform === "win32"
			? "gradlew.bat help"
			: "./gradlew help"
		: "gradle help";

	const { stdout } = await exec(command, {
		...EXEC_OPTS,
		cwd: projectPath,
		timeout: 120000,
	});
	return stdout;
};

export const runFlutterPubGet = async (projectPath) => {
	const { stdout } = await exec("flutter pub get", {
		...EXEC_OPTS,
		cwd: projectPath,
		timeout: 120000,
	});
	return stdout;
};

export const runPolyglotSync = async (projectPath, projectType) => {
	const command = {
		go: "go mod tidy",
		rust: "cargo check",
		ruby: "bundle install",
	}[projectType];
	if (!command) throw new Error(`Unsupported ecosystem ${projectType}`);

	const { stdout } = await exec(command, {
		...EXEC_OPTS,
		cwd: projectPath,
		timeout: 120000,
	});
	return stdout;
};

const npmVersion = async () => {
	try {
		const { stdout } = await exec("npm --version", EXEC_OPTS);
		return stdout.trim();
	} catch {
		return false;
	}
};

const yarnVersion = async () => {
	try {
		const { stdout } = await exec("yarn --version", EXEC_OPTS);
		return stdout.trim();
	} catch {
		return false;
	}
};

const pnpmVersion = async () => {
	try {
		const { stdout } = await exec("pnpm --version", EXEC_OPTS);
		return stdout.trim();
	} catch {
		return false;
	}
};

const composerVersion = async () => {
	try {
		const { stdout } = await exec("composer --version --no-ansi", EXEC_OPTS);
		const match = stdout.match(/(\d+\.\d+\.\d+)/);
		return match ? match[1] : stdout.trim();
	} catch {
		return false;
	}
};

const swiftVersion = async () => {
	try {
		const { stdout } = await exec("swift --version", EXEC_OPTS);
		const match = stdout.match(/Swift version\s+([^\s]+)/i);
		return match ? match[1] : stdout.trim();
	} catch {
		return false;
	}
};

const cocoapodsVersion = async () => {
	try {
		const { stdout } = await exec("pod --version", EXEC_OPTS);
		return stdout.trim();
	} catch {
		return false;
	}
};

const gradleVersion = async () => {
	try {
		const { stdout } = await exec("gradle --version", EXEC_OPTS);
		const match = stdout.match(/Gradle\s+(\d+\.\d+(?:\.\d+)?)/i);
		return match ? match[1] : stdout.trim();
	} catch {
		return false;
	}
};

const flutterVersion = async () => {
	try {
		const { stdout } = await exec("flutter --version", EXEC_OPTS);
		const match = stdout.match(/Flutter\s+([0-9.]+)/i);
		return match ? match[1] : stdout.trim().split("\n")[0];
	} catch {
		return false;
	}
};

const goVersion = async () => {
	try {
		const { stdout } = await exec("go version", EXEC_OPTS);
		const match = stdout.match(/go([0-9.]+)/i);
		return match ? match[1] : stdout.trim();
	} catch {
		return false;
	}
};

const cargoVersion = async () => {
	try {
		const { stdout } = await exec("cargo --version", EXEC_OPTS);
		const match = stdout.match(/cargo\s+([0-9.]+)/i);
		return match ? match[1] : stdout.trim();
	} catch {
		return false;
	}
};

const bundlerVersion = async () => {
	try {
		const { stdout } = await exec("bundle --version", EXEC_OPTS);
		const match = stdout.match(/Bundler version\s+([0-9.]+)/i);
		return match ? match[1] : stdout.trim();
	} catch {
		return false;
	}
};
