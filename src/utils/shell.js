import { promisify } from "util";
import fs from "fs";
import { join } from "path";
import { exec as execCb, execFileSync } from "child_process";
import { ipcRenderer } from "electron";

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

const SHELL =
	process.platform === "win32" ? undefined : process.env.SHELL || "/bin/zsh";

const EXEC_OPTS = { timeout: 15000, shell: SHELL };

/** Returns installed versions of npm, yarn, pnpm (false if not found). */
export const globalPackages = async () => {
	const [npm, yarn, pnpm] = await Promise.allSettled([
		npmVersion(),
		yarnVersion(),
		pnpmVersion(),
	]);
	return {
		npm: npm.status === "fulfilled" ? npm.value : false,
		yarn: yarn.status === "fulfilled" ? yarn.value : false,
		pnpm: pnpm.status === "fulfilled" ? pnpm.value : false,
	};
};

export const openDirectory = async () => ipcRenderer.invoke("show-open-dialog");

/** Read a project's package.json and return the raw JSON string. */
export const getProjectPackages = (projectPath) =>
	readFile(join(projectPath, "package.json"), "utf-8");

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

	const prefix = (pkg[section][packageName].match(/^[^\d]*/) ?? ["^"])[0];
	const updated = prefix + latestVersion;
	pkg[section][packageName] = updated;

	await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
	return updated;
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
