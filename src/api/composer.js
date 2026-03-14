import axios from "axios";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const cache = new Map(); // name → { data, ts }
const detailCache = new Map(); // name → { data, ts }

const client = axios.create({
	baseURL: "https://packagist.org/",
	timeout: 10000,
});

/**
 * Compare two Composer normalized version strings (e.g. "1.2.3.0").
 * Returns negative if a < b, positive if a > b, 0 if equal.
 */
function compareNormalized(a, b) {
	const ap = a.split(".").map(Number);
	const bp = b.split(".").map(Number);
	for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
		const diff = (ap[i] || 0) - (bp[i] || 0);
		if (diff !== 0) return diff;
	}
	return 0;
}

/**
 * Given the versions map from Packagist, return the latest stable version string.
 * Filters out dev, alpha, beta, RC releases.
 */
function resolveLatestStable(versions) {
	const stable = Object.entries(versions)
		.filter(([key]) => {
			const lower = key.toLowerCase();
			return (
				!lower.startsWith("dev-") &&
				!lower.endsWith("-dev") &&
				!lower.includes("alpha") &&
				!lower.includes("beta") &&
				!lower.includes("-rc") &&
				key !== "dev-master"
			);
		})
		.map(([, data]) => data)
		.sort((a, b) =>
			compareNormalized(
				a.version_normalized || "0.0.0.0",
				b.version_normalized || "0.0.0.0",
			),
		);

	return stable[stable.length - 1] ?? null;
}

function getStabilityLabel(version) {
	const lower = version.toLowerCase();
	if (lower.includes("dev")) return "dev";
	if (lower.includes("alpha")) return "alpha";
	if (lower.includes("beta")) return "beta";
	if (lower.includes("rc")) return "rc";
	return "stable";
}

function sortVersions(versions) {
	return [...versions].sort((a, b) => {
		const aTime = a.time ? new Date(a.time).getTime() : 0;
		const bTime = b.time ? new Date(b.time).getTime() : 0;
		if (aTime !== bTime) return bTime - aTime;
		return compareNormalized(
			b.version_normalized || "0.0.0.0",
			a.version_normalized || "0.0.0.0",
		);
	});
}

/**
 * Fetch the latest stable package info from Packagist with in-memory caching.
 * Returns { version, homepage, repository } or throws on failure.
 */
export const getComposerPackageInfo = async (packageName) => {
	const hit = cache.get(packageName);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const { data } = await client.get(
		`/packages/${encodeURIComponent(packageName)}.json`,
	);
	const latest = resolveLatestStable(data.package?.versions ?? {});
	if (!latest) throw new Error(`No stable version found for ${packageName}`);

	const result = {
		version: latest.version,
		homepage: latest.homepage || data.package?.repository || null,
		repository: data.package?.repository || null,
	};

	cache.set(packageName, { data: result, ts: Date.now() });
	return result;
};

export const getComposerPackageDetails = async (packageName) => {
	const hit = detailCache.get(packageName);
	if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;

	const { data } = await client.get(
		`/packages/${encodeURIComponent(packageName)}.json`,
	);
	const versionsMap = data.package?.versions ?? {};
	const latest = resolveLatestStable(versionsMap);
	if (!latest) throw new Error(`No stable version found for ${packageName}`);

	const versions = sortVersions(Object.values(versionsMap))
		.slice(0, 14)
		.map((version) => ({
			version: version.version,
			date: version.time || null,
			labels: [
				...(version.version === latest.version ? ["latest"] : []),
				getStabilityLabel(version.version),
			].filter(Boolean),
			isLatest: version.version === latest.version,
		}));

	const downloads = data.package?.downloads ?? null;
	const support = latest.support ?? {};
	const repositoryUrl = support.source || data.package?.repository || null;
	const phpConstraint = latest.require?.php || null;
	const detail = {
		ecosystem: "composer",
		name: data.package?.name || packageName,
		version: latest.version,
		description: latest.description || data.package?.description || "",
		badges: [
			latest.type || data.package?.type || "package",
			...(phpConstraint ? [`PHP ${phpConstraint}`] : []),
		],
		links: [
			...(latest.homepage
				? [{ label: "Homepage", type: "homepage", url: latest.homepage }]
				: []),
			...(repositoryUrl
				? [{ label: "Repository", type: "repository", url: repositoryUrl }]
				: []),
			...(support.issues
				? [{ label: "Issues", type: "issues", url: support.issues }]
				: []),
			{
				label: "Packagist",
				type: "registry",
				url: `https://packagist.org/packages/${packageName}`,
			},
		],
		stats: [
			{
				label: "License",
				value: Array.isArray(latest.license)
					? latest.license.join(", ")
					: latest.license || "Unknown",
			},
			{
				label: "Dependencies",
				value: String(
					Object.keys(latest.require ?? {}).filter((name) => name !== "php").length,
				),
			},
			{
				label: "Stars",
				value: String(data.package?.github_stars ?? 0),
				format: "number",
			},
			{
				label: "Published",
				value: latest.time || data.package?.time || "Unknown",
				format: "date",
			},
		],
		downloads: downloads
			? {
					label: "Monthly downloads",
					value: downloads.monthly,
					total: downloads.total,
					daily: downloads.daily,
					format: "number",
				}
			: null,
		compatibility: phpConstraint ? [{ label: "PHP", value: phpConstraint }] : [],
		versions,
		install: {
			label: "composer",
			lines: [`composer require ${packageName}`],
		},
		meta: {
			currentVersion: null,
			favers: data.package?.favers ?? 0,
			openIssues: data.package?.github_open_issues ?? 0,
			forks: data.package?.github_forks ?? 0,
		},
	};

	detailCache.set(packageName, { data: detail, ts: Date.now() });
	return detail;
};

/**
 * Fetch info for many Composer packages concurrently (default 6 at a time).
 * Calls onResult(name, data | null) as each response arrives.
 */
export const fetchComposerPackagesInfo = async (
	names,
	onResult,
	concurrency = 6,
) => {
	const queue = [...names];

	const worker = async () => {
		while (queue.length > 0) {
			const name = queue.shift();
			if (!name) break;
			try {
				const data = await getComposerPackageInfo(name);
				onResult(name, data);
			} catch {
				onResult(name, null);
			}
		}
	};

	await Promise.all(
		Array.from({ length: Math.min(concurrency, names.length) }, worker),
	);
};
