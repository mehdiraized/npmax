import axios from "axios";

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const cache = new Map(); // name → { data, ts }

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
